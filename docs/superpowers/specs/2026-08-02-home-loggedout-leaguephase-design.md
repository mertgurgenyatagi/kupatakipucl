# Home — logged-out, league phase — design spec

**Status:** approved (Mert, 2026-08-02 — "Proceed")
**Branch:** `home-loggedout-leaguephase`

## Purpose

Build the `loggedout_leaguephase` composition of `HomePage.tsx` — currently one of the two "started" cells still rendering the generic `[Placeholder]` skeleton (status grid: Home is red for every started×login combination except this one being tackled now). Source: a hand-drawn wireframe (4-column layout: league table | upcoming-3 + forum widget | hero carousel | participant rankings) plus the existing pagemap grid confirming Team Popup and Participant Popup are already "Finished" for this state and safe to wire in as-is.

## Scope note: what's in vs. out

**In scope:** exactly the `loggedout_leaguephase` `VisibilityState`. A new `HomeLandingLoggedOutStarted` component, routed from `HomePage.tsx`, composing four widgets per the wireframe.

**Out of scope, explicitly:**
- `loggedin_leaguephase`, and both `preknockout`/`knockout` phases in either login state — still the shared `[Placeholder]` skeleton after this ships. `HomeLandingLoggedOutStarted` is written data-driven (nothing league-phase-specific baked in beyond what the underlying hooks already return), so it's a plausible reuse candidate for the logged-out `preknockout`/`knockout` cells later, but wiring that up is a separate future decision, not this branch's job.
- Any banner/blurb/greeting above the 4-column row — confirmed with Mert: the wireframe is literal, nav then straight into the four columns, nothing else. `HomePage.tsx`'s `STARTED_LOGGEDOUT_BLURB` stops applying to this one state (still used by the remaining unbuilt started states until they get their own pass).
- Mobile/responsive layout — desktop-only, per Mert's explicit instruction, same precedent as `/about` and the Forum/name-privacy branch.
- Matchup Popup — still "Not Finished" on the pagemap for every state, not touched here.
- Any change to `TeamTable`, `UpcomingMatchesDrawer`, `LeaderboardTable`, or `HomeHero`'s own behavior on the pages that already use them (Leaderboard, logged-in Home) — this branch only adds new small components alongside them and extracts shared sub-pieces; it doesn't change how those existing pages render.

## 1. Component architecture

Two of the four widgets are new; two are pure reuse:

| Wireframe column | Component | Reuse / new |
|---|---|---|
| 1 — league table | `LeagueTableList` | New |
| 2 top — upcoming 3 fixtures | `UpcomingMatchesPreview` | New |
| 2 bottom — forum widget | `RecentPostsPreview` | Reused, extended for a nullable `uid` |
| 3 — hero carousel | `HomeHero` | Reused as-is |
| 4 — participant rankings | `LeaderboardTable` | Reused as-is |

The two new components are built as small, single-purpose files rather than adding layout-mode props to `TeamTable`/`UpcomingMatchesDrawer` — those two already carry substantial split-half / collapsible-drawer logic, and the new layouts (one tall single-column list; a static, non-collapsible 3-item list) are visually distinct enough that a mode branch would mostly be an `if` around two unrelated render trees. Instead:

- `TeamTable.tsx` has its per-row content (qualification tick, crest, short name, O/A/Y/AV/P stats) extracted into a shared `TeamStandingRow` piece (or equivalent small function/component in a shared module), used by both the existing split-half table and the new `LeagueTableList`.
- `UpcomingMatchesDrawer.tsx` has its per-fixture row (place · home crest/name · date/time · away crest/name · place) extracted into a shared `FixtureRow` piece, used by both the drawer and the new `UpcomingMatchesPreview`.

This keeps `TeamTable`/`UpcomingMatchesDrawer` themselves unchanged in behavior and avoids duplicating ~80 lines of crest/qualification/date-formatting markup in the new components.

## 2. New component specs

### `LeagueTableList`

- Single scrollable list, all 36 teams, one row per team (no split into two 18-row halves — that's `TeamTable`'s own space-constrained layout, not needed here since this column gets a full, generous height).
- Row height matched to `LeaderboardTable`'s row rhythm (col 4), per the wireframe's "large items, as tall as participants" note — visual parity between the two rank-style lists sitting side by side in the row.
- Per row: qualification-band tick (direct/playoff/none, via the qualification logic `TeamTable` already uses), crest, team name, matches played, goals for, goals against, goal difference, points — the same stat set as `TeamTable`, just laid out as one wide row instead of a compact grid cell.
- Sorted by position (current standings order) — no interactive column-sort affordance here (that's `TeamTable`'s own feature on the Leaderboard page; this is a glanceable widget, not a full instrument).
- Row click → `onSelectTeam(teamId)`, wired to open `TeamPopup`, same as `TeamTable`'s existing click behavior. Pointer cursor on rows (genuinely interactive, per Cursorify).
- Degrades the same way `TeamTable` does before any result exists (honest alphabetical-ish roster, dashes for stats) — reuses that same "no results yet" branch logic rather than re-deriving it.

### `UpcomingMatchesPreview`

- Exactly 3 upcoming fixtures (`getUpcomingFixtures(resolveNow())`, sliced to 3) — no collapse/expand chrome, no infinite scroll, no scroll container at all (fixed 3 rows).
- Each row: the extracted `FixtureRow` piece — reuses place, crest+name (each independently clickable-but-no-op, stopping propagation same as today), date/time.
- Rows keep the drawer's established "clickable but does nothing" convention — confirmed with Mert, kept consistent with the drawer everywhere else fixtures show up, ready for a future match-detail view to slot in across both surfaces at once.
- If there are zero upcoming fixtures, renders nothing meaningful inside the frame (mirrors `UpcomingMatchesDrawer`'s own `if (allUpcoming.length === 0) return null` — though in practice league-phase always has fixtures remaining).

### `RecentPostsPreview` (extension, not rewrite)

- `uid` prop widens from `string` to `string | null`.
- Like button: `disabled={!uid}`, with the exact same visual/aria treatment `ThreadCard.tsx` already applies for its own like button (`aria-label` swaps to "Beğenmek için giriş yapmalısın", cursor becomes `cursor-default` instead of `cursor-pointer`, no hover color change) — matching the just-shipped Forum convention rather than inventing a new one.
- `onDeletePost`/`onSaveEdit` need no new gating: they're already only reachable via `ThreadPopup`'s own author check, and a logged-out visitor is never a post's author, so these two stay structurally unreachable — no behavior change needed there.
- No visual/layout changes otherwise.

## 3. `HomeLandingLoggedOutStarted` — page composition

New file, `src/home/HomeLandingLoggedOutStarted.tsx`, named to match the existing `HomeLandingLoggedOut`/`HomeLandingLoggedIn`/`LoggedInHome` family. Routed from `HomePage.tsx` with a new early return:

```ts
if (state === "loggedout_leaguephase") {
  return <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} />;
}
```

placed alongside the two existing `loggedout_notstarted` / `loggedin_notstarted` early returns, ahead of the generic shared-skeleton fallback (which keeps handling the remaining unbuilt started states).

**Layout:** one CSS grid row, four columns, roughly `grid-cols-[1.3fr_0.9fr_300px_1fr]` (col 1 widest for the league table, col 2 narrower for its two stacked frames, col 3 a fixed 300px matching `HomeHero`'s established width on logged-in Home, col 4 wide for standings) — starting values, not pixel-locked; the sketch's own "dimensions are fucked up in general, more spacious than shown" note means this gets tuned visually rather than derived from the drawing. Col 2 is itself a flex column of two `Frame`s stacked vertically (`UpcomingMatchesPreview` on top, `RecentPostsPreview` below), matching the sketch's two stacked boxes.

Each column wrapped in the site's standard `Frame`/`FrameHeader`/`FrameBody` chrome, consistent with every other bento-style page (`LeaderboardPage`, `HomeLandingLoggedIn`).

**Popups:** `TeamPopup` and `ParticipantPopup` mounted once each at the composition's root, wired with mutually-exclusive selected-id state exactly like `LeaderboardPage.tsx` (`handleSelectTeam` clears `selectedUid` and vice versa). `tournamentStarted={true}` unconditionally — this state is definitionally a started phase.

**No banner, no blurb, no greeting, no countdown** — confirmed out of scope above.

## 4. Data wiring

`HomeLandingLoggedOutStarted` receives `results`/`players`/`entries` as props from `HomePage.tsx` (already fetched there via `useResults`/`usePlayers`/`useLeaderboard` — no new top-level hooks needed for those three). Internally it also calls:

- `usePosts()` (existing forum hook) for `RecentPostsPreview`'s post list, plus `buildLikesByPost(posts)` (existing helper) for like state.
- No fixture-fetching hook needed beyond the existing `getUpcomingFixtures(resolveNow())` call, same as the drawer.

Since this page can never actually trigger a like/delete/edit (the button is disabled, delete/edit are structurally unreachable for a null uid), `onToggleLike`/`onDeletePost`/`onSaveEdit`/`onRefetch` passed into `RecentPostsPreview` can be inert no-op functions — no real Firestore write path needs to exist from this page. `onSelectParticipant` (from both the forum widget and, later, anywhere else a participant might be clickable in this composition) wires to the same selected-uid state that drives `ParticipantPopup`.

## 5. Testing

- New `LeagueTableList.test.tsx`: renders all 36 teams as single rows, shows dashes pre-results, shows real stats + qualification tick post-results, row click fires `onSelectTeam`.
- New `UpcomingMatchesPreview.test.tsx`: renders exactly 3 fixtures (or fewer/none if the season's near its end), row click is a no-op (fires nothing observable), matches the drawer's existing fixture-row test expectations for content (crest, short name, date/time).
- `RecentPostsPreview.test.tsx`: extend for `uid={null}` — like button renders `disabled`, distinct `aria-label`, no click-driven `onToggleLike` call.
- New `HomeLandingLoggedOutStarted.test.tsx`: all four widgets render; selecting a team opens `TeamPopup`; selecting a participant (via the forum widget or the standings table) opens `ParticipantPopup`; nothing throws when `results`/`entries` are empty (pre-any-result state, plausible early in league phase).
- `HomePage.test.tsx` (or wherever the state-routing switch is currently tested): extend to assert `loggedout_leaguephase` renders `HomeLandingLoggedOutStarted` instead of falling through to the shared placeholder skeleton, and that the other five still-unbuilt started states are unaffected.
- Manual/Playwright verification: dev server, DevPanel forced into `loggedout_leaguephase`, confirm all four columns render with real data, team-row click opens `TeamPopup`, a participant click (from forum or standings) opens `ParticipantPopup` with first-name-only (per the existing name-privacy work), forum like button is visibly inert, upcoming-fixture rows show a pointer cursor but do nothing on click.
