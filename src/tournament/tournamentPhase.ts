// Turkey (Europe/Istanbul) has used a fixed UTC+3 offset with no DST since 2016,
// so the cutoff can be a static UTC instant rather than needing a timezone library.
const TOURNAMENT_START_UTC = new Date("2026-09-07T21:00:00Z"); // Sept 8, 2026 00:00 Istanbul

export type TournamentPhase = "pre" | "post";

export function getTournamentPhase(now: Date): TournamentPhase {
  return now.getTime() >= TOURNAMENT_START_UTC.getTime() ? "post" : "pre";
}
