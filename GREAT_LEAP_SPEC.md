# The Great Leap — Spec

**Status:** Requirements are final. Nothing in this document is still open for discussion — it is the product of six rounds of Q&A with Mert (`questionnaires/questionnaire-01.md` through `questionnaire-06.md`, in this repo), captured here as flat, unambiguous statements instead of a Q&A transcript.

**What this document is not:** a plan. It does not break work into tasks, does not sequence anything, and does not prescribe file structure or code. That's the next session's job. This document exists so that job can start immediately, without re-deriving requirements or asking Mert anything covered here.

**How to use this document:** Read this alongside `PROJECT_STATE.md` (repo root), which is the authoritative description of the app *as it exists today*. This document only describes the **delta** — what's being added or changed. Where something here references an existing file, component, or convention, `PROJECT_STATE.md` and the code itself are the source of truth for its current shape; this document does not re-explain things PROJECT_STATE.md already covers.

If anything in this document conflicts with something you observe in the live code, the live code wins for *current state*, but this document still wins for *what to build* — flag the conflict rather than silently resolving it either way.

---

## 0. The one-sentence version

Build out the two things that are currently placeholder/missing for every "started" tournament phase — the Home page, and a second knockout-round prediction — while leaving a specific, named list of other gaps alone on purpose.

---

## 1. Scope and boundaries

### 1.1 In scope for this push

- The Home page's experience for all three "started" phases (`leaguephase`, `preknockout`, `knockout`), both logged in and logged out. Today this is two literal placeholder strings (`HomePage.tsx`'s `BLURB` map) — see PROJECT_STATE.md §6.1 and §13-D.
- A second, knockout-round prediction ("the bracket") — a real product promise that today has zero implementation behind it (PROJECT_STATE.md §6.2, §13-B).
- Whatever data-layer additions those two things require (a per-matchday rank-history record; a bracket-predictions data model; combined scoring).
- What happens to a brand-new (never-onboarded) account that shows up after the league phase has started.

### 1.2 Explicitly out of scope for this push ("the last 10%")

Confirmed multiple times, most recently in round 2 (D3: "Nope, looks good") — do not touch these, do not "improve them while you're in the area," and do not let their existence block anything above:

- **Real results data-fetching / any live football-data integration.** Results stay hand-edited, exactly as today.
- **The Stats page redesign.** It's getting "completely gutted and redesigned" later, separately. Don't touch `StatsPage.tsx` or its widgets, including the hardcoded "UCL Takımı" chart.
- **A full optimization pass.**
- **A full security pass** — including *not* tightening the two known-temporary open Firestore rules on `results` and `tournamentState` (PROJECT_STATE.md §8.1, §13-E). Leave them exactly as they are.
- **An automatic, calendar-driven phase timer.** `tournamentState/current`'s `phase` field stays a manually-edited value, same as today. Nothing you build should assume phase transitions happen on their own.
- **Admin tooling / an admin UI of any kind.** Results, phase, and (per §7 below) the new per-matchday marker all stay manual, hand-edited values — same trust model the rest of the app already uses for `results`/`tournamentState`.
- **A real hosting/deploy target.** Not this push's problem.
- **Mobile, in its entirety.** This is a desktop-only build. Nothing in this document has a mobile requirement, and none should be inferred. Build everything below assuming the existing desktop-only "fixed-viewport app shell" convention (PROJECT_STATE.md §9) — don't add responsive breakpoints for any of it.
- **Real team crests.** The current random-but-stable crest mismatch (PROJECT_STATE.md §9, §13-B) stays exactly as-is. Mert will swap in real crests by hand once the real 2026/27 teams are confirmed (expected mid-August 2026) — that swap is not part of this work and needs no code changes to prepare for.

### 1.3 Explicitly *not* excluded (don't assume these are dead)

- `src/pages/PlaceholderPage.tsx`, `src/predictions/SubmissionCounter.tsx`, `src/leaderboard/LeaderboardCells.tsx`, and the unused `team_logos/` asset directory (PROJECT_STATE.md §13-C) — Mert said to **keep them for now**. Do not delete them as part of this work, even though they're genuinely dead code.
- The two orphaned "tuner" prop plumbing points — `TeamPopup`'s and the stats widgets' `tuning` props, which reference `TeamPopupTuner`/`StatsPageTuner` components that no longer exist anywhere in the repo (PROJECT_STATE.md §13-C). Mert confirmed these are genuinely dead ("I used some tuners but they were deleted afterwards. You can rip the plumbing out.") — safe to remove the prop plumbing itself if you touch either of those two files for other reasons in this push. Not urgent enough to justify a dedicated task on its own.

---

## 2. Started-phase Home — signed in

Replaces the current shared skeleton (`BLURB[state]` + `TeamTable` + `PlayerList` + `LeaderboardTable`, `HomePage.tsx`) for `loggedin_leaguephase`, `loggedin_preknockout`, and `loggedin_knockout`.

### 2.1 Composition

Six widgets, arranged as a **jigsaw of differently-sized panels** — explicitly *not* an even grid where every cell gets equal space. Mert delegated the exact pixel layout ("your problem") but gave firm sizing constraints that any layout must respect:

- The **league table** widget is the existing `TeamTable` component, reused exactly as it renders today, unresized and unmodified. Treat its size as fixed/given, and lay the rest of the grid out around it — don't shrink or reflow it to fit a cell.
- The **rank-history graph** widget is **wide and short** — a horizontal strip, not a square or tall panel.
- The remaining four (**chat, forum, mini-leaderboard, upcoming matches**) are **roughly equal in size** to each other.

Beyond those constraints, the exact arrangement (rows/columns, which corner holds what) is left to your judgment. This mirrors the existing `HomeLandingLoggedIn.tsx` CELL_ROW pattern (a `grid-cols-[...]` row of `Frame`s) — reusing that general construction approach is reasonable, but the column proportions and row structure need to change to fit six pieces of three different size classes instead of four equal ones.

### 2.2 Chat widget

**Identical** to the chat cell already on the not-started logged-in home (`HomeLandingLoggedIn.tsx`'s fourth cell): the same `ChatRoom` component, the same lobby switcher (global chat + up to 3 Special Lobbies), the same online-count badge. No behavior changes for the started phases. Reuse the existing component/wiring directly.

### 2.3 Forum widget

**Identical** to the forum cell already on the not-started logged-in home: `RecentPostsPreview` showing the 3 most recent posts, plus `ForumPreviewFooter`. No changes for started phases — do not surface "posts about today's matches" or any other phase-aware filtering; Mert explicitly said "same."

### 2.4 League table widget

The real, live 36-team standings — the same `TeamTable` component already used on the Leaderboard page (`src/leaderboard/TeamTable.tsx`), passed the same `results` data. Clicking a team row opens the same `TeamPopup` it does today (no new popup, no different click behavior).

**Phase-dependent behavior (this is the one widget that changes across phases):**
- `leaguephase`: shows the live table, exactly as `TeamTable` renders it today.
- `preknockout`: shows the same table, now just naturally frozen at the final league-phase standings (no code needs to detect "frozen" — once league-phase results stop being edited, the table simply stops changing on its own; no special-casing required).
- `knockout`: this widget is **replaced** by the bracket-view widget (§5.4). Nothing else in the six-widget grid changes when this swap happens — chat, forum, mini-leaderboard, upcoming matches, and the rank graph all stay exactly as they are.

### 2.5 Mini-leaderboard widget

Shows exactly **5 rows**, always. A row contains: avatar, full name, points, rank number — all four every time, no partial rows.

- **Not** required to center the current user in the middle of the 5. The original idea (2 above, 2 below) was explicitly walked back — the real requirement is just "always show 5 people," with the window sliding near the top/bottom of the full leaderboard so it never needs fewer than 5 (e.g., near rank #1, show ranks 1–5; near the bottom, show the last 5).
- The current user's own row **must still be visually distinguished** somehow (highlight, border, bold — implementer's choice) even when they aren't centered in the list, so they can find themselves at a glance.
- **Static.** No movement indicators (no up/down arrows, no "+2 this week"). Just the current snapshot.
- Ranking here is the **combined** score (§6) once that concept exists — this widget always reflects the same points/rank as the main Leaderboard page, at whatever stage of the season it is.

### 2.6 Upcoming matches widget

Same content as the existing `UpcomingMatchesDrawer` (`src/leaderboard/UpcomingMatchesDrawer.tsx`) on the Leaderboard page — the next fixtures, same row treatment (crest, short code, date/time, team's current table position on either side) — but shown **3 at a time**, and **always visible inline**, not behind a collapsible drawer. No other content or behavioral differences from the drawer version were requested — reuse its fixture-row rendering rather than rebuilding it from scratch.

### 2.7 Rank-history graph widget

A single line, plotting the current user's **rank** (not points) over time.

- **X-axis unit: per matchday.** One data point per matchday, not per day/week/real-time.
- **Keeps going continuously through the knockout rounds** — this is not a league-phase-only chart that resets or stops. The same line continues once bracket scoring starts contributing to the combined score (§6), since a big bracket result can swing the line sharply.
- There should be a **small, deliberately subtle visual mark** on the graph at the point where scoring changes from league-only to league+bracket combined (§6.2 in round 6: "There is a visual mark, but not massive.") — a light tick/annotation, not a prominent callout.
- **Hover interaction is wanted**: hovering a point should reveal the exact rank at that matchday. This was called "would be nice," i.e. wanted, but not an immovable requirement if it turns out to be disproportionately costly — reasonable to treat as should-have rather than must-have if a real tradeoff comes up.
- No other requirements were given for its visual treatment (colors, exact chart library/approach) — use the existing design tokens and conventions (`src/styles/colors.css`, the "cotton" motion system) rather than introducing a new visual language.

### 2.8 What doesn't exist yet and needs to be added to support this

There is currently **no record of anyone's rank at a past point in time** — `src/leaderboard/rankHistory.ts` explicitly only replays the dev-only `devMatches` collection and says outright there's no equivalent for real production data (PROJECT_STATE.md §6.3). Both the mini-leaderboard's "current" rank and the rank-history graph's per-matchday points need this to be real for production data, not just the dev panel. See §7.1 for the requirement this creates.

---

## 3. Started-phase Home — signed out

Replaces the same shared skeleton for `loggedout_leaguephase`, `loggedout_preknockout`, and `loggedout_knockout`.

- Should be **"almost a copy of the logged-in league leaderboard page"** — i.e., reuse the existing Leaderboard page's composition (`LeaderboardPage.tsx`: `TeamTable` + `LeaderboardHero` + `LeaderboardTable`, widened to 1400px) rather than inventing a new layout. This is *not* the six-widget grid from §2 — that's a logged-in-only composition (it includes chat and lobby-scoped content that has no meaning for a signed-out visitor).
- **Signing in stays available at all times** — the header's sign-in affordance never disappears once the tournament starts. Only account **creation/onboarding** (§4) is what actually closes.
- Once the bracket exists, a signed-out visitor **can see the bracket too** (round 6, C1) — i.e., whatever public-facing bracket view exists for this composition should not be gated behind login. It doesn't need to be personalized (no "your picks" framing for a signed-out visitor), just visible.

---

## 4. Registration closing / new-account handling

This is the one area Mert delegated outright ("Your call," twice, round 4) rather than deciding himself. The following is the **recommended default** — build it this way unless something concrete argues otherwise during implementation, and flag the decision back to Mert once it's built so he can veto it if it's not what he pictured.

- **Terminology, confirmed by Mert directly (round 3):** "signing up" = creating a brand-new account (going through onboarding — photo, name, the quiz). "Signing in" = logging into an account that already has a profile. Signing in never closes. Signing up is what closes once the league phase starts.
- **Recommended behavior:** once the tournament phase is no longer `notstarted`, a Google account that has never been through onboarding before (no `profiles/{uid}` doc, no `surveyResponses/{uid}` doc — i.e. exactly the condition `ProfileGate.tsx` currently uses to decide whether to show `SignupFlow`) should **not** be allowed to start onboarding. Instead of rendering `SignupFlow`, show a message explaining that registration is closed, and let them through to the (spectator) home experience — the same one a signed-out visitor sees, or a near-identical logged-in-but-no-profile variant, implementer's judgment.
- This only affects genuinely new accounts. It must **not** affect any account that already has a profile — including one that has a profile but somehow never submitted a league prediction (see §6.3's edge case note, which Mert says won't happen in practice but shouldn't crash if it somehow does).

---

## 5. The knockout bracket

### 5.1 Format

- Covers **Round of 16 → Quarter-finals → Semi-finals → Final**. 16 teams, 15 total matchups (8 + 4 + 2 + 1).
- The real UEFA play-off round (the round that trims 24 group-stage survivors down to 16) is **explicitly not modeled**. The bracket only exists once the true last-16 is known — nothing in the app predicts or displays the play-off round itself.
- Each matchup is a **single tie**: no legs, no away-goals, no aggregate score, no penalty-shootout modeling. A user predicts **only who advances**, nothing more granular (no scorelines).

### 5.2 Submission flow and timing

- **One submission, one time, no revisions.** Once submitted, it's locked — same "one-time door" philosophy as the existing league Predictions flow, not something a user can come back and re-edit.
- **The whole 15-matchup tree is filled in at once**, in a single sitting — not a round-by-round reveal where quarter-final slots only appear after round-of-16 picks are locked in. The user sees and fills the entire bracket in one screen/flow.
- **Interaction model:** a real, visual bracket — picture two columns of 8 teams each (left and right), each user click on a team advances it into the next slot inward, cascading toward a final matchup in the middle. This "8 left / 8 right converging to the center" treatment is specifically for the **full bracket submission page** — it does not describe the home-widget version (§5.4) or any other surface, which has its own, much more compact treatment.
- **Entry point:** lives in the same place, conceptually, as the league prediction — reuses the existing "one-time door" pattern and the same full-viewport, narrative-beat intro sequence (the fading text screens, the "cotton" transition curve) that today's `/predictions` flow (`SignupFlow`'s beat machinery) opens with, before landing on the actual bracket-filling screen.
- **Timing window:** opens the moment the real-world UEFA play-off round concludes (i.e., once the true round-of-16 field is set/drawn) and closes right before the first round-of-16 match kicks off. This maps onto the existing `preknockout` → `knockout` phase boundary (PROJECT_STATE.md's `TournamentPhase` enum) — the window is open during `preknockout` and closed once `knockout` begins.
- **Eligibility:** open to **any signed-in user at that point**, regardless of whether they ever submitted a league-phase prediction. A league prediction on file is **not** a prerequisite for accessing the bracket door.
- **Home CTA:** once the bracket window opens, show a banner/call-to-action on the signed-in home pointing at it — the same pattern as the existing "Tahminini Yap" CTA that appears pre-submission during the league phase.

### 5.3 Scoring

Per team, per stage reached, **and these stack**:

| Stage the team is correctly predicted to reach | Points |
|---|---|
| Quarter-finals | 3 |
| Semi-finals | 4 |
| Final | 5 |
| Champion | 6 |

Stacking means: if a user's bracket correctly has a team winning the whole thing, that one pick is worth **3 + 4 + 5 + 6 = 18 points** (correctly reaching champion implies correctly reaching every earlier stage too, since it's a single-elimination cascade — there's no way to correctly predict a team as champion without also having them correctly reach QF/SF/Final in the same bracket). A team correctly predicted only as far as the semis (but wrongly predicted beyond that) scores 3 + 4 = 7.

This is a **combined addition to a user's total score**, not a separate bracket-only leaderboard — see §6.

### 5.4 Home widget representation

A **small, plain bracket-tree widget** (Mert: "it's just a bracket, mate") — not a list, not a summary sentence, an actual (compact) bracket visual. Rules for what it shows, confirmed as the **same general rule for every stage** (round 6, D1):

- Shows the **current live round at full visual strength**.
- Shows the **immediately adjacent round(s)** (whichever exist — before, after, or both) **faded**, partially visible at the edge, rather than hidden outright.
- Anything **further out than one round away is not rendered at all.**

Worked examples Mert gave directly:
- During the round of 16: RO16 matches shown fully, the quarter-final column visible at the edge but faded/"vertically cut."
- During the semis: quarters (already past) fade on the left, the final (not yet reached) fades on the right, semis themselves shown fully in the center.
- (By the stated general rule, the quarter-finals stage should follow the same pattern: quarters shown fully, RO16's resolved edge fading on one side, semis' not-yet-reached edge fading on the other. The final, having nothing after it, would just show fully with the semis fading on one side and nothing faded on the other.)

Interaction: **team names/crests inside the widget are clickable** (opens the same `TeamPopup` as everywhere else in the app). **Matchup slots themselves are not clickable.** There is **no separate expanded/bigger bracket view** anywhere else — this compact home widget, plus the read-only Profile view (§5.5), are the only two places a bracket is ever displayed after submission.

### 5.5 Profile representation

Once the bracket exists, the Profile page shows a user's own bracket picks **read-only, annotated with what everyone else predicted** — the same treatment the Profile page already gives a locked-in league prediction today (PROJECT_STATE.md §6.8: annotated with everyone's average predicted position per team). Mert explicitly left the exact mechanics of "annotated with what everyone else predicted" for a bracket (as opposed to a 36-team ranking) to the implementer's judgment — there is no existing bracket-shaped precedent to copy verbatim, so this needs a genuinely new treatment, just one that rhymes with the existing league-prediction annotation in spirit (surfacing group consensus, not just the individual's own picks in isolation).

---

## 6. Combined scoring and leaderboard

- Once the bracket exists, a user's **overall score/rank combines their league-phase score and their bracket score into one number** — the same number shown on the main Leaderboard page, the mini-leaderboard widget (§2.5), and used by the rank-history graph (§2.7). There is **no separate bracket-only leaderboard.**
- This means the scoring logic — currently `src/leaderboard/scoring.ts`'s `computeScore` (client) and its hand-duplicated copy in `functions/leaderboard/index.js` (PROJECT_STATE.md §7, §11) — needs to grow a second scoring path (bracket stage-reached points, §5.3) that adds into the same total, in **both** places, keeping the existing hand-sync convention (there is no shared runtime between the TS client and the JS Cloud Function today, and this push is not the place to introduce one — see §1.2's no-optimization-pass boundary).
- The rank-history graph's small visual mark at the scoring handoff point (§2.7) is the only place the UI should call attention to "this is where bracket points started counting" — the Leaderboard page and mini-leaderboard just show the one combined number, with no separate breakdown required.

---

## 7. New data this requires

Two genuinely new pieces of data-model surface are needed. Mert delegated the exact mechanics of both ("leave it to you") — the following are requirements on what they must accomplish, plus a reasonable recommended shape, not a mandate on exact collection names or field names.

### 7.1 Per-matchday rank snapshots

**Requirement:** something must record every participant's rank as of each completed matchday, for real production data — not just the dev-panel's replay-of-`devMatches` mechanism, which explicitly doesn't work for production (PROJECT_STATE.md §6.3). This feeds both §2.5 (mini-leaderboard's "current" rank, though that could just read the live leaderboard directly) and, essentially, §2.7 (the rank-history graph, which genuinely cannot exist without point-in-time history).

**The real constraint to design around:** results are hand-edited team-by-team directly into Firestore, with no existing signal for "matchday N is now fully entered." Any snapshot mechanism needs some way to know when a matchday is complete, given that no admin UI is in scope for this push (§1.2).

**Recommended default:** add one more manually-edited field alongside the existing manual `tournamentState/current` document (which already holds `phase`) — e.g. a `currentMatchday` number — that Mert bumps by hand once he's finished entering that matchday's results, the same manual-editing convention already established for `phase` and `results`. Extend the existing `functions/leaderboard` Cloud Function (which already recomputes on every `results/{teamId}` write) to also upsert a snapshot document keyed by the current matchday number, so repeated edits within the same matchday just update that matchday's snapshot in place, and bumping `currentMatchday` freezes the previous one and starts a new one. This keeps the existing "no admin UI, hand-edited, trust the friend group" posture (§1.2) rather than introducing new tooling.

### 7.2 Bracket predictions

**Requirement:** a place to store each user's one-time bracket submission (their pick for all 15 matchups), separately from the existing `predictions/{uid}` (league-phase) collection, since a user can have a bracket pick with or without a league pick (§5.2's eligibility rule) and the two are conceptually different shapes (a full ordering of 36 teams vs. a set of per-matchup winners). Exact collection/document shape is an implementation decision — no specific structure was dictated.

### 7.3 Edge cases to handle without over-building for them

Mert was explicit that these should be handled gracefully (no crashes, no broken UI) but **not** specially designed around, because he's confident they won't occur in practice:

- A profile that exists but never submitted a league prediction, once the tournament has started.
- The scoring/ranking functions should not throw or produce garbage for a participant with zero or partial data — but no dedicated UI state, copy, or feature work should be spent making this a polished experience.

---

## 8. Cross-reference: where this plugs into the existing app

For orientation only — not a file-by-file task list. Consult `PROJECT_STATE.md` and the code itself for current shape/behavior of anything named here.

- `src/pages/HomePage.tsx` — currently branches on `VisibilityState`; the shared `BLURB`-based skeleton branch is what §2/§3 replace for the six started states.
- `src/home/HomeLandingLoggedIn.tsx` / `LoggedInHome.tsx` — the not-started logged-in home; its cell-grid construction (`Frame`-per-cell, `CELL_ROW` grid-template pattern) and its chat/forum wiring are the direct reuse targets for §2.2/§2.3.
- `src/home/HomeLandingLoggedOut.tsx` — the not-started logged-out home; **not** the reuse target for §3 (that's `LeaderboardPage.tsx`'s composition instead).
- `src/pages/LeaderboardPage.tsx` — the reuse target for §3, and the current home of `TeamTable` (§2.4), `UpcomingMatchesDrawer` (§2.6's content source), and `TeamPopup`.
- `src/leaderboard/rankHistory.ts` — the existing dev-only rank-replay logic; explicitly not sufficient for §2.7/§7.1's production requirement, per its own code comments.
- `src/leaderboard/scoring.ts` and `functions/leaderboard/index.js` — the two hand-synced scoring implementations that §6 requires extending in parallel.
- `src/state/pageAccess.ts`, `src/state/visibilityState.ts`, `src/tournament/tournamentPhase.ts` — the existing phase/visibility machinery (`notstarted | leaguephase | preknockout | knockout`, crossed with logged-in/out) that all of the above needs to key off of. No changes to this machinery are required by anything in this document.
- `src/profile/ProfileGate.tsx` — the exact gate (`!profile || !survey`) that §4's new-account handling needs to add a phase check to.
- `src/predictions/` (`TeamRanker.tsx`, `IntroBeat.tsx`, `ScoringExampleDiagram.tsx`, `predictionBoundary.ts`) — the existing league-prediction "one-time door" flow whose pattern (not necessarily whose code) §5.2 reuses for the bracket.
- `firestore.rules` — will need new match blocks for whatever collections §7.1/§7.2 introduce; the *existing* `results`/`tournamentState` rules are explicitly not to be tightened as part of this work (§1.2).

---

## 9. Source material

This spec was synthesized from `questionnaires/questionnaire-01.md` through `questionnaire-06.md` in this repo (six rounds of free-text Q&A with Mert, run 2026-08-01). Those files remain as the raw record if any statement here needs to be traced back to its original wording.
