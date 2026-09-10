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

/** True if this invocation should disable billing, given the incoming
 *  notification, the project's current billing state, and the cost this
 *  function last actually acted on (null if it has never acted). */
function shouldDisableBilling({ costAmount, budgetAmount, billingEnabled, lastActionedCost }) {
  if (costAmount <= budgetAmount) return false;
  if (!billingEnabled) return false;
  if (lastActionedCost == null) return true;
  return costAmount !== lastActionedCost;
}

module.exports = { shouldDisableBilling };
