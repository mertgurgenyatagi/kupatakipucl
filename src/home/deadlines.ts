// League phase starts (and sign-up closes, and the league prediction locks)
// Sept 8 2026, Europe/Istanbul, fixed UTC+3 — see SPEC.md's hard-dates table
// and PAGEMAP_SPEC §2/§5b. One shared constant: every countdown on the site
// (logged-out and logged-in Home alike) races toward this same instant.
export const TOURNAMENT_START_ISO = "2026-09-08T00:00:00+03:00";

// 2026-09-08 decision: chasing stragglers to submit a first-ever prediction
// after the hard lock got old, so first-time sign-up and first-time
// prediction submission both reopen for exactly 3 days into the league
// phase — editing an *existing* prediction stays locked throughout (that
// gate is `predictionLocked` in ProfilePage.tsx, untouched by this). Fixed
// 3 days after TOURNAMENT_START_ISO, not from whenever this ships or from
// the actual (slightly later) manual phase flip — same "one hardcoded ISO
// constant" convention as that value, no new Firestore state needed.
export const PREDICTION_GRACE_END_ISO = "2026-09-11T00:00:00+03:00";

/** True until the grace window above closes. `now` is injectable for tests;
 *  real callers always use the default (actual wall clock). */
export function isGracePeriodOpen(now: Date = new Date()): boolean {
  return now.getTime() < new Date(PREDICTION_GRACE_END_ISO).getTime();
}

// Knockout prediction submission deadline — when the knockout-round
// prediction window closes and picks lock. PLACEHOLDER: 2027-02-11 is
// approximately when UCL knockout play begins (based on the real 2026/27
// calendar); swap for the real date once it's confirmed.
export const KNOCKOUT_PREDICTION_DEADLINE_ISO = "2027-03-09T00:00:00+03:00";
