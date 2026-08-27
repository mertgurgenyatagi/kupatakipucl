// Four real phases, replacing the old date-driven "pre"/"post" split now
// that the pagemap distinguishes league phase / pre-knockout / knockout —
// see onboarding/pagemap-questionnaires/pagemap-round-01.md, Q1. Driven
// entirely by a manually-set production value (tournament/useTournamentPhase.ts
// reads it from Firestore), not a calendar cutoff — the real transition
// dates aren't something the app can compute on its own.
export type TournamentPhase = "notstarted" | "leaguephase" | "preknockout" | "knockout";

export const STARTED_PHASES: readonly TournamentPhase[] = ["leaguephase", "preknockout", "knockout"];

// The phases in which a knockout bracket is a real thing to fill in. The
// Round of 16 does not exist until the league phase finishes, so offering
// the bracket earlier means offering invented pairings.
export const KNOCKOUT_PHASES: readonly TournamentPhase[] = ["preknockout", "knockout"];
