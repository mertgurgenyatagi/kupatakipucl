# Kupatakip UCL — Expansion Spec

Companion to `PAGEMAP_SPEC.md` (which it doesn't override — cross-reference it for anything not touched here). This document tracks the separate questionnaire series run on the `isolated-expansion` branch, started 2026-08-01, whose job is to decide and build out every still-open cell of `onboarding/pagetable.png`'s completion grid rather than revisit anything `PAGEMAP_SPEC.md` already settled. Updated after every round; nothing here should go stale.

Status key: **DECIDED** (locked in), **LEANING** (stated but soft), **OPEN** (not yet addressed).

---

## 1. Scope & Process — DECIDED (round 1)

- This series is independent of three other recent efforts — the 8-round "Logged-Out League Phase" questionnaire (wrapped 2026-08-01), the Special Lobby feature work, and the scaling/performance/security audit round. None of those roll into this grid-completion effort or count as answering it.
- Work proceeds **top-to-bottom through `pagetable.png`'s row order** — home, leaderboard, stats, forum, teampopup, participantpopup, matchup_popup, profile, initial predictions, quiz, chat — rather than jumping straight to the single biggest gap (the match popup) first.
- Within that order, **knockout-phase cells get priority** over other states whenever a row has open questions in more than one state column.
- Logged-out and logged-in experiences get **equal priority**, alternating rather than finishing one before the other.
- **Reuse existing widgets/components first**; a few small new ones are fine if genuinely needed — no hard "zero new components" rule.
- This pass aims for **rough-and-working, not fully polished** — a later dedicated polish pass is expected and fine.
- **Mobile layout is out of scope for this entire effort**, not merely deferred — ignore it entirely, no exceptions.
- ~10 questions per round, up to ~50 rounds total, confirmed as the right pace — don't rush convergence.

## 2. Profile Page — fact-check (round 1)

Confirmed **fully built and working**. This resolves a discrepancy with `onboarding/pagemap_completion.csv`, which had it scored 0/5 ("no page built, hooks exist") — Mert's direct answer takes precedence over that scorecard, which is now known stale on this point. (CSV corrected to 5/5 in round 5, once the same stale-scorecard pattern showed up twice more on Forum and Home — see §6, §11.)

## 3. Match Popup — direction (round 1), core content (round 2), layout (round 3) — DECIDED

`PAGEMAP_SPEC.md` §7 records that Mert rejected a plain teams+kickoff/score+scorers default as "too thin" without saying what "richer" meant. Round 1 resolved the top-level direction: **a prediction-accuracy angle — how everyone in the group did predicting this specific match.**

Round 2 pinned down the core content:
- **League phase:** show where everyone predicted each of this match's two teams to finish in the table (drawn from each participant's league-phase ranking submission).
- **Knockout phase:** show who predicted which of the two teams to progress past this tie.
- **Basic facts stay** — final score, kickoff time, scorers — displayed above the prediction content, not instead of it.

Round 3 pinned down the shape:
- **Scope:** one popup per whole knockout tie, **both legs shown together** — not one popup per individual leg.
- **League-phase layout:** two columns, one per team, each a list of participant names next to their predicted finishing position.
- **Knockout-phase layout:** two columns, one per team, each listing who picked that team to advance.
- **Real outcome display:** shown alongside predictions **only for knockout matches** (marking who got it right) — league-phase match popups stay prediction-only, no scoring overlay.
- **Name count:** show everyone (~30 participants), no cap or collapse.
- **Special lobby scoping (round 4):** the match popup's name list is filtered to **the viewer's own lobby** — not the whole tournament.
- **Unplayed ties (round 4):** tapping a tie that hasn't been played yet still opens the popup, showing predictions only (no result section since there isn't one yet).
- **Visual style:** a fresh look, not tied to Stats page's current (soon-to-change) styling.

## 4. Home Page — Knockout State (round 2–4, revised round 6) — DECIDED

- Bracket view style: **a classic bracket tree** — rounds side by side, lines connecting winners forward (not a plain grouped matchup list).
- Bracket is **clickable** — tapping a tie opens that tie's match popup, even for unplayed ties (shows predictions only, no result section).
- **Chat does not shrink**, stays full-size at every logged-in state.
- **Hero carousel is removed only once knockout starts** — it stays present through not-started, league-phase, and pre-knockout.
- **Round 6 revision — bracket location changed:** the bracket does **not** live on logged-in Home after all. Mert's call: *"we don't need the bracket in home for logged in visitors, it should be in the leaderboard, in place of team table. For logged out visitors, yes, there should be a bracket at home."* So:
  - **Logged-out Home at knockout:** shows the bracket (new — previously undecided for this state).
  - **Logged-in Home at knockout:** does **not** show the bracket. Chat stays. **Round 8 resolved the focal-point question:** there isn't a single centerpiece — logged-in Home at knockout uses the **exact same widget composition as logged-in league-phase Home**: forum widget, chat widget, upcoming-three-matches widget, hero carousel, mini standings widget, and a create-new-special-lobby button. Mert's words: *"This is all the same for logged in league phase home."*
  - **Unresolved tension flagged, not yet asked back:** round 8's widget list includes the hero carousel, but the line above (locked in round 2–4) says the hero carousel is removed once knockout starts. Not raising this as "you contradicted yourself" — just parking it here to re-ask cleanly as a plain multiple-choice pick in a future round: does the knockout widget set keep the hero carousel or drop it?
  - **Leaderboard page (knockout phase):** gains the bracket, **replacing the Team Table** in that spot. This reopens the Leaderboard row (§9), previously marked already-complete — see there for the follow-up questions this creates.
- **Round 7 clarification — same split applies to the league table, not just the bracket:** Mert's answer: *"For logged in, it's in leaderboard. For logged out, it's in home. Same goes for the league table."* So the pattern isn't specific to the bracket — it's the general Home/Leaderboard split for logged-out visitors (who never get a standalone Leaderboard page; it folds into Home, per §9's original round-3 note). Logged-out Home needs to carry **both** the league table/Team Table equivalent **and** the bracket at the appropriate phases, mirroring whatever logged-in visitors see on the separate Leaderboard page. Logged-in visitors keep using the actual Leaderboard page for both.

### Post-tournament state (round 10) — DECIDED

No dedicated "champion crowned" moment. Mert: *"Just leave it as is."* Once the final is played, Home (both login states) just stays on the knockout-state layout, showing the completed bracket with the final's result — no new state to build.

### Bracket byes (round 10) — DECIDED

Always a clean bracket (16 → 8 → 4 → 2). Mert: *"Always clean, no byes needed — don't build for it."* No bye-handling logic needed anywhere the bracket renders (Home or Leaderboard).

### Logged-out Home: bracket vs. league table (round 10 clarification)

Round 10 asked about the relative order of the bracket vs. other content on logged-out Home once knockout starts. Mert's answer clarifies the premise was slightly off — they're not both present to be ordered against each other: *"Before knockout starts, there's only the league table. After knockout starts, there's only the league bracket. (plus the other widgets etc)"* This confirms the same replace-not-coexist rule already decided for the Leaderboard page (§9 — "Team Table disappears fully, bracket takes its place") applies identically to logged-out Home's own league-table/bracket slot.

## 5. Stats Page — OUT OF SCOPE for this sweep (round 2)

Mert explicitly carved the Stats page out of `isolated-expansion`'s scope: *"count Stats in that 15 percent that we are not going to touch, because I hate how it is currently."* This covers the logged-out Home condensed stats-subset visual format and the knockout-phase "accuracy"/"agreement" widget definitions alike — none of it gets touched in this sweep. Stats page work (all states) is deferred to a separate, later, from-scratch pass. Do not pick this back up in future rounds unless Mert reopens it himself.

## 6. Forum — RESOLVED (round 3)

Mert's round 2 answer implied a separate, more-polished not-started Forum build existed and just needed swapping in. Code investigation (round 2) found no evidence of that — one Forum component, no phase-conditional branching, one continuous git history. Round 3 presented that finding back to him directly; his answer: **"Scorecard notes are probably outdated."**

Read as: there is no second build — the single existing `Forum.tsx` is what ships, and the `pagemap_completion.csv` "3/5 unstyled" note is the stale thing, not the code. **No Forum work is queued in this sweep** on the strength of this answer. If a real styling pass turns out to be wanted later, that's a separate ask, not part of isolated-expansion.

## 7. Participant Popup — Knockout Pick (round 2) — DECIDED

Once a knockout pick locks, it shows inside the participant popup as **a compact bracket-style pick** — who they chose each round — alongside the existing league prediction, not a plain list or a bare correct-picks count.

## 8. Grid Housekeeping — old rows retired (round 2) — DECIDED

The pagetable's three legacy rows without a direct spec home — **initial predictions, quiz, chat** — are retired. Their ground is already covered elsewhere: quiz at sign-up, league/knockout predictions on their own page + Home popup, chat as the already-built Home widget.

## 9. Leaderboard — ALREADY COMPLETE for league/pre-knockout (round 3); reopened for knockout (round 6)

Checked `onboarding/pagemap_completion.csv`: every applicable cell scored 5/5 "fully built, no extra work needed" (the not-started columns are N/A — leaderboard folds into Home before the tournament starts). That stands for league phase and pre-knockout.

**Round 6 reopened the knockout-phase cell**, as a consequence of §4's bracket-location revision: the knockout bracket now belongs on the Leaderboard page, **replacing the Team Table** there, rather than living on logged-in Home. This is new scope not covered by the round-3 "already complete" finding.

**Round 7 closed all three follow-up questions:**
- **Team Table vs. bracket:** Team Table disappears fully once knockout starts — the bracket takes its place, not a coexistence.
- **Audience:** the Leaderboard page (and its bracket) is a logged-in-only surface. Logged-out visitors never get a standalone Leaderboard page — per the original round-3 note, it folds into Home — so they see the bracket (and the league table) on Home instead, not on Leaderboard. See §4's round-7 clarification.
- **Component reuse:** the Leaderboard's bracket is the **exact same clickable component** decided in §4 (classic bracket tree, tap a tie to open its match popup) — no behavioral differences on this page.

This row is now fully decided again, knockout cell included.

## 10. Team Popup — ALREADY COMPLETE, no action needed (round 3)

Checked `onboarding/pagemap_completion.csv`: every cell across every state scores 5/5. Squad-data being a placeholder is explicitly noted as out of scope, not a gap. Nothing to decide or build here — this row is done.

## 11. Home Page — corrected scope (round 4), league-phase/pre-knockout content (round 5) — DECIDED

Round 4 opened by asking about supposed not-started gaps (welcome blurb, pre-tournament chat, a "reminder" widget, pre-start popups). Mert flagged this as wrong and stopped answering: *"I think you should really examine the codebase for what is built. I am stopping answering right now, because something is off here."* He was right — code investigation (`HomePage.tsx`, `HomeLandingLoggedOut.tsx`, `HomeLandingLoggedIn.tsx`, `LoggedInHome.tsx`) confirmed:

- **`loggedout_notstarted` and `loggedin_notstarted` are fully built** — real welcome copy (no placeholder text), chat widget, forum preview, hero carousel, and participant popup are all wired up and working. `onboarding/pagemap_completion.csv`'s old 2/5–4/5 scores for these two cells were stale (last touched 2026-07-24, before the actual build work landed 2026-07-25 through 2026-07-31) — **corrected to 5/5 in the CSV.** Same stale-scorecard pattern as the Forum row (§6).
- **The real, still-open gap was league-phase and pre-knockout Home** (both login states) — `HomePage.tsx` only special-cased the two not-started states, with everything else falling through to a placeholder skeleton.

Round 5 decided that content:

- **Layout approach:** reuse the existing not-started logged-in composition (chat, hero carousel, forum preview, participant popup) functionally, wired to real league data — **not** a from-scratch layout. Mert flagged that he wants this state to eventually look "very modern and pretty," but explicitly named that as part of the deferred 15% polish pass (§1's rough-now-polish-later rule) — so round 5's decisions are about *content*, not a visual redesign. Don't chase new visual styling here now.
- **Welcome message (logged out):** stays the same message throughout — no phase-specific rewrite needed.
- **"Sign-ups closed" notice (logged out):** a small **unclickable-but-hoverable button/badge next to the "Sign in with Google" button**, top right, reading "sign ups are closed" — not a banner or full-width notice.
- **"Match days remaining" (logged out):** counts down to **the end of the league phase**, not the next fixture or the final.
- **Predictions list (logged in, league phase):** a compact "leaderboard neighborhood" widget — 5 rows, the viewer centered, with the two participants ranked directly above and two directly below; the outer two rows fade out visually (not fully opaque/legible) to hint there's more above/below. An "Expand" button links out to the full Leaderboard page.
- **Hero carousel (league phase/pre-knockout):** no change from whatever it already shows not-started — same content/purpose carries through.
- **Popups on Home (league phase onward):** team/participant popups switch to showing real pick and standing data now that there's real tournament data to show, rather than whatever they show pre-start.
- **Pre-knockout:** identical to league phase, plus one addition — **a "submit predictions" button** (for the knockout bracket predictions).
- **"Nav shrink" note:** confirmed **not a real thing** — no such component exists and none is wanted. Drop it for good.
- **"Reminder" widget, reframed:** not a vague reminder — a concrete **"upcoming matches" widget**, separate from the hero carousel, showing the next three matches.

Round 6 closed out the remaining Home details:

- **Sign-ups badge at knockout:** stays exactly as-is, same "sign ups closed" wording — no change needed once knockout starts.
- **Countdown once league phase ends:** just removed, no replacement (not switched to counting down to the final).
- **Submit-predictions button (pre-knockout):** takes the user to a full, separate knockout-predictions page (not an inline popup).
- **Upcoming-matches widget cards:** match the same format as the existing "upcoming matches" element already present in Leaderboard's carousel — reuse that, don't design a new card format.
- **Predictions-list widget:** shows **both** position number and points for each of the five listed participants.
- **Bracket on logged-in vs. logged-out Home:** resolved by revising §4 — see there. Logged-out Home gets the bracket; logged-in Home does not (bracket moves to Leaderboard instead, reopening §9).

**Round 6 also reversed round 5's framing on the "modern and pretty" visual redesign.** Round 5 treated it as deferred 15%-polish, out of this round's scope. Mert's round 6 answer: *"Yeah let's dig into it visually too, why not. Gotta do the 15 percent eventually."* **This pulls the Home visual redesign into scope** — it is no longer deferred. A dedicated design-focused round (or several) should follow, using the design-intake pacing style (vague, playful, many small rounds — not a single round trying to resolve every visual choice, and never a round that puts a contradiction back in front of Mert to reconcile directly).

Mert also confirmed (round 6, catch-all check) that nothing else across the whole sweep so far feels unresolved, and explicitly wants the questionnaire process to continue at the same pace and in the same multiple-choice format ("Many many more questionnaires needed" / "Keep going exactly like this").

**Round 7 opened the design-intake track for the redesign, LEANING so far (not all locked in):**

- **Overall personality:** energetic and buzzing, like matchday itself — not minimal, not overly graphic.
- **Color energy:** stay close to the current palette rather than going brighter/louder.
- **Motion/animation:** nice-to-have, not a requirement — don't treat it as a must-ship item.
- **Design reference point:** nothing specific in mind — no borrowed-look target to chase.
- **Logged-in Home's knockout-state focal point** (the open question from §4/§9): still open. Mert's round 7 answer was non-committal ("bunch of cool stuff?") — needs a more concrete, options-based re-ask in a future round, not a repeat of the open-ended framing.
- **Hero carousel size question:** Mert asked back for clarification rather than answering — *"By hero carousel do you mean the window that shows pictures of mbappe and kane etc?"* Confirmed yes in round 7 wrap-up chat; the actual size question is carried to the next design round.
- **"Light refresh vs. bigger swing" question:** Mert asked back what the basis for comparison even is — *"Rethink from what? What is the basis?"* Needs to be re-asked with the basis made explicit (the current live Home page, as built) in a future round, not assumed answered.

**Round 9 closed the two remaining loose ends and moved into layout:**

- **Hero carousel at knockout — the tension resolved:** Mert's answer: *"Keep it — it stays in the lineup at knockout too."* This settles the round 2–4-vs-round 8 tension flagged above in favor of always-present — the earlier "removed once knockout starts" rule (§4) is now superseded for logged-in Home; the carousel stays through every state.
- **Typography, resolved:** bold for key numbers (scores, standings), calm everywhere else — a hybrid, not a flat pick either direction.
- **Widget arrangement:** a grid — several widgets visible side by side, not a single scrolling column.
- **Widget sizing:** none dominates — all widgets stay a similar size, no single featured/bigger one.
- **Widget boundaries:** distinct cards with visible edges, not a continuous blended flow.
- **Matchday energy, made concrete:** live indicators — pulsing dots, "LIVE" badges — carry the energetic feel, not countdowns or bolder accent color use.
- **Accent color usage:** sparingly — small highlights only, not leaned on generously.
- **Icons:** a few, used sparingly for emphasis, not a heavily iconographic look.
- **Top of page:** match/prediction data (upcoming matches, standings) sits closest to the top — not the hero carousel, despite it likely drawing the eye by default (round 8's "first thing seen" answer).
- **Closing emphasis, Mert's own words:** *"It's come up, but I should really emphasize it: very alive and more importantly very gridlike."* Treat "alive and gridlike" as the two-word summary of the whole design direction from here — grid of similarly-sized distinct cards, live/pulsing energy cues, sparing use of color and icons, bold numbers over calm text.
- **Round 8's density (spacious/airy) vs. round 9's grid-of-7-8-similar-widgets:** no longer a real contradiction — a grid can still read as spacious with enough padding/gutter between distinct cards. Not flagging this as unresolved anymore; it's a spacing/execution detail, not a decision gap.

**Round 8 closed most of the round 7 loose ends:**

- **Logged-in Home knockout focal point:** resolved — see §4's round 8 update. Same widget set as league phase, no single centerpiece (with one flagged carousel/knockout tension parked for a clean re-ask).
- **Hero carousel, confirmed premise wrong:** Mert's answer — *"IT'S ONLY PICTURES, NOTHING ELSE"* — the hero carousel is a static image carousel and never shows "live tournament stuff" that changes by phase (consistent with round 5's "same, no change" answer). The size question as originally framed doesn't apply; closing this thread rather than re-asking a third time — carousel size stays as-is unless Mert raises it again himself.
- **"Refresh vs. bigger swing," resolved as moot:** Mert's answer — *"I haven't built home at all past the not started phase. It's a whole new layout."* Confirmed in code: `HomePage.tsx` has no styled implementation for any started state, it falls straight through to a bare placeholder skeleton (`<TeamTable>` / `<PlayerList>` / `<LeaderboardTable>`, no layout work at all). There's nothing existing to "refresh" — the redesign is inherently a from-scratch build, not a choice between two options. Closed.
- **Density:** more spacious, less crowded preferred. (Noted without comment: this sits in some tension with the 7-8-widget composition from Q1/Q9 below — recording both answers as given, not asking Mert to reconcile them.)
- **Imagery:** player/team photos and badges stay about as prominent as they are now — no bigger visual role.
- **Corners & shapes:** mixed, depends on the element — no single rule.
- **Color/theme — a real correction on my end:** I framed a question around "keeping it light/bright like the rest of the site." Mert's answer: *"It's not actually light. The current website is unimaginably dark. You have a clear issue with reading the codebase, I think."* He's right — `src/styles/colors.css` sets `--color_main: #14120B` (near-black) as the page background sitewide. **Correction, closed without re-asking:** the redesigned Home should match the site's existing dark palette, not lighten it. No further design-intake question needed on this axis.
- **Typography energy:** no preference given ("idk") — still open, needs a future re-ask (or can be left to normal design judgment if it never comes up again).
- **First thing seen:** no single deliberate focal point — Mert expects 7-8 widgets with the hero carousel likely drawing the eye by default, not because it's designed to.
- **Priority check:** *"Plug gaps wherever necessary"* — no strict either/or preference, consistent with round 6/7's "keep mixing functional and design questions" pattern.

---

## 12. Existence & Edge-Case Gaps — round 10 — DECIDED

Per the round-10 mission-statement pivot (see below), these are functional edge cases surfaced by re-scanning the spec for undefined behavior, not design/vibe questions.

- **Missed knockout picks:** if someone didn't submit a pick before the deadline, it shows as blank/greyed out — "no pick made" — in the match and participant popups. Not counted as an automatic wrong pick, not excluded from the list.
- **"Leaderboard neighborhood" widget, top/bottom edge case:** if the viewer is ranked near #1 or the very bottom (fewer than two names available on one side), the 5-row window shifts so it's always exactly 5 rows total, with the viewer no longer perfectly centered — not a shorter list, not padded with empty placeholder rows.
- **Live-updating scores:** manual refresh is fine for this pass — no auto-updating/live-polling requirement for Home or Leaderboard during live matches. Consistent with §1's rough-now-polish-later principle; real-time updates can be a later enhancement if ever wanted.
- **Hero carousel content sourcing — confirmed already built, closed without further decision needed:** Mert: *"The carousel is built."* Verified in code (`src/leaderboard/HeroCarousel.tsx`, reused by `src/home/HomeHero.tsx`): a fixed, manually-curated `HERO_IMAGES` array of player photos, shuffled once per mount (Fisher–Yates), cross-fading every 7 seconds. It is static/manual by design already — not pulled from live team/player data — so there's nothing left to decide here.
- **New special-lobby button on Home:** just links into the already-built special-lobby flow. No new inline Home-specific version needed.
- **Widget grid sizing — refines round 9's layout answer:** cards are allowed to vary in height where content naturally differs (chat vs. a short upcoming-matches list) rather than being forced to match — Mert's framing: *"Make it like a jigsaw puzzle. It can be asymmetric but the grid should be gridded."* i.e. an asymmetric/masonry-feeling grid, but every card still snaps to shared grid lines — not free-floating, not forced-uniform. This sits alongside round 9's "grid, similarly-sized cards" answer as a refinement for organic content-length variance, not a contradiction — round 9 was about not designating one deliberately-bigger featured widget; this is about tolerating natural height differences between otherwise-equal widgets.
- **Catch-all:** nothing further flagged — *"Nothing comes to mind."*

## 13. Existence & Edge-Case Gaps — round 11

Round 11 dug directly into the code (result-entry mechanism, phase-transition control, leaderboard ranking, prediction lockout, multi-lobby membership, Forum/chat deletion) rather than re-scanning the spec text, hunting specifically for "does this even have a way to be run" gaps.

- **Match result entry — OPEN, skipped:** Mert skipped this one (*"Skip."*). Still undecided whether real match results need a proper admin form, stay a manual Firestore-console edit (current de facto approach per `firestore.rules`), or get built out of the existing dev-only `DevPanel.tsx` simulation tool. Not resolved — carry to a future round with a narrower/more concrete re-ask, same pattern as other skipped-then-re-asked questions in this series (e.g. round 7's carousel/basis clarifications).
- **Tournament phase switching — OPEN, skipped:** Also skipped. Still undecided whether phase transitions (`tournamentState`, currently "set directly via the Firebase console" per `firestore.rules`) need an in-app control, or stay manual.
- **Leaderboard tie-break — DECIDED:** ties are broken by number of correctly predicted teams, combining league-phase and knockout picks. If that's also tied, it's a genuine draw — shared rank stands, no further tiebreaker. This adds a real rule on top of the existing `assignRanks()` behavior (`src/leaderboard/ranking.ts`), which currently has no secondary sort.
- **Prediction lockout timing — DECIDED (confirmed unchanged):** whole-phase lockout, as already built, is correct. No per-match/per-tie lockout needed.
- **Multi-lobby active-lobby rule — DECIDED:** across Home, Leaderboard, and match popups, whichever special lobby was most recently created or joined is always the one shown. No lobby switcher UI needed.
- **Match popup name list, multi-lobby — DECIDED:** follows the same most-recent-lobby rule as above (Mert's answer: *"See above."*) — not a combined view across all of a viewer's lobbies.
- **Forum moderation — DECIDED:** self-delete-only (already built) is fine for launch — no admin tooling or report mechanism needed.
- **Chat moderation — DECIDED:** same as Forum — self-delete-only (already built) is fine.
- **Sign-in after signups close — DECIDED, corrected:** the split is signup vs. sign-in, not "sign-in vs. participation" as originally framed. Once signups close: **existing users can still sign in** (returning-user auth stays open); **new signups are disallowed** (first-time account creation is blocked). Matches the existing "sign ups are closed" badge from §11 — the badge is about blocking new accounts, not gating access for people who already have one.
- **Catch-all:** no new gap raised — Mert's answer was a process note (*"Keep the questionnaires coming."*), not a flagged item.

## 14. Existence & Edge-Case Gaps — round 12 — DECIDED, series closed

Round 12 re-asked the two round-11 skips with narrower framing, then ran one final area-by-area sweep across match popup, Home, Leaderboard, Forum/chat, Team/Participant popups, predictions/scoring rules, and Special Lobbies.

- **Match result entry — RESOLVED, explicitly out of scope:** Mert: *"Part of the 15 percent. It's going to be automated, but not yet."* Not an open decision after all — it's deliberately deferred alongside Stats (§5) and the visual polish pass, to be automated later. Manual Firestore-console editing (the current de facto approach, via the dev-only `DevPanel.tsx` simulator) stays as-is for this build push. No admin form to build now.
- **Tournament phase switching — RESOLVED, same answer:** *"Part of the 15 percent. It's going to be automated, but not yet."* Same treatment — manual console toggling of `tournamentState` stays as-is; an in-app switch is deferred, not built in this push.
- **Final area-by-area sweep — clean across the board:** match popup, Home (all states, both login types), Leaderboard, Forum & chat, Team/Participant popups, and predictions/scoring rules (points, ties, deadlines) all came back **"All good, nothing missing."**
- **Special lobbies (creation, membership, invites) — clean:** *"All good, nothing missing."* No open gaps found beyond the multi-lobby active-lobby rule already decided in §13.
- **Catch-all and series wrap-up:** *"Nothing left — this can be the last round."* Mert confirmed round 12 as the last round of the `isolated-expansion` questionnaire series.

## Mission statement (round 10)

Mert's framing, verbatim: *"Make it exist, then leave the perfecting to me."* Round 10 pivots the questionnaire series accordingly — no more vibe/polish questions (those are his to handle later); the remaining rounds hunt for genuine existence gaps: edge cases and undefined behavior that would block something from being built at all, not aesthetic preference.

## Open Questions (as of round 12) — NONE

- **Match result entry & phase switching — both RESOLVED (§14):** not gaps needing a build decision after all — Mert named both as deliberately deferred 15%-polish items (to be automated eventually, not now). Manual database edits stay the working method for this build push.
- Everything else remains DECIDED: all 11 pagetable rows, Home's visual redesign track (converged round 9), round 10's existence/edge-case sweep (§12), round 11's nine settled answers (§13), and round 12's final sweep and series wrap-up (§14).
- **Round 12 was confirmed by Mert as the last round of the `isolated-expansion` questionnaire series.** No further rounds are planned; the series is closed pending Mert's own decision to reopen it.

---

## Changelog

- **2026-08-01 (round 1):** Scope and process settled (see §1) — independent track, top-to-bottom row order with knockout-phase priority within each row, equal logged-out/logged-in priority, reuse-first widget policy, rough-now-polish-later, mobile fully out of scope, 10Q/round pace confirmed. Profile page fact-checked as fully built (see §2), correcting a stale scorecard entry. Match popup's "richer" direction resolved to a prediction-accuracy angle (see §3), concrete shape deferred to round 2.
- **2026-08-01 (round 2):** Match popup core content decided — league-phase predicted-finish-position view, knockout advance-pick view, basic facts retained above it (see §3). Home's knockout bracket decided as a classic bracket tree, plus chat/hero-carousel shrink (see §4). Stats page explicitly pulled out of this sweep's scope entirely, deferred to a later dedicated pass (see §5). Forum fact-check raised a real discrepancy between Mert's answer and the code/scorecard — not resolved, carried to round 3 (see §6). Participant popup's knockout-pick display decided as a compact bracket-style pick (see §7). Three legacy grid rows (initial predictions, quiz, chat) retired (see §8).
- **2026-08-01 (round 3):** Match popup layout fully decided — whole-tie scope, two-column layouts for both phases, knockout-only real-outcome overlay, show-everyone name policy (with an open "special lobby logic" caveat), fresh non-Stats styling (see §3). Bracket confirmed clickable, but carousel-shrink plan revised to a tentative full removal, chat no longer shrinks (see §4). Forum resolved — Mert now attributes the "unstyled" note to a stale scorecard rather than a missing swap-in; no Forum work queued (see §6). Participant popup's bracket pick decided as fully shown at once, not progressive (see §7). Leaderboard and Team Popup rows checked against the scorecard and found already complete — closed out with no work needed (see §9, §10). Home page identified as the largest remaining open row outside the match popup, with seven distinct content gaps queued for round 4 (see §11).
- **2026-08-01 (round 4):** Match popup's special-lobby scoping and unplayed-tie behavior decided (see §3). Home's knockout layout fully locked in — carousel removal is knockout-only, not full removal (see §4). Round 4's Home-page questions were built on a stale premise — Mert caught it and stopped answering, pointing at the actual codebase. Investigation confirmed both not-started Home states are fully built (not the placeholder gaps the old scorecard claimed); `pagemap_completion.csv`'s `home` row corrected, same stale-scorecard pattern as Forum (§6). The real open scope is the league-phase/pre-knockout Home experience, which is a literal, still-unbuilt placeholder in `HomePage.tsx` — reframed and carried to round 5 (see §11).
- **2026-08-01 (round 5):** Home's league-phase/pre-knockout content fully decided — reuse the existing widget composition with real data, sign-ups-closed as a small hover badge, days-remaining counts to league-phase end, a centered "leaderboard neighborhood" predictions-list widget, popups switch to real data, pre-knockout adds a submit-predictions button, a new upcoming-three-matches widget replaces the vague "reminder" idea, and the "nav shrink" note is confirmed dead (see §11). Mert explicitly named the "modern and pretty" visual redesign of this state as part of the deferred 15%, not this round's job. `pagemap_completion.csv`'s stale-scorecard pattern (previously Forum, then Home) also caught on the Profile row — corrected to 5/5 to match §2's round 1 finding, which had never been written back to the CSV. With this round, all 11 pagetable rows now have a decision behind every cell (see the Changelog's row coverage: Match Popup §3, Home §4/§11, Stats §5 out of scope, Forum §6, Participant Popup §7, three retired rows §8, Leaderboard §9, Team Popup §10, Profile §2) — round 6 closes the last few Home knockout-state loose ends and checks in on next steps.
- **2026-08-01 (round 6):** Home's remaining knockout-state details closed — sign-ups badge unchanged at knockout, countdown just disappears once league phase ends, submit-predictions button opens a full separate page, upcoming-matches widget reuses Leaderboard's existing card format, predictions-list widget shows both position and points (see §11). **Bigger revision:** Mert pulled the knockout bracket off logged-in Home entirely — it now belongs on the Leaderboard page instead, replacing Team Table there, while logged-out Home keeps a bracket of its own (see §4, revised). This reopens the Leaderboard row, previously closed as already-complete, with new follow-up questions (see §9). Mert also reversed round 5's "redesign is deferred" framing — the modern/pretty visual pass for post-league Home is now in scope and needs its own dedicated design-intake round(s) (see §11). Catch-all check found nothing else unresolved across the sweep so far; Mert confirmed he wants many more rounds, same multiple-choice format, no changes to pacing or process.
- **2026-08-01 (round 7):** Leaderboard's reopened knockout cell fully re-closed — Team Table disappears completely at knockout (bracket replaces it, no coexistence), the Leaderboard bracket is logged-in-only since logged-out visitors never get a standalone Leaderboard page, and it's the exact same clickable component as Home's (see §9). Mert also clarified the Home/Leaderboard split isn't bracket-specific — logged-out Home needs to carry the league table too, mirroring whatever logged-in visitors see on the real Leaderboard page (see §4). First design-intake round for Home's visual redesign ran: personality leans energetic/matchday-buzzy, palette stays close to current, motion is nice-to-have not required, no specific app/site reference in mind (see §11, LEANING). Two questions came back as Mert asking *us* for clarification instead of answering — which carousel counts as "hero" (confirmed: the Mbappe/Kane image carousel) and what the comparison basis is for "light refresh vs. bigger swing" (the current live Home page) — both need a concrete re-ask next round. Logged-in Home's knockout-state focal point (open since round 6) also came back non-committal and needs a multiple-choice re-ask rather than an open-ended one.
- **2026-08-01 (round 8):** Logged-in Home's knockout focal point resolved — same widget composition as league phase, no single centerpiece (see §4), though this surfaced an unflagged tension with the round 2–4 "hero carousel removed at knockout" decision, parked for a clean neutral re-ask rather than pointed out as a contradiction. The hero-carousel-size question turned out to rest on a wrong premise — the carousel is pure static imagery, never "live tournament stuff" — so it's closed without a real answer needed. The refresh-vs-rethink question resolved itself once Mert pointed out `HomePage.tsx` has no styled build past not-started at all — confirmed in code — so the redesign is inherently from-scratch, not a stylistic choice. Density (spacious), imagery (same prominence), and corners (mixed) all got clean answers. **Mert also caught a real mistake:** a question assumed the site's current look was light/bright; he corrected that the site is actually near-black dark themed, confirmed via `src/styles/colors.css`'s `--color_main: #14120B` — closed as "match the existing dark palette," and a reminder to verify visual facts from the codebase before framing future design questions, not assume them (see §11).
- **2026-08-01 (round 9):** The two remaining loose ends closed cleanly — hero carousel stays in logged-in Home's lineup at knockout too (superseding the round 2–4 removal rule), and typography resolved as bold numbers/calm text, a hybrid rather than a flat pick (see §11). Round 9 then moved past vibe-checking into actual layout: a grid arrangement of similarly-sized, distinct-edged cards, live/pulsing indicators (not countdowns or heavier color) carrying the "matchday energy," sparing use of both the accent color and icons, and match/prediction data (not the hero carousel) anchoring the top of the page. Mert's closing answer named the whole direction in two words — "very alive and very gridlike" — which now serves as the shorthand for this design track. With this round, **no open questions remain** — every pagetable row is functionally decided and Home's visual redesign has converged with no unresolved tensions. This is a natural checkpoint to assess readiness for actual implementation rather than continuing indefinitely with abstract questions.
- **2026-08-01 (round 10):** Pivoted per Mert's mission statement ("make it exist, then leave the perfecting to me") from design/vibe questions to existence/edge-case gaps. No dedicated post-tournament state — Home just stays on the knockout layout showing the final result (see §4). Missed knockout picks render blank/greyed "no pick made." Leaderboard-neighborhood widget shifts its window near the top/bottom of standings, always showing 5 rows. Bracket byes ruled out entirely — always a clean 16→8→4→2 bracket, don't build for odd counts (see §4). Live-updating explicitly deferred — manual refresh is fine for this pass, consistent with rough-now-polish-later. Logged-out Home's league table and bracket confirmed mutually exclusive, not stacked/simultaneous — same replace-not-coexist rule as Leaderboard (see §4, §9). Hero carousel confirmed already fully built as a static, manually-curated image set (verified directly against `HeroCarousel.tsx`, not just taken on Mert's word). New special-lobby button on Home just links into the existing flow, nothing new to build. Widget height mismatches resolved as "jigsaw puzzle" — asymmetric heights allowed as long as the grid stays gridded, refining rather than contradicting round 9's arrangement answer. Catch-all raised nothing further (see §12). Open Questions closed out with nothing currently pending.
- **2026-08-01 (round 11):** Sourced from a direct code check (dev-panel result simulation, console-only phase switching, `ranking.ts`'s tie-handling, phase-based lockout, multi-lobby membership caps, Forum/chat self-delete) rather than a spec re-scan, hunting for "does this even have a way to run" gaps (see §13). Two real ones surfaced and were explicitly skipped, not answered — whether match results need a real admin form (vs. staying a manual database edit or repurposing the dev panel) and whether phase transitions need an in-app control — both carried forward as the series' first genuinely OPEN items since round 9. Everything else closed cleanly: leaderboard ties break on number of correctly predicted teams (league + knockout combined), whole-phase prediction lockout confirmed correct as built, multi-lobby membership resolved to a single most-recently-joined "active" lobby (no switcher needed) governing both general display and the match popup's name list, Forum and chat both confirmed fine with self-delete-only (no moderation tooling needed). Catch-all raised no new gap — just a request to keep the series going. **Post-hoc correction:** the sign-in-after-signups-close answer was initially transcribed backwards — the real rule is existing users can still sign in, only new signups are blocked (see §13, corrected).
- **2026-08-01 (round 12, final):** Re-asked the two round-11 skips with narrower, smaller framing — both came back the same way: match result entry and phase switching are deliberately part of the deferred 15% (to be automated eventually, not built now), not undecided gaps that need resolving in this push (see §14). Ran one final area-by-area sweep — match popup, Home, Leaderboard, Forum/chat, Team/Participant popups, predictions/scoring rules, and Special Lobbies all came back clean, nothing missing. Catch-all confirmed no further gaps anywhere in the app. **Mert confirmed round 12 as the last round of the series** — Open Questions is now empty (see updated section above), and the `isolated-expansion` questionnaire series is closed.
