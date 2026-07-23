# Kupatakip UCL — Pagemap Spec

Companion to `SPEC.md`, which covers the original pre-build design (mission, scoring, hosting, moderation, design direction — all still authoritative where this document doesn't touch it). `SPEC.md` had marked its questionnaire phase "formally concluded" as of its Round 8 — this document tracks the *separate*, later questionnaire series (started 2026-07-24) that reopened and restructured several sections it had already called DECIDED, driven by filling in `onboarding/pagemap.xlsx`. Updated after every pagemap round; nothing here should go stale.

Status key: **DECIDED** (locked in), **LEANING** (stated but soft), **OPEN** (not yet addressed).

---

## 1. Tournament Phase Model — DECIDED

Four real phases, replacing the old plain pre/post-Sept-8 split: **notstarted → leaguephase → preknockout → knockout**.

Manually admin-set, not calendar-computed — Mert flips it by hand once each transition genuinely happens in real life (no admin UI; same "edit Firestore directly" convention as `SPEC.md` §7b). Lives in `tournamentState/current` (Firestore, public read, any-signed-in-user write), defaulting to `notstarted` until ever set. `SPEC.md` §2's hard-dates table still holds as the *target* dates for when Mert flips it — it's just no longer an automatic clock.

Implemented same day as decided: `VisibilityState`/`TournamentPhase`/`pageAccess.ts`/`useTournamentPhase.ts` rewritten, old `NST_NLI`-style codes replaced with `pagemap.xlsx`'s own 8 literal state names (`loggedout_notstarted` … `loggedin_knockout`).

## 2. Access Rules — DECIDED

- **Forum:** logged-in only, every phase. Reverses `SPEC.md` §8's "started + not logged in → forum open" line — closed to logged-out visitors even once started, no exceptions.
- **Leaderboard:** blocked entirely pre-start. Once started: for **logged-in** users it remains a real, separate page (unchanged) — same table format across all three started phases (no knockout-specific columns). Confirmed emphatically in round 8 ("Oh hell yeah, no question") after Claude's round-7 judgment call. For **logged-out** visitors it's no longer a destination at all — see §3, its content folds straight into Home instead (round 7).
- **Stats:** the full Stats page stays logged-in + started only (any of the three started phases), unchanged. A separate **lightweight stats subset now shows on Home for logged-out visitors too**, once started — a condensed version of the top-scorer/top-assister/top-rating widgets specifically (round 8, resolves round 7's open question).
- **Predictions / Chat:** no longer standalone gated pages — see §4/§5.
- **Profile:** logged-in only; always reachable once logged in regardless of phase — only its *contents* vary by phase, not access to the page. Reached via clicking your own avatar/name, not a main-nav link (round 6 — see §6).
- **Sign-up itself:** phase-gated too, not just a page. Only possible during `notstarted` — once league phase starts, sign-up "completely turns off" (Mert's words), closed permanently. Extends `SPEC.md` §3's "round-2 sign-up closed to round-1 participants" one step further: *any* sign-up closes at kickoff, not only round-2 joining.
- Team popup and participant popup were found to have **no code-level access gate at all** prior to round 1 of this series. Participant popup's actual rule (logged-in + phase ≠ notstarted) was established there for the first time, not carried over from anywhere — and stays exactly that, unchanged by round 7's logged-out restructure (see §7 for how that tension actually resolves).
- **Logged-out visitors never see any page but Home, at any phase, full stop** (round 7 — the resolution to the tension flagged since round 1). No separate Leaderboard/Stats/Forum destinations for them; Forum stays logged-in-only anyway (see above). Team popup and matchup popup remain gate-free and open the same for everyone, logged in or not.

## 3. Home Page — DECIDED (expanded)

**Logged-in Home:**
- Absorbs Chat as an embedded widget: **full scrollable chat history**, right on Home — not a condensed preview. Same access rule as the old Chat page (logged-in only, every phase).
- Gains a "submit your league prediction" button, and (once relevant) a "submit your knockout prediction" button — each opens a popup for first-time submission. The league-prediction popup contains **just the drag-and-drop ranker, nothing else bundled in** (round 6 — the quiz already happens separately at sign-up).
- Gains a **single, quiet, general reminder indicator** near the user's own avatar/name — not a per-button badge, not a loud banner — covering anything pending across either prediction (round 6, reversing an earlier per-button lean).
- Keeps the rolling-image hero carousel (currently on the Leaderboard page) once it's built for Home too — confirmed still belongs there (round 6).
- Asked directly whether piling all this onto one page (existing content + 2 prediction buttons + reminder + full chat + hero carousel) feels like too much: **"Feels right, it's all fine on Home."**
- **Once knockout itself begins, the league standings table is replaced by a bracket view** (round 8) — not just a button swap as earlier phrased; the compact team table genuinely changes shape for the knockout phase specifically.

**Logged-out Home — now the *only* page logged-out visitors ever see, at every phase (round 7, major restructure):**
- Once the tournament's started, Home for a logged-out visitor absorbs **all** of Leaderboard's content — full team table plus full participant standings, not a lighter summary (round 7 was explicit: "everything").
- Also gains a **lightweight stats subset** — a condensed version of the top-scorer/top-assister/top-rating widgets (round 8).
- Predictions display as a **plain inline list right on Home** — no popup, no interactivity — once they've locked, showing **every** participant (not a trimmed top-N slice) with **first name + last initial only** (not full real names — round 8, a privacy call Mert hadn't considered until asked) next to each pick. This is *not* the same component as the participant popup (which stays logged-in-only, full names); it's a separate, simpler, read-only display that happens to live on Home. This is how the long-flagged tension resolves: the knockout pick (and league prediction) really is visible to logged-out visitors once locked, just via this inline list rather than by loosening the popup's login gate.
- Team popup and matchup popup both still open with **no access gate**, exactly as for logged-in users (round 7, Q6/Q7) — clicking a team or a match works the same regardless of login state.
- Before the tournament starts, logged-out Home is unchanged from the original design: mission blurb, sign-up countdown, static 0-pt team list, player list (no predictions), no chat/forum.

## 4. Profile Page — DECIDED (new)

Real, reachable page — not one-time-only. Logged-in users can revisit anytime.

Contents, confirmed exhaustive (explicitly "No" to anything beyond these):
- Profile picture — editable anytime (unchanged from `SPEC.md` §4).
- First + last name — **reverses `SPEC.md` §4**: name is locked forever, never editable, not "editable any time after sign-up" as originally decided.
- The league prediction — always viewable, editable subject to its own lock schedule (§5b).
- The knockout prediction — viewable once it exists, editable subject to its own lock schedule (§5c).

This is where a prediction gets *revised* after its first submission. First submission itself happens via the Home-triggered popup (§3), not here. Revising still shows the existing "are you sure you want to overwrite this?" confirmation, unchanged by the move off the old dedicated page (round 6). The locked (read-only) view is **the same ranked list as the editable view, just not clickable, no extra caption** — Mert confirmed Claude's proposed default as-is (round 8, resolving the earlier "idk").

Reached by clicking your own avatar/name — not a link in the main nav bar (round 6).

## 5. Predictions — DECIDED (major restructure, supersedes `SPEC.md` §5)

Two entirely independent predictions now, not one bundled flow:

**a. Quiz (background survey)** — `SPEC.md` §5 step 1's questionnaire (age, football knowledge, Messi/Ronaldo, Süper Lig team, etc.). Moved to be its **own required step immediately after** the name/photo sign-up screen — reverses §5's original "not asked at sign-up, triggered later." Mandatory: can't reach Home for the first time without finishing it. Still one-time-only and never revisable (unchanged).

**b. League prediction** (the alphabetical team-ranking drag-and-drop, `SPEC.md` §5 steps 3–4) — decoupled from the quiz, no longer a dedicated `/predictions` page. Submitted via a Home-triggered popup, anytime between sign-up and kickoff — does *not* have to happen at sign-up itself. **Locks permanently once league phase starts** — no reopening, ever, after that. The existing overwrite-confirmation UX (§5 step 4) still applies to edits made before the lock.

**c. Knockout prediction** (new — full bracket, picking the winner of every match RO16 through the final, matching `SPEC.md` §3's round-2 scoring mechanic). Stored **entirely separately** from the league prediction — a participant could in principle have one without the other. Submitted via its own Home-triggered popup, **editable only during pre-knockout** — locked during league phase (doesn't apply yet) and locked again once knockout itself begins. Missing this window is permanent, same as the league prediction — no catch-up.

**Visibility rule, same for both:** while a prediction is still open for submission/revision, *nobody* — not even other logged-in participants — can see it. Once it locks, every logged-in user can see everyone's. (Logged-out visibility for the locked league prediction, per `SPEC.md` §8's "started + not logged in" row, isn't reversed here — just not re-confirmed this round.)

**Explicitly out of scope to over-build:** someone who somehow signs up yet still misses a prediction window is treated by Mert as a near-impossible edge case he'll handle personally over WhatsApp — extends `SPEC.md` §3's existing "chase stragglers" stance to both prediction types. Do not over-engineer graceful-degradation UI for it.

## 6. Removed Pages / Nav — DECIDED

- `/predictions` route: **deleted outright**, replaced by §5's popup + Profile flow.
- `/chat` route: **deleted outright**, replaced by §3's Home widget.
- **Logged-in nav bar:** Home, Leaderboard, Forum, Stats — unchanged. Profile is reached via avatar/name click, deliberately *not* a nav-bar link (round 6).
- **Logged-out nav bar: just "Home"** (round 7, reversing the earlier assumption that logged-out visitors see the same nav with pages self-blocking) — there is nothing else for them to navigate to, since §3's logged-out-Home restructure absorbs everything they're allowed to see.

## 7. Popups — DECIDED / OPEN

- **Team popup:** unchanged by any of this — stays exactly as designed (`SPEC.md` §8b); no knockout-pick tie-in added ("keep team popup as-is"). Form/history sections always mean just the last few real matches, no knockout-specific redefinition. Still fully gate-free, confirmed again explicitly for the logged-out-Home model (round 7) — opens the same for anyone, logged in or not.
- **Participant popup:** unchanged in spirit, still requires being logged in + phase ≠ notstarted to open at all (round 1's rule, never loosened). Shows the league prediction/ranking once locked, per §5's visibility rule. Showing the *knockout* pick there too was confirmed in principle (round 6, same visibility rule) — its placement inside the popup still isn't designed, but this is now a lower-stakes gap: logged-out visitors get locked predictions via Home's plain inline list instead (§3), not via this popup, so the popup's own login gate no longer needs to loosen. **This is the round-7 resolution to the tension flagged since round 1.**
- **Matchup popup:** doesn't exist yet. Confirmed shape: identical for everyone regardless of login state (round 6 and round 7 both reconfirm this), opens wherever a match is clickable — but matches aren't clickable or visible at all before the tournament starts ("nothing at all pre-start"). Round 8: Claude's teams+kickoff/score+scorers default was rejected as too thin — Mert wants "something richer" but hasn't described it yet. **Still open, round 9 needs to chase specifics.**

## 8. Stats Page — LEANING (update)

- Right side (participant/demographic widgets — age, knowledge, Messi/Ronaldo, teams): unaffected by phase, confirmed no change needed.
- Left side (tournament widgets): the **last four** of its seven widgets (over/underperformers, most agreed/disagreed teams) get replaced once knockout starts with **knockout-specific accuracy/agreement rankings, same shape as before** (round 6 — resolves what had been fully open); the first three (top scorers/assisters/ratings) stay as-is.
- A separate, lighter subset of stats now also needs to show on logged-out Home once started (round 7, see §3) — which widgets, and whether they're literally a subset of this page's or something bespoke, is not yet designed.

---

## Open Questions (as of round 8)

- **Exact matchup popup contents** — still the single biggest gap. Claude's teams+kickoff/score+scorers default was explicitly rejected in round 8 as too thin ("something richer"), but Mert hasn't described what richer means yet. Top priority for round 9.
- The knockout pick's exact placement within the participant popup layout (lower-stakes now that logged-out visibility routes through Home instead, but still undesigned).
- What the knockout-phase bracket view on Home actually looks like (round 8 confirmed it exists and replaces the standings table, but not its design).
- Whether anything else about Home's shape changes for knockout beyond the bracket swap.

---

## Changelog

- **2026-07-24 (round 8):** Matchup popup's teams+kickoff/score+scorers default rejected as too thin — "something richer" wanted, not yet described (open, top priority next round). Logged-out Home's lightweight stats resolved: condensed top-scorer/assister/rating widgets. Leaderboard-survives-for-logged-in confirmed emphatically, no longer just Claude's default. Predictions list on logged-out Home: first name + last initial only (not full names) — a privacy call Mert hadn't consciously made until asked — and shows every participant, not a trimmed slice. Locked-prediction Profile view confirmed as Claude's proposed plain-list default, no caption needed. Knockout start now visibly swaps the league standings table for a bracket view on Home, not just the prediction buttons. Mert also requested a full 64-cell (8 pages × 8 states) build-completion scorecard (0–5, or N/A) — separate from this design spec, tracked as its own deliverable.
- **2026-07-24 (round 7):** The core tension flagged since round 1 is resolved — logged-out visitors see **only Home, at every phase, full stop.** Logged-out Home absorbs Leaderboard's full content (not a summary), a new lightweight stats subset, and a plain inline (non-popup) locked-predictions list. Team popup and matchup popup stay fully gate-free for everyone. Nav bar itself shrinks to just "Home" for logged-out visitors — pages no longer just self-block on the same nav. Whether Leaderboard survives as its own page for logged-in users was left to Claude's judgment (default: yes, unchanged).
- **2026-07-24 (round 6):** Profile reached via avatar/name click, not main nav. Reminder becomes one general indicator near the avatar, not per-button. Overwrite-confirm dialog still shows when revising from Profile. League popup contains just the ranker, nothing else. Knockout-phase stats widgets resolved: knockout-specific accuracy/agreement rankings, same shape as before. Knockout pick follows the same logged-out-visibility rule as the league prediction (later resolved via Home's inline list, see round 7). Hero carousel confirmed to belong on Home too. Matchup popup contents still genuinely undecided. Locked-prediction Profile view still open ("idk").
- **2026-07-24 (round 5):** Sign-up closes entirely once league phase starts — not a missed-prediction edge case, literally can't create an account after kickoff. Knockout-prediction misses are equally permanent, no flexibility. Chat widget shows full scrollable history, not a preview. Home carrying all of this "feels right" to Mert. Reminder should be quiet (badge/dot), not a banner. Knockout prediction is fully independent data from the league prediction. Confirmed the full gated-page list: Leaderboard, Forum, Stats, Profile. Mert: don't over-build the (near-impossible) case of someone missing a prediction after signing up — he'll handle it personally over WhatsApp.
- **2026-07-24 (round 4):** Both prediction popups are Home-button-triggered, not auto-shown. Quiz is its own step right after name/photo sign-up. Profile shows nothing beyond name (locked forever)/photo/both predictions. A visible reminder for unsubmitted predictions is wanted. Visibility rule (locked = visible to all logged-in users) applies identically to both predictions. Confirmed deletion of `/predictions` and `/chat` as standalone routes.
- **2026-07-24 (round 3):** Knockout prediction is a full bracket (round-by-round), not just a champion pick. Profile becomes a real, revisitable page. Quiz done at signup; league prediction can wait until anytime before kickoff — first sign of decoupling from the old bundled flow. Chat's home widget keeps the old page's logged-in-only-every-phase rule. Nav bar confirmed as just Home/Leaderboard/Forum/Stats. Team popup stays as-is. Profile always reachable once logged in.
- **2026-07-24 (mid-round-3 clarification):** Resolved an apparent contradiction — league-phase and knockout predictions are entirely independent; the "reopens for pre-knockout" edit window belongs to the knockout prediction, not a reopening of the league one (which never revises once locked). Predictions is folding into Profile, not being deleted as a *feature*. Chat's standalone page is gone; the home widget is the only chat.
- **2026-07-24 (round 2):** Predictions lock during league phase, with the knockout prediction's edit window living in pre-knockout. Stats page's last four (of seven) tournament widgets get replaced post-league-phase; the other three don't. No match content at all before the tournament starts. Leaderboard's table format doesn't change across phases. Home may need changes post-league-phase but is undesigned until league phase itself is built. Team popup's "form" always just means the last few matches, no knockout-specific redefinition. **Predictions and Chat will not be pages at all** — Predictions folds into Profile, Chat becomes a Home widget.
- **2026-07-24 (round 1):** Phase model expanded from a 2-value pre/post split to 4 real phases, replacing the old `NST_NLI`-style state codes with `pagemap.xlsx`'s own 8 literal names — implemented same day. Forum access fixed to logged-in-only in every phase (previously open to logged-out visitors once started). Team popup and participant popup found to have no code-level access gate at all; participant popup's real rule (logged-in + not notstarted) established here for the first time.
