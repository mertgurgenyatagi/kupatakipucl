// Which documents actually need writing.
//
// Both syncs used to `batch.set()` every document they computed, every run —
// all 144 fixtures and all 36 results — regardless of whether anything had
// changed. During a live window pollGate runs them every 2 minutes, so a
// single match evening wrote ~180 documents every 2 minutes, ~41,000 in a
// night, of which Firestore recorded 92% as UPDATE_NOOP: writes that changed
// nothing.
//
// That was the recurring cost that tripped the budget killswitch on
// 2026-09-09 (the first real matchday), taking billing — and with it every
// scheduled function — offline. The write bill was only part of it: each of
// those 36 results writes also fired functions/leaderboard's
// onDocumentWritten("results/{teamId}") trigger, so a quiet poll spawned 36
// leaderboard recomputes with nothing to recompute.
//
// Reading the collection first costs 180 reads where we used to spend 180
// writes, and reads are a third the price — but the real saving is that a
// quiet poll now writes nothing at all and wakes nothing downstream.

/**
 * Field-by-field equality for one plain Firestore document. Both sides are
 * flat objects of primitives (string/number/null) — no nested maps or arrays
 * in either the fixtures or the results shape — so a shallow compare is
 * exact here rather than an approximation.
 *
 * A key present on one side and absent on the other counts as a difference,
 * which is what backfills a field added after the fact: a fixture stored
 * before `stage` existed has `undefined` where the computed one has a real
 * value, so it gets rewritten once and then stops.
 */
function isSameDoc(stored, next) {
  if (stored === undefined || stored === null) return false;
  const keys = new Set([...Object.keys(stored), ...Object.keys(next)]);
  for (const key of keys) {
    if (stored[key] !== next[key]) return false;
  }
  return true;
}

/**
 * The subset of `nextById` that differs from `storedById` — same shape in,
 * same shape out, so callers just write what comes back. An id missing from
 * `storedById` is new and always included.
 *
 * Note this preserves the old unconditional-overwrite semantics exactly:
 * anything that drifted from what we compute (a hand-written correction from
 * the dev panel, say) still differs, so it still gets rewritten on the next
 * sync. The only writes dropped are the ones that would have been no-ops.
 */
function pickChangedDocs(storedById, nextById) {
  const changed = {};
  Object.entries(nextById).forEach(([id, fields]) => {
    if (!isSameDoc(storedById[id], fields)) changed[id] = fields;
  });
  return changed;
}

module.exports = { isSameDoc, pickChangedDocs };
