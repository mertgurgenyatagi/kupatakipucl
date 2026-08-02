# Matchup Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Matchup Popup — a new `MatchupPopup` component that fills in the two existing "reserved for a future match-detail view" no-op click handlers (`FixtureRow.tsx`'s row click, `TeamPopup.tsx`'s `MatchRow` row click) with a real popup showing fixture info, each team's real rank/points, and who predicted them — wired into every page that can actually reach either trigger.

**Architecture:** One new presentational component (`src/leaderboard/MatchupPopup.tsx`), built on the same `Dialog`+`Frame` recipe as `TeamPopup`/`ParticipantPopup`, fed by props only (no internal Firestore fetching beyond the same `useDevMatches()` hook `TeamPopup` already uses). A new `onSelectFixture` callback threads down through `FixtureRow` → `UpcomingMatchesDrawer`/`UpcomingMatchesPreview`/`LeaderboardHero`, and through `TeamPopup`'s `MatchRow`, up to three parent pages that each gain a `selectedFixtureId` state slot and render `<MatchupPopup>`.

**Tech Stack:** React 18 + TypeScript, Vitest + `@testing-library/react`, existing shadcn-derived `Dialog`/`Frame`/`Avatar`/`Button` primitives, Tailwind CSS v4.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-08-02-matchup-popup-design.md` — every task below implements a specific section of it. Read it first if anything here seems to lack motivation.
- Mobile: no responsive treatment anywhere in this feature — desktop-only, per explicit instruction.
- No new abstractions beyond what's specified — e.g. predictor-list rendering is a small local component inside `MatchupPopup.tsx`, not extracted into a shared file, matching how `TeamPopup.tsx`'s own `MatchRow`/`StatList` are local, unexported helpers.
- Every modified file that has an existing `.test.tsx` must have its tests updated in the same task as the code change — never left for a later task.
- Verification bar before the branch is considered done: `npx tsc -b` clean, full `npx vitest run` suite green.
- Turkish UI copy only, matching the app's existing language throughout (no English strings).

---

### Task 1: `FixtureRow.tsx` — fill in the row-click no-op

**Files:**
- Modify: `src/leaderboard/FixtureRow.tsx`
- Test: `src/leaderboard/FixtureRow.test.tsx`

**Interfaces:**
- Produces: `FixtureRow`'s new optional prop `onSelectFixture?: (fixtureId: string) => void`, fired when the row itself (not a team crest/name) is clicked, with `fixture.id`.

- [ ] **Step 1: Write the failing tests**

Replace the existing "the row itself is clickable but has no observable click side effect" test (currently lines 41-45) with these two, in the same place in the file:

```tsx
  it("clicking the row fires onSelectFixture with the fixture's id", () => {
    const onSelectFixture = vi.fn();
    render(<FixtureRow fixture={fixture} results={{}} onSelectFixture={onSelectFixture} />);
    const [rowButton] = screen.getAllByRole("button");
    fireEvent.click(rowButton);
    expect(onSelectFixture).toHaveBeenCalledWith("m1");
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the row is clicked and no onSelectFixture is provided", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    const [rowButton] = screen.getAllByRole("button");
    expect(() => fireEvent.click(rowButton)).not.toThrow();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/leaderboard/FixtureRow.test.tsx`
Expected: FAIL — `onSelectFixture` is never called (the row's click handler is currently a no-op).

- [ ] **Step 3: Implement**

In `src/leaderboard/FixtureRow.tsx`, delete the module-level functions and their comment (current lines 31-39):

```tsx
/** Clickable, but intentionally does nothing yet — Mert's own spec: "clickable
 *  but does nothing." Reserved for a future match-detail view. */
function handleMatchClick() {}
function handleMatchKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleMatchClick();
  }
}
```

Replace the `export function FixtureRow({...})` signature and body opening with:

```tsx
export function FixtureRow({
  fixture,
  results,
  compact = false,
  onSelectTeam,
  onSelectFixture,
}: {
  fixture: Fixture;
  results: Record<string, TeamResult>;
  /** Home's UpcomingMatchesPreview lays crest+code side by side instead of
   *  stacked (narrower per row), everything else full-sized same as the
   *  drawer's own rows. The drawer itself keeps its default layout. */
  compact?: boolean;
  /** Fires with a team's id when its crest/name is clicked — opens
   *  TeamPopup. Undefined for the drawer (unchanged, still just stops
   *  propagation with no further effect). */
  onSelectTeam?: (teamId: string) => void;
  /** Fires with the fixture's id when the row itself (not a team) is
   *  clicked — opens MatchupPopup.tsx. */
  onSelectFixture?: (fixtureId: string) => void;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);

  function handleMatchClick() {
    onSelectFixture?.(fixture.id);
  }
  function handleMatchKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMatchClick();
    }
  }
```

(The rest of the function body — the returned JSX — is unchanged; `onClick={handleMatchClick}`/`onKeyDown={handleMatchKeyDown}` on the row `<div role="button">` now reference these component-scoped closures instead of the old module-level no-ops.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/leaderboard/FixtureRow.test.tsx`
Expected: PASS, all tests including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/FixtureRow.tsx src/leaderboard/FixtureRow.test.tsx
git commit -m "Fill in FixtureRow's reserved row-click handler with onSelectFixture"
```

---

### Task 2: `UpcomingMatchesDrawer.tsx` — thread `onSelectFixture` through

**Files:**
- Modify: `src/leaderboard/UpcomingMatchesDrawer.tsx`
- Test: `src/leaderboard/UpcomingMatchesDrawer.test.tsx`

**Interfaces:**
- Consumes: `FixtureRow`'s `onSelectFixture` prop (Task 1).
- Produces: `UpcomingMatchesDrawer`'s new optional prop `onSelectFixture?: (fixtureId: string) => void`.

- [ ] **Step 1: Write the failing test**

Add to `src/leaderboard/UpcomingMatchesDrawer.test.tsx`, inside the existing `describe` block:

```tsx
  it("clicking a fixture row fires onSelectFixture with that fixture's id", () => {
    const onSelectFixture = vi.fn();
    render(<UpcomingMatchesDrawer results={{}} onSelectFixture={onSelectFixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const [, firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/UpcomingMatchesDrawer.test.tsx`
Expected: FAIL — `onSelectFixture` never called (drawer doesn't accept or forward the prop yet).

- [ ] **Step 3: Implement**

In `src/leaderboard/UpcomingMatchesDrawer.tsx`, update the function signature:

```tsx
export function UpcomingMatchesDrawer({
  results,
  onSelectFixture,
}: {
  results: Record<string, TeamResult>;
  onSelectFixture?: (fixtureId: string) => void;
}) {
```

And update the `FixtureRow` call:

```tsx
          {shown.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} results={results} onSelectFixture={onSelectFixture} />
          ))}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/UpcomingMatchesDrawer.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/UpcomingMatchesDrawer.tsx src/leaderboard/UpcomingMatchesDrawer.test.tsx
git commit -m "Thread onSelectFixture through UpcomingMatchesDrawer"
```

---

### Task 3: `UpcomingMatchesPreview.tsx` — thread `onSelectFixture` through

**Files:**
- Modify: `src/leaderboard/UpcomingMatchesPreview.tsx`
- Test: `src/leaderboard/UpcomingMatchesPreview.test.tsx`

**Interfaces:**
- Consumes: `FixtureRow`'s `onSelectFixture` prop (Task 1).
- Produces: `UpcomingMatchesPreview`'s new optional prop `onSelectFixture?: (fixtureId: string) => void`.

- [ ] **Step 1: Write the failing test**

Add to `src/leaderboard/UpcomingMatchesPreview.test.tsx`, inside the existing `describe` block:

```tsx
  it("clicking a fixture row fires onSelectFixture with that fixture's id", () => {
    const onSelectFixture = vi.fn();
    render(<UpcomingMatchesPreview results={{}} onSelectFixture={onSelectFixture} />);
    const [firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/UpcomingMatchesPreview.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/leaderboard/UpcomingMatchesPreview.tsx`, update the function signature:

```tsx
export function UpcomingMatchesPreview({
  results,
  onSelectTeam,
  onSelectFixture,
}: {
  results: Record<string, TeamResult>;
  onSelectTeam?: (teamId: string) => void;
  onSelectFixture?: (fixtureId: string) => void;
}) {
```

And update the `FixtureRow` call:

```tsx
      {upcoming.map((fixture) => (
        <FixtureRow
          key={fixture.id}
          fixture={fixture}
          results={results}
          compact
          onSelectTeam={onSelectTeam}
          onSelectFixture={onSelectFixture}
        />
      ))}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/UpcomingMatchesPreview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/UpcomingMatchesPreview.tsx src/leaderboard/UpcomingMatchesPreview.test.tsx
git commit -m "Thread onSelectFixture through UpcomingMatchesPreview"
```

---

### Task 4: `LeaderboardHero.tsx` — thread `onSelectFixture` through to the drawer

**Files:**
- Modify: `src/leaderboard/LeaderboardHero.tsx`
- Test: `src/leaderboard/LeaderboardHero.test.tsx` (new — none exists today)

**Interfaces:**
- Consumes: `UpcomingMatchesDrawer`'s `onSelectFixture` prop (Task 2).
- Produces: `LeaderboardHero`'s new optional prop `onSelectFixture?: (fixtureId: string) => void`.

- [ ] **Step 1: Write the failing test**

Create `src/leaderboard/LeaderboardHero.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LeaderboardHero } from "./LeaderboardHero";

vi.mock("../tournament/now", () => ({
  resolveNow: () => new Date("2026-08-01T00:00:00.000Z"),
}));

describe("LeaderboardHero", () => {
  it("forwards onSelectFixture through to the embedded drawer", () => {
    const onSelectFixture = vi.fn();
    render(<LeaderboardHero results={{}} onSelectFixture={onSelectFixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const [, firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/LeaderboardHero.test.tsx`
Expected: FAIL — `LeaderboardHero` doesn't accept `onSelectFixture` yet (TypeScript error / prop silently dropped).

- [ ] **Step 3: Implement**

In `src/leaderboard/LeaderboardHero.tsx`, update the component:

```tsx
export const LeaderboardHero = memo(function LeaderboardHero({
  results,
  onSelectFixture,
}: {
  results: Record<string, TeamResult>;
  onSelectFixture?: (fixtureId: string) => void;
}) {
  return (
    <Frame className="relative h-full animate-cotton-rise border-color_border1/35">
      <HeroCarousel />
      <UpcomingMatchesDrawer results={results} onSelectFixture={onSelectFixture} />
    </Frame>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/LeaderboardHero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/LeaderboardHero.tsx src/leaderboard/LeaderboardHero.test.tsx
git commit -m "Thread onSelectFixture through LeaderboardHero"
```

---

### Task 5: `TeamPopup.tsx` — fill in the match-history row-click no-op

**Files:**
- Modify: `src/leaderboard/TeamPopup.tsx`
- Test: `src/leaderboard/TeamPopup.test.tsx`

**Interfaces:**
- Produces: `TeamPopup`'s new optional prop `onSelectFixture?: (fixtureId: string) => void`, fired when a match-history row itself (not a team crest/name within it) is clicked, with that fixture's id.

- [ ] **Step 1: Write the failing test**

Add to `src/leaderboard/TeamPopup.test.tsx`, immediately after the existing `"clicking a team in match history calls onSelectTeam with that team's id"` test (currently ending around line 233):

```tsx
  it("clicking a match-history row (not a team) fires onSelectFixture with that fixture's id", async () => {
    const onSelectFixture = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        onSelectFixture={onSelectFixture}
        tournamentStarted={true}
      />
    );
    const nextOpponentId =
      TEAM_FIXTURES[0].homeTeamId === TEAM.id ? TEAM_FIXTURES[0].awayTeamId : TEAM_FIXTURES[0].homeTeamId;
    const nextOpponentCode = TEAM_BY_ID_SHORT(nextOpponentId);
    // The row itself, not the nested team button inside it — climb from the
    // found text up to the row's own outer role="button" div.
    const opponentTeamButton = (await screen.findByText(nextOpponentCode)).closest("button")!;
    const row = opponentTeamButton.closest('[role="button"]')!;
    fireEvent.click(row);
    expect(onSelectFixture).toHaveBeenCalledWith(TEAM_FIXTURES[0].id);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/TeamPopup.test.tsx`
Expected: FAIL — `onSelectFixture` never called (the row's click handler is currently a no-op).

- [ ] **Step 3: Implement**

In `src/leaderboard/TeamPopup.tsx`:

1. Add `onSelectFixture` to `TeamPopupProps` (after `onSelectTeam`):

```tsx
  /** Clicking a team in match history re-opens this same popup for that
   *  other team. */
  onSelectTeam: (teamId: string) => void;
  /** Fires with a fixture's id when a match-history row (not a team within
   *  it) is clicked — opens MatchupPopup.tsx for that fixture. */
  onSelectFixture?: (fixtureId: string) => void;
```

2. Delete the module-level no-op functions and their comment (current lines 147-155):

```tsx
/** Clickable, but intentionally does nothing yet — same pattern as
 *  UpcomingMatchesDrawer.tsx: reserved for a future match-detail view. */
function handleMatchupClick() {}
function handleMatchupKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleMatchupClick();
  }
}
```

3. Update `MatchRow`'s signature and add the handlers inside its body:

```tsx
function MatchRow({
  fixtureId,
  homeId,
  awayId,
  homeGoals,
  awayGoals,
  kickoffUtc,
  result,
  t,
  onSelectTeam,
  onSelectFixture,
}: {
  fixtureId: string;
  homeId: string;
  awayId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffUtc: string;
  result: ResultLetter | null;
  t: TeamPopupTuning;
  onSelectTeam: (teamId: string) => void;
  onSelectFixture?: (fixtureId: string) => void;
}) {
  const home = TEAM_BY_ID[homeId];
  const away = TEAM_BY_ID[awayId];
  const kickoff = new Date(kickoffUtc);
  const nameStyle: CSSProperties = { fontSize: `${t.fsName}rem` };
  const crestStyle: CSSProperties = { width: `${t.rowAvatar}rem`, height: `${t.rowAvatar}rem` };

  function handleMatchupClick() {
    onSelectFixture?.(fixtureId);
  }
  function handleMatchupKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMatchupClick();
    }
  }

  return (
```

(The rest of `MatchRow`'s returned JSX is unchanged — it already references `handleMatchupClick`/`handleMatchupKeyDown` by name.)

4. In the `TeamPopup` component itself, destructure the new prop:

```tsx
export const TeamPopup = memo(function TeamPopup({
  teamId,
  entries,
  players,
  results,
  onOpenChange,
  onSelectParticipant,
  onSelectTeam,
  onSelectFixture,
  tuning,
  tournamentStarted,
}: TeamPopupProps) {
```

5. Pass `fixtureId` and `onSelectFixture` into both `MatchRow` call sites. The `nextMatch` one:

```tsx
                          <div className="shrink-0 border-b border-color_border1/40">
                            <MatchRow
                              fixtureId={nextMatch.fixtureId}
                              homeId={nextMatch.home ? team.id : nextMatch.opponentId}
                              awayId={nextMatch.home ? nextMatch.opponentId : team.id}
                              homeGoals={null}
                              awayGoals={null}
                              kickoffUtc={nextMatch.kickoffUtc}
                              result={null}
                              t={t}
                              onSelectTeam={onSelectTeam}
                              onSelectFixture={onSelectFixture}
                            />
                          </div>
```

And the `pastMatches.map` one:

```tsx
                            pastMatches.map((m) => (
                              <div key={m.fixtureId} className="border-b border-color_border1/30 last:border-0">
                                <MatchRow
                                  fixtureId={m.fixtureId}
                                  homeId={m.home ? team.id : m.opponentId}
                                  awayId={m.home ? m.opponentId : team.id}
                                  homeGoals={m.home ? m.teamGoals : m.opponentGoals}
                                  awayGoals={m.home ? m.opponentGoals : m.teamGoals}
                                  kickoffUtc={m.kickoffUtc}
                                  result={m.result}
                                  t={t}
                                  onSelectTeam={onSelectTeam}
                                  onSelectFixture={onSelectFixture}
                                />
                              </div>
                            ))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/leaderboard/TeamPopup.test.tsx`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/TeamPopup.tsx src/leaderboard/TeamPopup.test.tsx
git commit -m "Fill in TeamPopup match-history row's reserved click handler with onSelectFixture"
```

---

### Task 6: `MatchupPopup.tsx` — the new component

**Files:**
- Create: `src/leaderboard/MatchupPopup.tsx`
- Test: `src/leaderboard/MatchupPopup.test.tsx` (created in Task 7 — this task only needs the component to compile; Task 7 is where its behavior gets verified)

**Interfaces:**
- Consumes: `TeamCrest` (`./TeamCrest`), `getTeamPredictors`/`TeamPredictor` (`./teamPredictors`), `useDevMatches` (`../devpanel/useDevMatches`), `FIXTURES`/`Fixture` (`../devpanel/fixtures`), `MatchOutcome` (`../devpanel/standings`), `TEAM_BY_ID` (`../predictions/teams`), `buildPlayersByUid` (`../profile/playersByUid`), `fullName`/`initials` (`../profile/deletedAccount`), `TournamentPhase` (`../tournament/tournamentPhase`), `LeaderboardEntry` (`./leaderboardTypes`), `Player` (`../profile/usePlayers`), `TeamResult` (`./teamResultTypes`).
- Produces: `MatchupPopup` component and `MatchupPopupProps`:
  ```ts
  interface MatchupPopupProps {
    fixtureId: string | null;
    onOpenChange: (open: boolean) => void;
    phase: TournamentPhase;
    tournamentStarted: boolean;
    entries: LeaderboardEntry[];
    players: Player[];
    results: Record<string, TeamResult>;
    onSelectTeam: (teamId: string) => void;
    onSelectParticipant: (uid: string) => void;
  }
  ```

- [ ] **Step 1: Write the component**

Create `src/leaderboard/MatchupPopup.tsx`:

```tsx
import { memo, useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { TEAM_BY_ID } from "../predictions/teams";
import { FIXTURES, Fixture } from "../devpanel/fixtures";
import { MatchOutcome } from "../devpanel/standings";
import { useDevMatches } from "../devpanel/useDevMatches";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials as sharedInitials } from "../profile/deletedAccount";
import { TeamResult } from "./teamResultTypes";
import { getTeamPredictors, TeamPredictor } from "./teamPredictors";
import { TeamCrest } from "./TeamCrest";
import { TournamentPhase } from "../tournament/tournamentPhase";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MatchupPopupProps {
  /** The clicked fixture's id, or null when closed — resolved back to a
   *  real Fixture via FIXTURES, same "id in, object looked up inside" shape
   *  as TeamPopup's teamId. */
  fixtureId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Drives the header label (matchday vs. round name) and which per-team
   *  widget renders (predictor list vs. the not-yet-built advance-pick
   *  placeholder). */
  phase: TournamentPhase;
  tournamentStarted: boolean;
  entries: LeaderboardEntry[];
  players: Player[];
  results: Record<string, TeamResult>;
  /** Selecting either team closes this popup and opens TeamPopup for it. */
  onSelectTeam: (teamId: string) => void;
  /** Selecting a predictor closes this popup and opens ParticipantPopup for them. */
  onSelectParticipant: (uid: string) => void;
}

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Istanbul",
});
const TIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Istanbul",
});

const WIDGET_BLOCK = "flex min-h-0 flex-col rounded-xl bg-background border border-color_border1/60";
const NOT_STARTED_MESSAGE = "Turnuva başlamadan bu bilgi görüntülenemez.";
// The knockout-round "who picked this team to advance" feature has no data
// model anywhere yet (PROJECT_STATE §13-B) — this branch renders real,
// styled UI with an honest placeholder instead of a fabricated count/list.
const KNOCKOUT_NOT_BUILT_MESSAGE = "Bu özellik henüz mevcut değil.";

function Placeholder({ message }: { message: string }) {
  return (
    <p className="flex h-full items-center justify-center px-2 text-center font-display text-xs text-color_textsecondary italic">
      {message}
    </p>
  );
}

function goalsForOutcome(outcome: MatchOutcome): { homeGoals: number | null; awayGoals: number | null } {
  if (outcome === "notplayed") return { homeGoals: null, awayGoals: null };
  if (outcome === "homewin") return { homeGoals: 1, awayGoals: 0 };
  if (outcome === "awaywin") return { homeGoals: 0, awayGoals: 1 };
  return { homeGoals: 0, awayGoals: 0 };
}

/** Center column: kickoff date/time before the fixture is decided, the
 *  final score once it is — a neutral, non-team-relative display (unlike
 *  TeamPopup's MatchRow, there's no "our team" here to color a result dot
 *  for). */
function MatchupCenter({ fixture, outcome }: { fixture: Fixture; outcome: MatchOutcome }) {
  const kickoff = new Date(fixture.kickoffUtc);
  if (outcome === "notplayed") {
    return (
      <span className="flex flex-col items-center justify-center gap-0.5 leading-tight">
        <span className="font-mono text-sm text-color_text tnum">{DATE_FMT.format(kickoff)}</span>
        <span className="font-mono text-sm text-color_textsecondary tnum">{TIME_FMT.format(kickoff)}</span>
      </span>
    );
  }
  const { homeGoals, awayGoals } = goalsForOutcome(outcome);
  return (
    <span className="flex flex-col items-center justify-center gap-0.5 leading-tight">
      <span className="font-mono text-lg font-bold text-color_text tnum">
        {homeGoals} - {awayGoals}
      </span>
      <span className="font-mono text-[0.6rem] text-color_textsecondary tnum">{DATE_FMT.format(kickoff)}</span>
    </span>
  );
}

function TeamStatPair({ result }: { result: TeamResult | undefined }) {
  return (
    <div className="flex items-baseline justify-center gap-4">
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-[0.55rem] tracking-[0.18em] text-color_textsecondary uppercase">Sıra</span>
        <span className="font-display text-sm leading-none font-bold text-color_text tnum">
          {result ? `#${result.position}` : "-"}
        </span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-[0.55rem] tracking-[0.18em] text-color_textsecondary uppercase">Puan</span>
        <span className="font-display text-sm leading-none font-bold text-color_text tnum">
          {result ? result.points : "-"}
        </span>
      </span>
    </div>
  );
}

/** One team's predictor list — a smaller sibling of TeamPopup's own "who
 *  predicted this team" list (two of these sit side by side here, so rows
 *  are more compact than TeamPopup's single full-height version). */
function PredictorList({
  predictors,
  playersByUid,
  onSelectParticipant,
}: {
  predictors: TeamPredictor[];
  playersByUid: Map<string, Player>;
  onSelectParticipant: (uid: string) => void;
}) {
  if (predictors.length === 0) {
    return (
      <p className="px-2 py-2 font-display text-xs text-color_textsecondary italic">
        Bu takımı tahmin eden katılımcı yok.
      </p>
    );
  }
  return (
    <>
      {predictors.map((p) => (
        <button
          key={p.entry.uid}
          type="button"
          onClick={() => onSelectParticipant(p.entry.uid)}
          className={cn(
            "group flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill",
            p.correct && "bg-color_green/[0.12]"
          )}
        >
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={p.entry.photoURL} alt="" />
            <AvatarFallback className="bg-secondary font-mono text-[0.5rem] text-color_secondary">
              {sharedInitials({ firstName: p.entry.firstName, lastName: playersByUid.get(p.entry.uid)?.lastName })}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-display text-xs font-medium text-color_text group-hover:underline">
            {fullName({ firstName: p.entry.firstName, lastName: playersByUid.get(p.entry.uid)?.lastName })}
          </span>
          <span className="shrink-0 text-right font-mono text-xs text-color_textsecondary tnum">
            {p.predictedPosition}
          </span>
        </button>
      ))}
    </>
  );
}

/** One team's detail column — rank/points, then the predictor list (league
 *  phase / pre-knockout) or the knockout placeholder below it. Not rendered
 *  at all pre-tournament — see MatchupPopup's own notstarted branch. */
function TeamColumn({
  result,
  phase,
  tournamentStarted,
  predictors,
  playersByUid,
  onSelectParticipant,
}: {
  result: TeamResult | undefined;
  phase: TournamentPhase;
  tournamentStarted: boolean;
  predictors: TeamPredictor[];
  playersByUid: Map<string, Player>;
  onSelectParticipant: (uid: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <TeamStatPair result={result} />
      <div className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
          {!tournamentStarted ? (
            <Placeholder message={NOT_STARTED_MESSAGE} />
          ) : phase === "knockout" ? (
            <Placeholder message={KNOCKOUT_NOT_BUILT_MESSAGE} />
          ) : (
            <PredictorList predictors={predictors} playersByUid={playersByUid} onSelectParticipant={onSelectParticipant} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The match-detail popup — fills in the two "reserved for a future match-
 * detail view" no-ops in FixtureRow.tsx and TeamPopup.tsx's MatchRow. Same
 * Dialog+Frame recipe as TeamPopup/ParticipantPopup, no internal Firestore
 * fetching beyond useDevMatches (the same source TeamPopup's own match
 * history already reads — real production per-fixture outcomes don't exist
 * yet, a pre-existing gap this inherits rather than solves).
 *
 * Three phase-driven content modes: bare fixture card pre-tournament
 * (nothing else exists yet to show), fixture card + real rank/points +
 * predictor list once the league phase is running, and a real-but-
 * currently-unreachable knockout branch — no knockout fixture data exists
 * anywhere in the app yet, so nothing can trigger this today; it only
 * renders when a caller (currently only this component's own tests) passes
 * phase="knockout" directly.
 */
export const MatchupPopup = memo(function MatchupPopup({
  fixtureId,
  onOpenChange,
  phase,
  tournamentStarted,
  entries,
  players,
  results,
  onSelectTeam,
  onSelectParticipant,
}: MatchupPopupProps) {
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);

  // Same "keep showing the last real content while the exit animation
  // plays" trick as TeamPopup/ParticipantPopup.
  const [lastFixtureId, setLastFixtureId] = useState<string | null>(null);
  useEffect(() => {
    if (fixtureId) setLastFixtureId(fixtureId);
  }, [fixtureId]);

  const displayedId = fixtureId ?? lastFixtureId;
  const fixture = displayedId ? (FIXTURES.find((f) => f.id === displayedId) ?? null) : null;

  const { outcomes } = useDevMatches();
  const outcome: MatchOutcome = fixture ? (outcomes[fixture.id] ?? "notplayed") : "notplayed";

  const home = fixture ? TEAM_BY_ID[fixture.homeTeamId] : null;
  const away = fixture ? TEAM_BY_ID[fixture.awayTeamId] : null;

  const homePredictors = useMemo(
    () => (fixture && tournamentStarted ? getTeamPredictors(fixture.homeTeamId, entries, results) : []),
    [fixture, tournamentStarted, entries, results]
  );
  const awayPredictors = useMemo(
    () => (fixture && tournamentStarted ? getTeamPredictors(fixture.awayTeamId, entries, results) : []),
    [fixture, tournamentStarted, entries, results]
  );

  const headerLabel = fixture ? (phase === "knockout" ? "ELEME TURU" : `${fixture.matchday}. HAFTA`) : "";

  return (
    <Dialog open={fixtureId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-3xl"
      >
        {fixture && home && away && (
          <Frame className="max-h-[min(85vh,44rem)] w-full animate-cotton-rise border-color_border1/35">
            <FrameHeader tone="navy">
              <FrameTitle className="text-navy-ink">{headerLabel}</FrameTitle>
              <DialogTitle className="sr-only">
                {home.name} - {away.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {home.name} - {away.name} maç detayı: sıra, puan ve bu takımları tahmin eden katılımcılar.
              </DialogDescription>
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-navy-ink/70 hover:bg-navy-ink/10 hover:text-navy-ink"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Kapat</span>
              </DialogClose>
            </FrameHeader>

            <FrameBody className="min-h-0 gap-3 p-3 sm:p-4">
              <div
                className="grid shrink-0 items-center gap-2 px-2 pt-1"
                style={{ gridTemplateColumns: "minmax(0,1fr) 6rem minmax(0,1fr)" }}
              >
                <button
                  type="button"
                  onClick={() => onSelectTeam(home.id)}
                  className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5"
                >
                  <TeamCrest teamId={home.id} className="size-10" />
                  <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
                    {home.name}
                  </span>
                </button>

                <MatchupCenter fixture={fixture} outcome={outcome} />

                <button
                  type="button"
                  onClick={() => onSelectTeam(away.id)}
                  className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5"
                >
                  <TeamCrest teamId={away.id} className="size-10" />
                  <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
                    {away.name}
                  </span>
                </button>
              </div>

              {phase !== "notstarted" && (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
                  <TeamColumn
                    result={results[home.id]}
                    phase={phase}
                    tournamentStarted={tournamentStarted}
                    predictors={homePredictors}
                    playersByUid={playersByUid}
                    onSelectParticipant={onSelectParticipant}
                  />
                  <TeamColumn
                    result={results[away.id]}
                    phase={phase}
                    tournamentStarted={tournamentStarted}
                    predictors={awayPredictors}
                    playersByUid={playersByUid}
                    onSelectParticipant={onSelectParticipant}
                  />
                </div>
              )}
            </FrameBody>
          </Frame>
        )}
      </DialogContent>
    </Dialog>
  );
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors from `src/leaderboard/MatchupPopup.tsx`. (The file has no test of its own yet — that's Task 7 — so there's nothing to run beyond the type-checker here.)

- [ ] **Step 3: Commit**

```bash
git add src/leaderboard/MatchupPopup.tsx
git commit -m "Add MatchupPopup component"
```

---

### Task 7: `MatchupPopup.test.tsx` — behavior tests

**Files:**
- Create: `src/leaderboard/MatchupPopup.test.tsx`

**Interfaces:**
- Consumes: `MatchupPopup`/`MatchupPopupProps` (Task 6).

- [ ] **Step 1: Write the tests**

Create `src/leaderboard/MatchupPopup.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { MatchupPopup } from "./MatchupPopup";
import { FIXTURES } from "../devpanel/fixtures";
import { TEAM_BY_ID } from "../predictions/teams";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";

const FIXTURE = FIXTURES[0];
const HOME = TEAM_BY_ID[FIXTURE.homeTeamId];
const AWAY = TEAM_BY_ID[FIXTURE.awayTeamId];

const entryA: LeaderboardEntry = {
  uid: "uid1",
  firstName: "Ada",
  photoURL: "a.png",
  points: 9,
  ranking: [FIXTURE.homeTeamId, FIXTURE.awayTeamId],
};
const entryB: LeaderboardEntry = {
  uid: "uid2",
  firstName: "Alan",
  photoURL: "b.png",
  points: 6,
  ranking: [FIXTURE.awayTeamId, FIXTURE.homeTeamId],
};
const PLAYERS = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 1 },
];
const results: Record<string, TeamResult> = {
  [FIXTURE.homeTeamId]: { position: 3, points: 12, goalDifference: 4, goalsFor: 8, goalsAgainst: 4 },
  [FIXTURE.awayTeamId]: { position: 20, points: 3, goalDifference: -3, goalsFor: 2, goalsAgainst: 5 },
};

describe("MatchupPopup", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] }); // devMatches: nothing decided by default
  });

  it("renders nothing when there is no selected fixture", async () => {
    render(
      <MatchupPopup
        fixtureId={null}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("shows both teams' names and the kickoff date/time before the fixture is decided", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="notstarted"
        tournamentStarted={false}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText(HOME.name)).toBeInTheDocument();
    expect(screen.getByText(AWAY.name)).toBeInTheDocument();
  });

  it("shows only the bare fixture card in notstarted phase — no rank/points, no predictor list", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="notstarted"
        tournamentStarted={false}
        entries={[entryA]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    await screen.findByText(HOME.name);
    expect(screen.queryByText("Sıra")).not.toBeInTheDocument();
    expect(screen.queryByText("Puan")).not.toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("shows the matchday label for league-phase and each team's real rank/points once started", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText(`${FIXTURE.matchday}. HAFTA`)).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("#20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("lists participants who predicted each team and calls onSelectParticipant when one is clicked", async () => {
    const onSelectParticipant = vi.fn();
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[entryA, entryB]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={onSelectParticipant}
      />
    );
    const adaButton = (await screen.findByText("Ada Lovelace")).closest("button")!;
    fireEvent.click(adaButton);
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });

  it("shows the not-viewable placeholder instead of the predictor lists before the tournament starts", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={false}
        entries={[entryA, entryB]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect((await screen.findAllByText("Turnuva başlamadan bu bilgi görüntülenemez.")).length).toBe(2);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("#3")).not.toBeInTheDocument();
  });

  it("shows the final score instead of kickoff time once the fixture outcome is decided", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: FIXTURE.id, data: () => ({ outcome: "homewin" }) }],
    });
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText("1 - 0")).toBeInTheDocument();
  });

  it("shows the round label and the knockout not-built placeholder when phase is knockout", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="knockout"
        tournamentStarted={true}
        entries={[entryA]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText("ELEME TURU")).toBeInTheDocument();
    expect(screen.getAllByText("Bu özellik henüz mevcut değil.").length).toBe(2);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("clicking a team calls onSelectTeam with that team's id", async () => {
    const onSelectTeam = vi.fn();
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={onSelectTeam}
        onSelectParticipant={() => {}}
      />
    );
    fireEvent.click(await screen.findByText(HOME.name));
    expect(onSelectTeam).toHaveBeenCalledWith(HOME.id);
  });

  it("calls onOpenChange(false) when the close button is activated", async () => {
    const onOpenChange = vi.fn();
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={onOpenChange}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    fireEvent.click(await screen.findByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/leaderboard/MatchupPopup.test.tsx`
Expected: PASS, all tests. If a selector doesn't match real rendered output (e.g. `onOpenChange` call signature differs from `TeamPopup`'s — check the actual `Dialog` primitive's `onOpenChange` call shape if this one fails), adjust the assertion to match, not the component — `TeamPopup.test.tsx`'s equivalent test (last one in that file) is the reference for the real call shape.

- [ ] **Step 3: Commit**

```bash
git add src/leaderboard/MatchupPopup.test.tsx
git commit -m "Add MatchupPopup tests"
```

---

### Task 8: Wire `MatchupPopup` into `LeaderboardPage.tsx`

**Files:**
- Modify: `src/pages/LeaderboardPage.tsx`
- Test: `src/pages/LeaderboardPage.test.tsx`

**Interfaces:**
- Consumes: `MatchupPopup` (Task 6/7), `LeaderboardHero`'s `onSelectFixture` prop (Task 4), `TeamPopup`'s `onSelectFixture` prop (Task 5).

- [ ] **Step 1: Write the failing test**

In `src/pages/LeaderboardPage.test.tsx`, update the import line to add `fireEvent`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
```

Add a new test at the end of the `describe` block:

```tsx
  it("opens the Matchup Popup when a fixture row in the hero drawer is clicked", () => {
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    render(<LeaderboardPage />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // the first fixture row's own click target
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LeaderboardPage.test.tsx`
Expected: FAIL — no dialog opens (nothing wired yet).

- [ ] **Step 3: Implement**

In `src/pages/LeaderboardPage.tsx`, add the import:

```tsx
import { MatchupPopup } from "../leaderboard/MatchupPopup";
```

Add state and extend the existing callbacks:

```tsx
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
```

```tsx
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleFixturePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedFixtureId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectFixture = useCallback((fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    setSelectedTeamId(null);
    setSelectedUid(null);
  }, []);
```

Update the JSX — `LeaderboardHero` gains `onSelectFixture`:

```tsx
        <LeaderboardHero results={results} onSelectFixture={handleSelectFixture} />
```

`TeamPopup` gains `onSelectFixture`:

```tsx
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted={phase !== "notstarted"}
      />
```

And a new `MatchupPopup` rendered after it:

```tsx
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={handleFixturePopupOpenChange}
        phase={phase}
        tournamentStarted={phase !== "notstarted"}
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/LeaderboardPage.test.tsx`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LeaderboardPage.tsx src/pages/LeaderboardPage.test.tsx
git commit -m "Wire MatchupPopup into LeaderboardPage"
```

---

### Task 9: Wire `MatchupPopup` into `ProfilePage.tsx`

**Files:**
- Modify: `src/pages/ProfilePage.tsx`
- Test: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: `MatchupPopup` (Task 6/7), `TeamPopup`'s `onSelectFixture` prop (Task 5), `useTournamentPhase` (`../tournament/useTournamentPhase` — not currently imported by this page).

- [ ] **Step 1: Write the failing test**

In `src/pages/ProfilePage.test.tsx`, add a mock for `useTournamentPhase` alongside the other hook mocks near the top of the file:

```tsx
const mockUseTournamentPhase = vi.fn();
```

```tsx
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));
```

Add a default return value in the existing `beforeEach`:

```tsx
    mockUseTournamentPhase.mockReturnValue("notstarted");
```

Add imports needed for the new test, alongside the existing top-level imports:

```tsx
import { TEAMS } from "../predictions/teams";
import { FIXTURES } from "../devpanel/fixtures";
```

Add a new test:

```tsx
  it("opens the Matchup Popup when a played match row is clicked inside TeamPopup", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    const fixture = FIXTURES[0];
    const homeTeam = TEAMS.find((t) => t.id === fixture.homeTeamId)!;
    const awayTeam = TEAMS.find((t) => t.id === fixture.awayTeamId)!;
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: [fixture.homeTeamId, fixture.awayTeamId], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    renderPage();

    fireEvent.click(await screen.findByText(homeTeam.name));
    // TeamPopup is now open on the home team; its match-history row for
    // this fixture is the row itself, not the nested opponent-team button.
    const opponentTeamButton = (await screen.findByText(awayTeam.shortName)).closest("button")!;
    const row = opponentTeamButton.closest('[role="button"]')!;
    fireEvent.click(row);

    expect(await screen.findAllByRole("dialog")).toHaveLength(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: FAIL — either a TypeScript error (`useTournamentPhase` unmocked but now called) or no dialog opens.

- [ ] **Step 3: Implement**

In `src/pages/ProfilePage.tsx`, add imports:

```tsx
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
```

Inside `ProfilePage()`, add the hook call near the other data hooks:

```tsx
  const { entries, loading: entriesLoading } = useLeaderboard();
  const { results } = useResults();
  const { players } = usePlayers();
  const phase = useTournamentPhase();
```

Add state:

```tsx
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
```

Extend the existing callbacks and add the new one:

```tsx
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleFixturePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedFixtureId(null);
  }, []);
  const handleSelectParticipant = useCallback((participantUid: string) => {
    setSelectedUid(participantUid);
    setSelectedTeamId(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectFixture = useCallback((fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    setSelectedTeamId(null);
    setSelectedUid(null);
  }, []);
```

Update the `TeamPopup` JSX to add `onSelectFixture`:

```tsx
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted={predictionLocked}
      />
```

And add `MatchupPopup` right after it:

```tsx
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={handleFixturePopupOpenChange}
        phase={phase}
        tournamentStarted={predictionLocked}
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: PASS, all tests including the new one. If the row-finding selector doesn't match (e.g. `TeamPopup` didn't open on the expected team, or the match-history row structure differs from what's assumed), inspect actual output via `screen.debug()` and adjust the query — the underlying wiring (the code in Step 3) is the source of truth, not this test's exact selectors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProfilePage.tsx src/pages/ProfilePage.test.tsx
git commit -m "Wire MatchupPopup into ProfilePage"
```

---

### Task 10: Wire `MatchupPopup` into `HomeLandingLoggedOutStarted.tsx`

**Files:**
- Modify: `src/home/HomeLandingLoggedOutStarted.tsx`
- Test: `src/home/HomeLandingLoggedOutStarted.test.tsx`

**Interfaces:**
- Consumes: `MatchupPopup` (Task 6/7), `UpcomingMatchesPreview`'s `onSelectFixture` prop (Task 3), `TeamPopup`'s `onSelectFixture` prop (Task 5).

- [ ] **Step 1: Write the failing test**

In `src/home/HomeLandingLoggedOutStarted.test.tsx`, extend the existing `UpcomingMatchesPreview` mock to also expose `onSelectFixture`:

```tsx
vi.mock("../leaderboard/UpcomingMatchesPreview", () => ({
  UpcomingMatchesPreview: ({
    onSelectTeam,
    onSelectFixture,
  }: {
    onSelectTeam: (id: string) => void;
    onSelectFixture?: (id: string) => void;
  }) => (
    <div>
      <button onClick={() => onSelectTeam("arsenal")}>upcoming-preview</button>
      <button onClick={() => onSelectFixture?.("fixture-1")}>upcoming-preview-fixture</button>
    </div>
  ),
}));
```

Extend the existing `TeamPopup` mock to also expose `onSelectFixture`:

```tsx
vi.mock("../leaderboard/TeamPopup", () => ({
  TeamPopup: ({
    teamId,
    onSelectFixture,
  }: {
    teamId: string | null;
    onSelectFixture?: (id: string) => void;
  }) => (
    <div>
      <span>team-popup:{teamId ?? "closed"}</span>
      <button onClick={() => onSelectFixture?.("fixture-2")}>team-popup-select-fixture</button>
    </div>
  ),
}));
```

Add a new mock for `MatchupPopup`, alongside the other `vi.mock` calls:

```tsx
vi.mock("../leaderboard/MatchupPopup", () => ({
  MatchupPopup: ({ fixtureId }: { fixtureId: string | null }) => <div>matchup-popup:{fixtureId ?? "closed"}</div>,
}));
```

Add a new test at the end of the `describe` block:

```tsx
  it("opens the Matchup Popup when a fixture is selected from the upcoming-matches preview or from TeamPopup's match history", () => {
    render(<HomeLandingLoggedOutStarted results={{}} players={[]} entries={[]} />);
    expect(screen.getByText("matchup-popup:closed")).toBeInTheDocument();

    fireEvent.click(screen.getByText("upcoming-preview-fixture"));
    expect(screen.getByText("matchup-popup:fixture-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("team-popup-select-fixture"));
    expect(screen.getByText("matchup-popup:fixture-2")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/home/HomeLandingLoggedOutStarted.test.tsx`
Expected: FAIL — `MatchupPopup` isn't rendered by the page yet (test errors on the missing `matchup-popup:closed` text).

- [ ] **Step 3: Implement**

In `src/home/HomeLandingLoggedOutStarted.tsx`, add the import:

```tsx
import { MatchupPopup } from "../leaderboard/MatchupPopup";
```

Add state:

```tsx
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
```

Extend the existing callbacks and add the new one:

```tsx
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectFixture = useCallback((fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    setSelectedTeamId(null);
    setSelectedUid(null);
  }, []);
```

Update the `UpcomingMatchesPreview` JSX to add `onSelectFixture`:

```tsx
              <UpcomingMatchesPreview results={results} onSelectTeam={handleSelectTeam} onSelectFixture={handleSelectFixture} />
```

Update the `TeamPopup` JSX to add `onSelectFixture`:

```tsx
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={(open) => {
          if (!open) setSelectedTeamId(null);
        }}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted
      />
```

Add `MatchupPopup` after it. This composition is always `leaguephase` by construction (same reasoning as its own `tournamentStarted` hardcoded `true` above), so `phase` is passed as a literal:

```tsx
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={(open) => {
          if (!open) setSelectedFixtureId(null);
        }}
        phase="leaguephase"
        tournamentStarted
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/home/HomeLandingLoggedOutStarted.test.tsx`
Expected: PASS, all tests including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/home/HomeLandingLoggedOutStarted.tsx src/home/HomeLandingLoggedOutStarted.test.tsx
git commit -m "Wire MatchupPopup into HomeLandingLoggedOutStarted"
```

---

### Task 11: Full verification pass

**Files:** none (verification only)

**Interfaces:** none — this task consumes the completed work of Tasks 1-10 as a whole.

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc -b`
Expected: no errors anywhere in the project.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: every test file passes, including all files touched in Tasks 1-10.

- [ ] **Step 3: Manual/Playwright verification with the dev server**

Start the dev server (`npm run dev`), then using the Playwright MCP tools:

1. Navigate to `/dev`, sign in with a real Google account if the panel shows permission errors (per PROJECT_STATE §6.9's documented DevPanel gap), force the phase override to `leaguephase`.
2. Navigate to `/leaderboard`, open the hero's upcoming-matches drawer, click a fixture row (not a team crest) — confirm `MatchupPopup` opens showing both teams, the matchday label, rank/points, and predictor lists (or the "no participant" message if none exist yet in dev data).
3. From inside that popup, click a team — confirm it closes and `TeamPopup` opens for that team instead.
4. Inside `TeamPopup`, scroll to match history, click a past or upcoming match row (not a team) — confirm `MatchupPopup` opens again for that fixture.
5. Navigate to `/profile`, open `TeamPopup` from the prediction list, click a match-history row — confirm the same `MatchupPopup` behavior.
6. Force logged-out + `leaguephase` in DevPanel (or navigate incognito), visit `/` (Home) — confirm `HomeLandingLoggedOutStarted`'s upcoming-matches widget opens `MatchupPopup` the same way.
7. Confirm the close button and backdrop-click both close `MatchupPopup` cleanly, with the "cotton" exit animation intact (no content flash).
8. Take a screenshot of the open popup for a visual sanity check — this is where any visual polish (spacing, the navy-header close-button contrast) can be adjusted; per the design spec, the wireframes were never meant to be followed pixel-for-pixel.

Report what was confirmed working versus anything that needed a visual tweak.

- [ ] **Step 4: Final commit if Step 3 required any code changes**

If Step 3 surfaced any real bugs (not just visual polish), fix them, re-run Steps 1-2, and commit:

```bash
git add -A
git commit -m "Fix issues found during manual verification"
```

If Step 3 required only visual polish (spacing/color tweaks), make those changes directly in `src/leaderboard/MatchupPopup.tsx`, re-run Steps 1-2, and commit:

```bash
git add src/leaderboard/MatchupPopup.tsx
git commit -m "Visual polish on MatchupPopup after manual review"
```
