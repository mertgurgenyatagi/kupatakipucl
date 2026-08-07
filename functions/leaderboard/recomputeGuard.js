// Pure decision logic for the leaderboard recompute's concurrency control,
// kept out of index.js so it can be unit-tested exhaustively in the normal
// suite (scaling-250 design spec, 2026-08-07, §2). The interleavings these two
// predicates guard against are the hardest thing in that design to provoke on
// demand against a real or emulated Firestore, so testing the decision rather
// than the timing is the only honest coverage available — same reasoning as
// selectNearbyWindow (2026-08-03).
//
// CommonJS on purpose: index.js is plain JS run by Cloud Functions, and
// functions/ is outside tsconfig.json's include.

/** How long a recompute request waits before deciding whether it is newest. */
const DEBOUNCE_MS = 2000;

/** Past this age, a request recomputes even without holding the newest token. */
const MAX_STALENESS_MS = 30000;

/**
 * Safety margin when comparing an Eventarc event time against this function's
 * own `Date.now()`. Prefers a redundant recompute over a missed one.
 */
const COVERED_SKEW_MS = 250;

const num = (value) => (typeof value === "number" ? value : 0);

/**
 * Has a *finished* recompute already incorporated the write that fired this
 * trigger? If so there is nothing left to do — stand down without even
 * stamping the control doc.
 *
 * This is what makes coalescing work independently of whether triggers happen
 * to overlap in time, and it was added because the emulator proved the debounce
 * alone is not enough. The functions emulator runs Firestore triggers strictly
 * one at a time, so a 36-document batch produced 36 sequential triggers, each
 * of which found itself holding the newest token and did a full recompute:
 * 36 changed documents, 36 recomputes, zero collapse.
 *
 * Cloud Run would very likely have overlapped them (containerConcurrency 80,
 * and the debounce sleep is a timer rather than blocking work) — but "very
 * likely" is not a guarantee, and a coalescing scheme that silently degrades to
 * no coalescing under an unlucky concurrency model is not one to ship. With this
 * guard, the first trigger recomputes and every sibling from the same batch
 * observes that its own change is already covered, whatever the concurrency.
 *
 * The comparison is against `lastComputeReadStartedAt`, not `computedAt`: what
 * matters is when the compute *read* the data, since only a read that began
 * after this write committed can be guaranteed to have seen it.
 */
function shouldSkipAlreadyCovered(control, eventTimeMs) {
  if (!control) return false;
  if (typeof eventTimeMs !== "number") return false;
  const lastRead = num(control.lastComputeReadStartedAt);
  if (lastRead === 0) return false;
  return lastRead > eventTimeMs + COVERED_SKEW_MS;
}

/**
 * After sleeping DEBOUNCE_MS, should this invocation actually do the recompute?
 *
 * Normally only the newest request proceeds — that is what turns a 36-document
 * `results` batch into a single recompute instead of 5-15 concurrent ones.
 *
 * The ceiling is the deliberate exception. Under a *sustained* write stream no
 * request ever becomes the newest at its own wake-up, so a pure "newest wins"
 * rule would starve and the leaderboard would stop updating for the duration of
 * the load. Breaching the ceiling trades mutual exclusion for bounded
 * staleness — which is only safe because shouldCommitRecompute below keeps
 * stored results monotonic regardless.
 */
function shouldProceedAfterDebounce(control, myToken, now) {
  if (!control) return true;
  if (control.requestToken === myToken) return true;
  // Never computed at all is maximally stale, stated explicitly rather than
  // left to fall out of `now - 0` being enormous with real epoch timestamps.
  // That happened to give the right answer, but it made the behaviour a
  // property of the clock's magnitude instead of a decision.
  if (typeof control.computedAt !== "number") return true;
  return now - control.computedAt >= MAX_STALENESS_MS;
}

/**
 * Having computed a result from a read that began at `readStartedAt`, is it safe
 * to store it?
 *
 * Guard (a) — inputs changed after this read began, so a newer request is
 *   already in flight with fresher data. Abort instead of storing known-stale
 *   data; by induction the newest request always completes.
 *
 * Guard (b) — a compute based on a *fresher* read has already landed, so this
 *   one is stale by definition. This is the load-bearing correctness property
 *   of the whole design: it makes stored results monotonic in read freshness
 *   under any interleaving, including the ceiling path above. Guard (a) alone
 *   is only sufficient while the debounce provides mutual exclusion, and the
 *   ceiling exists precisely to break that.
 */
function shouldCommitRecompute(control, readStartedAt) {
  if (!control) return true;
  if (num(control.requestedAt) > readStartedAt) return false;
  if (num(control.lastComputeReadStartedAt) > readStartedAt) return false;
  return true;
}

module.exports = {
  DEBOUNCE_MS,
  MAX_STALENESS_MS,
  COVERED_SKEW_MS,
  shouldSkipAlreadyCovered,
  shouldProceedAfterDebounce,
  shouldCommitRecompute,
};
