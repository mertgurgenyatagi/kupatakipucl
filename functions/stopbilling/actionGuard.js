// Pure decision logic for "should this invocation actually disable billing" —
// kept out of index.js so it's unit-testable without mocking the Billing or
// Firestore clients, same reasoning as functions/fixtures/pollGate.js and
// functions/leaderboard/recomputeGuard.js.
//
// Added 2026-09-10. Google resends an over-budget Pub/Sub notification
// multiple times a day for as long as month-to-date cost stays over budget —
// not only when something new happens (confirmed against Google's own budget
// notification docs). Once a calendar month's cost has crossed the budget,
// that fact does not go away until the month rolls over, so without this
// check, re-enabling billing to deploy a fix gets caught by the very next
// notification and disabled again within 15-40 minutes regardless of whether
// anything is actually still spending. This happened four times on
// 2026-09-09 (PROJECT.md §1). The old index.js had no memory of its own at
// all — every invocation asked fresh "is cost over budget right now," with
// no way to tell a stale echo of an old overage apart from genuine new
// spend.
//
// The fix: only act on cost that's new since the last time this function
// actually disabled billing. `lastActionedCost` is persisted in Firestore
// (stopbilling/state) and compared against the incoming costAmount:
//  - no prior action recorded → nothing to compare against, act if over
//    budget (the original, first-ever-trip behaviour).
//  - incoming cost is LOWER than lastActionedCost → month-to-date cost can
//    only go down when the calendar rolls over into a new billing period,
//    so this is a fresh period. Treat it as new and act if it's over budget.
//  - incoming cost is HIGHER than lastActionedCost → genuine new spend
//    happened since the last action. Act again.
//  - incoming cost is equal (or Google re-reports the same stale total) →
//    nothing new happened. Stand down.
//
// Second guard added 2026-09-10, same day, after the above still let outage
// #6 through: Pub/Sub gives no ordering guarantee, and while draining a
// backlog from an earlier outage, a message can carry a budgetAmount that
// was already superseded by the time it arrives — e.g. a stale "budget: 1"
// notification generated before Mert raised the budget to 2, delivered
// *after* a fresh "budget: 2" notification had already come through
// (observed directly, 2026-09-10 13:13:07, 0.35s apart). The cost-based
// checks above have no way to recognise that; they only reason about
// whether cost moved, never whether the budget figure itself is trustworthy.
// `highestKnownBudget` (also persisted in stopbilling/state) tracks the
// highest budgetAmount ever seen in a real message. A message reporting a
// lower budget than that is definitionally stale — real budget amounts
// don't spontaneously drop — and is ignored outright, regardless of cost.

/** True if this invocation should disable billing, given the incoming
 *  notification, the project's current billing state, the cost this
 *  function last actually acted on (null if it has never acted), and the
 *  highest budgetAmount ever seen in a real message (null if none yet). */
function shouldDisableBilling({
  costAmount,
  budgetAmount,
  billingEnabled,
  lastActionedCost,
  highestKnownBudget,
}) {
  if (highestKnownBudget != null && budgetAmount < highestKnownBudget) return false;
  if (costAmount <= budgetAmount) return false;
  if (!billingEnabled) return false;
  if (lastActionedCost == null) return true;
  return costAmount !== lastActionedCost;
}

module.exports = { shouldDisableBilling };
