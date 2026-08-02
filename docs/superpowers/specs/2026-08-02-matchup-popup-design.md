# Matchup Popup — design spec

**Status:** approved (Mert, 2026-08-02 — "Proceed" × 4, through iterative Q&A)
**Branch:** `matchup-popup`

## Purpose

Build the Matchup Popup — the last of the three popup families on the status grid still marked "Not Finished" for every reachable state (Team Popup and Participant Popup are both green/blue; Matchup Popup is red everywhere except `notLogged_notStarted`, which is gray/not-needed). Two reserved-but-inert click handlers already exist in the codebase for exactly this: `FixtureRow.tsx`'s `handleMatchClick` and `TeamPopup.tsx`'s `MatchRow`'s `handleMatchupClick`, both commented "reserved for a future match-detail view." This spec is that view.

Source: three hand-drawn wireframes (`stupid illustrations/when it's not started.png`, `...league phase and pre knockout.png`, `...knockout.png`) — confirmed by Mert to be rough intent sketches only ("made in paint in 3 minutes"), not a literal visual spec. Visual treatment instead follows the existing `TeamPopup`/`ParticipantPopup` recipe throughout.

## Scope note: what's in vs. out

**In scope:**
- A new `MatchupPopup` component, following the same `Dialog` + `Frame` recipe as `TeamPopup`/`ParticipantPopup` (no internal Firestore fetching — pure presentational, fed via props from whichever page renders it).
- Three phase-driven content modes: bare fixture card (`notstarted`), fixture card + real rank/points + predictor list (`leaguephase`/`preknockout`), and a real-but-currently-unreachable round-header + static placeholder branch (`knockout`).
- Filling in both existing reserved trigger points (`FixtureRow`, `TeamPopup`'s `MatchRow`) and threading the new `onSelectFixture` callback through every page that can actually reach either — see the corrected wiring table in §3 (verified against real code during planning; `StatsPage` turns out to have no fixture list or popup infrastructure at all today, so there is no reserved trigger there to fill in).
- `LeaderboardHero` (the shared wrapper embedding `UpcomingMatchesDrawer`, reused by Leaderboard and logged-in Home's dashboard via `HomeHero`) gains an `onSelectFixture` prop, since it currently passes the drawer no click wiring at all.

**Out of scope, explicitly:**
- **The knockout-prediction feature itself** (a participant's "who advances" pick, its data model, its own UI). Confirmed absent from the codebase entirely — no Firestore field, no collection, no hook, only a line of onboarding copy promising it. The Matchup Popup's knockout branch renders real styled UI (round name header, static advance-pick placeholder) but has **no live data to show** and, since no knockout `Fixture` data exists anywhere either, **no code path in the running app can currently open it** — it's tested only by rendering the component directly with a hand-built prop. Wiring it to real data is a separate future project once the knockout-prediction feature itself is designed.
- **Real production match outcomes/scores.** The "played vs. unplayed" fixture distinction reuses `TeamPopup`'s existing `useDevMatches()` outcome source — the same known, already-documented gap (PROJECT_STATE §13-B) where no equivalent mechanism exists for real production results. Not solved here; inherited as-is, consistent with every other consumer of that data today.
- Any new aggregation logic for "who predicted this team" — `getTeamPredictors` already returns exactly what's needed (participant + predicted position, sorted by leaderboard rank); the popup renders its output directly rather than re-grouping by position.
- Mobile/responsive layout — desktop-only, per explicit instruction, same precedent as every other recent branch.
- Changing `TeamTable`, `TeamPopup`, `ParticipantPopup`, `UpcomingMatchesDrawer`, or `UpcomingMatchesPreview`'s own existing behavior beyond filling in their one reserved no-op handler each and adding the new prop needed to carry `onSelectFixture` through.

## 1. Component: `MatchupPopup`

New file, `src/leaderboard/MatchupPopup.tsx`, matching `TeamPopup.tsx`/`ParticipantPopup.tsx`'s established recipe exactly:

- `Dialog`/`DialogContent`/`DialogTitle`/`DialogDescription`/`DialogClose` shell (`showCloseButton={false}`, manual top-right `XIcon`), transparent/borderless `DialogContent`, with a `Frame` (`animate-cotton-rise`) as the actual visible card.
- `open={fixture !== null}`, `onOpenChange`, plus a `lastFixture` state (via `useEffect`) so content doesn't flash empty during the close animation — same pattern both existing popups use.
- No internal data fetching. Props:

```ts
interface MatchupPopupProps {
  fixture: Fixture | null;
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

- Team crests use `TeamCrest` as-is (square, existing convention) — no new crest component.

## 2. Phase-specific content

**`notstarted`:** header (matchday, date), two `TeamCrest` + team-name blocks, kickoff time. No rank/points, no predictor list, regardless of login state — nothing else exists to show yet.

**`leaguephase` / `preknockout`:** same card, plus per team:
- Rank + points from `results[teamId]` — identical stat pair `TeamPopup`'s own header already surfaces.
- A scrollable predictor list via `getTeamPredictors(teamId, entries, results)`, rendered in its existing sort order (by predictor's own leaderboard rank), each row clickable → `onSelectParticipant(uid)`.
- Gated behind `tournamentStarted` via the shared `NotViewablePlaceholder` ("Turnuva başlamadan bu bilgi görüntülenemez."), same as `TeamPopup`/`ParticipantPopup`.

**Unplayed vs. played fixture (applies within league/pre-knockout phases):** when the fixture's outcome (via `useDevMatches()`, the same source `TeamPopup` already reads) is decided, the card swaps kickoff-time for a goal tally + `ResultDot`, reusing `TeamPopup`'s own `MatchRow` visual treatment rather than a new one.

**`knockout`:** real render branch gated on `phase === "knockout"` — header shows a round name instead of "MATCHDAY N"; per-team block shows a static, styled "advance pick" placeholder with no live count or list (no data source exists). Unreachable via any real trigger today (see Scope note); exercised only by direct component tests.

## 3. Trigger wiring

Both existing reserved handlers get filled in to call a new `onSelectFixture?: (fixtureId: string) => void` prop:

- **`FixtureRow.tsx`**: `handleMatchClick` → `onSelectFixture?.(fixture.id)`. `onSelectFixture` threaded as a new optional prop, passed down from `UpcomingMatchesDrawer` and `UpcomingMatchesPreview`.
- **`TeamPopup.tsx`'s `MatchRow`**: `handleMatchupClick` → resolves the full `Fixture` via `FIXTURES.find(f => f.id === entry.fixtureId)` (always resolves — `TeamMatchHistoryEntry.fixtureId` is always a real `FIXTURES` id) then calls the new `onSelectFixture` prop threaded into `TeamPopup` itself.
- **`LeaderboardHero.tsx`**: gains an `onSelectFixture` prop, forwarded to its embedded `UpcomingMatchesDrawer` (currently receives no click wiring of any kind).

**Parent-level wiring** (each gets a new `selectedFixtureId` state slot + a rendered `<MatchupPopup>`, mirroring the existing `selectedTeamId`/`selectedUid` pattern). Verified against the real component tree during planning — `StatsHero` turns out to be `HeroCarousel` alone (no drawer at all, unlike `LeaderboardHero`), and `StatsPageView` has no `TeamPopup`/`ParticipantPopup`/fixture list anywhere, so Stats has no reserved trigger to fill in and is excluded:

| Page | Reaches `MatchupPopup` via | Notes |
|---|---|---|
| `LeaderboardPage.tsx` | `LeaderboardHero` (drawer) + its own `TeamPopup` instance | Full cross-nav: `entries`/`results` are real, `TeamPopup`/`ParticipantPopup` both present. |
| `ProfilePage.tsx` | its own `TeamPopup` instance only | No fixture drawer exists on this page — only reachable via a played-match row inside `TeamPopup`'s match history. |
| `HomeLandingLoggedOutStarted.tsx` | `UpcomingMatchesPreview` + its own `TeamPopup` instance | Full cross-nav, same as Leaderboard — this composition is always `leaguephase`. |
| `HomeLandingLoggedIn.tsx` | `HomeHero` → `LeaderboardHero` (drawer) only | This composition is used only for `loggedin_notstarted` (PROJECT_STATE §6.1 — every other logged-in started state is still the placeholder skeleton). `MatchupPopup` here only ever renders in `notstarted` mode (bare card, no rank/predictor list) — there's no `TeamPopup`/`ParticipantPopup` on this page today and none is added; `onSelectTeam`/`onSelectParticipant` are passed as no-ops, matching the existing `noop` pattern `HomeLandingLoggedOutStarted.tsx` already uses for structurally-unreachable callbacks. |
| ~~`StatsPage.tsx`~~ | — | Excluded: no fixture list, no `TeamPopup`/`ParticipantPopup` exist on this page at all — nothing to wire. |

Existing pages already keep `selectedTeamId`/`selectedUid` mutually exclusive (`LeaderboardPage.tsx`: "selecting one clears the other... stacking two Dialogs isn't worth the backdrop/z-index mess"). `selectedFixtureId` joins that same mutual-exclusion group on every page that gets it: selecting a fixture clears `selectedTeamId`/`selectedUid`, and selecting a team or participant from inside `MatchupPopup` clears `selectedFixtureId`. At most one of the three popups is ever open at once, on every page.

## 4. Testing

- New `MatchupPopup.test.tsx`: each phase's render output, the `tournamentStarted` gate, unplayed-vs-played fixture display, predictor-row click → `onSelectParticipant`, and the knockout branch (rendered directly with a hand-built fixture prop, since no real trigger reaches it).
- Updated: `FixtureRow.test.tsx`, `UpcomingMatchesDrawer.test.tsx`, `UpcomingMatchesPreview.test.tsx`, `TeamPopup.test.tsx` — previously asserted (or implied) the row click was inert; now assert `onSelectFixture` fires with the correct fixture id.
- Page-level tests for all 4 wiring points in the table above: `MatchupPopup` renders and its state slot opens/closes correctly.
- Standard bar before merge: `tsc -b` clean, full suite green.

Mobile: no thought given, per explicit instruction — desktop-only, no responsive breakpoints.
