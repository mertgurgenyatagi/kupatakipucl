// League phase starts (and sign-up closes, and the league prediction locks)
// Sept 8 2026, Europe/Istanbul, fixed UTC+3 — see SPEC.md's hard-dates table
// and PAGEMAP_SPEC §2/§5b. One shared constant: every countdown on the site
// (logged-out and logged-in Home alike) races toward this same instant.
export const TOURNAMENT_START_ISO = "2026-09-08T00:00:00+03:00";

// Knockout prediction submission deadline — when the knockout-round
// prediction window closes and picks lock. PLACEHOLDER: 2027-02-11 is
// approximately when UCL knockout play begins (based on the real 2026/27
// calendar); swap for the real date once it's confirmed.
export const KNOCKOUT_PREDICTION_DEADLINE_ISO = "2027-02-11T00:00:00+03:00";
