import { RealFixture } from "./realFixtureTypes";
import { isFixtureLive } from "./liveFixtures";

/** football-data.org's stage string for the 36-team single table. The
 *  knockout rounds arrive through the same `fixtures` collection, so
 *  anything that means "the league phase" has to say so explicitly — this is
 *  the client-side twin of functions/fixtures/footballData.js's own
 *  constant, kept in sync by hand like the rest of that boundary. */
export const LEAGUE_STAGE = "LEAGUE_STAGE";

/** A league-phase fixture, narrowed so `matchday` is a real number. */
export type LeagueFixture = RealFixture & { matchday: number };

/**
 * The league phase only. Used wherever a calculation is about the 36-team
 * table and would be corrupted by knockout results — the standings replay in
 * rankHistory.ts, and the "N. Hafta" tabs below.
 *
 * A fixture synced before `stage` existed carries no value for it; it's
 * treated as league-phase, since every fixture written before that field was
 * added necessarily was one.
 */
export function isLeagueStage(fixture: RealFixture): boolean {
  return fixture.stage == null || fixture.stage === LEAGUE_STAGE;
}

export function getLeagueFixtures(fixtures: RealFixture[]): LeagueFixture[] {
  return fixtures.filter((f): f is LeagueFixture => isLeagueStage(f) && typeof f.matchday === "number");
}

const KNOCKOUT_STAGE_LABELS: Record<string, string> = {
  PLAYOFFS: "Play-Off",
  LAST_16: "Son 16",
  QUARTER_FINALS: "Çeyrek Final",
  SEMI_FINALS: "Yarı Final",
  FINAL: "Final",
};

export interface StageTab {
  /** Stable identity for the selected tab — "md-3", "QUARTER_FINALS". */
  key: string;
  label: string;
  fixtures: RealFixture[];
}

/**
 * One tab per matchday of the league phase, then one per knockout round.
 *
 * Built entirely from the fixtures on hand rather than a hardcoded list, so
 * the knockout tabs appear by themselves on the day football-data.org
 * publishes each draw, and a round nobody anticipated still gets a tab
 * (labelled with its raw stage string) instead of vanishing.
 *
 * Tabs are ordered by their earliest fixture's `order`, which is true
 * chronological order across the whole competition — no separate stage
 * ranking to keep correct.
 */
export function buildStageTabs(fixtures: RealFixture[]): StageTab[] {
  const byKey = new Map<string, StageTab>();

  fixtures.forEach((fixture) => {
    const isLeague = isLeagueStage(fixture);
    const key = isLeague ? `md-${fixture.matchday}` : fixture.stage!;
    const label = isLeague
      ? `${fixture.matchday}. Hafta`
      : (KNOCKOUT_STAGE_LABELS[fixture.stage!] ?? fixture.stage!);

    const existing = byKey.get(key);
    if (existing) existing.fixtures.push(fixture);
    else byKey.set(key, { key, label, fixtures: [fixture] });
  });

  const tabs = [...byKey.values()];
  tabs.forEach((tab) => tab.fixtures.sort((a, b) => a.order - b.order));
  return tabs.sort((a, b) => a.fixtures[0].order - b.fixtures[0].order);
}

/**
 * Which tab to land on. A live match wins outright — that is what someone
 * opening the page mid-evening came for. Otherwise the earliest round with
 * anything left to play, which through most of the season is the round about
 * to happen. Once the whole competition is finished, the final.
 */
export function defaultStageKey(tabs: StageTab[]): string | null {
  if (tabs.length === 0) return null;
  const live = tabs.find((tab) => tab.fixtures.some(isFixtureLive));
  if (live) return live.key;
  const unfinished = tabs.find((tab) => tab.fixtures.some((f) => f.status !== "FINISHED"));
  return (unfinished ?? tabs[tabs.length - 1]).key;
}

/**
 * Rows within a tab, split under date headers. A single matchday is played
 * across two or three calendar days, which is how everyone actually reads a
 * fixture list. Keyed on the Istanbul calendar date rather than UTC, since
 * a 22:00 local kickoff is 19:00 UTC the same day but a 00:00 one would not
 * be — every date the app renders is Istanbul's (FixtureRow does the same).
 */
const DAY_KEY_FMT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/Istanbul",
});
const DAY_LABEL_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  weekday: "long",
  timeZone: "Europe/Istanbul",
});

export interface FixtureDay {
  key: string;
  label: string;
  fixtures: RealFixture[];
}

export function groupFixturesByDay(fixtures: RealFixture[]): FixtureDay[] {
  const byDay = new Map<string, FixtureDay>();

  fixtures.forEach((fixture) => {
    const kickoff = new Date(fixture.kickoffUtc);
    const key = DAY_KEY_FMT.format(kickoff);
    const existing = byDay.get(key);
    if (existing) existing.fixtures.push(fixture);
    else byDay.set(key, { key, label: DAY_LABEL_FMT.format(kickoff), fixtures: [fixture] });
  });

  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
}
