# Kupatakip UCL — Living Spec

Source of truth for the project as it's understood so far. Built from `BRIEFING.txt` plus answers from questionnaire rounds. Updated after every round — nothing here should ever go stale.

Status key: **DECIDED** (locked in), **LEANING** (stated but soft), **OPEN** (not yet addressed).

---

## 1. Mission — DECIDED

A Turkish-language website called **"#kupatakipucl"** (final name) where ~30–50 friends submit predictions for the UEFA Champions League and get scored against real results, across two rounds:

1. **League phase** — predict final alphabetically-seeded team rankings before the league phase starts.
2. **Knockout** — after the RO16 draw, predict how the confirmed bracket plays out (QF/SF/final/champion).

Fresh start / sequel to a previous "#kupatakip" project; old repo intentionally not carried forward.

Group size: expecting ~30, possibly up to 40, absolute max 50.

Mert is a participant himself, not just the site's admin/operator.

## 2. Hard Dates — DECIDED (all times Europe/Istanbul)

| Date | Event |
|---|---|
| Aug 26, 2026 | Participating teams confirmed. **Site must be live by this date** — sign-up and round-1 prediction submission window opens. |
| Sept 8, 2026 | League phase starts. Sign-up and round-1 predictions close (submission window was Aug 26 → Sept 8). |
| Jan 27, 2027 | League phase concludes. |
| Feb 26, 2027 | RO16 draw. Round-2 (knockout) predictions open. |
| Mar 9, 2027 | RO16 begins. Round-2 predictions lock. |

RO16 playoffs are skipped — round 2 uses the confirmed RO16 bracket directly.

## 3. Scoring — DECIDED

**Round 1 (league phase):** For each team, if `|predicted position − actual position| < 3`, participant earns 3 points for that team.

**Round 2 (knockout):** Per team, independent of round 1:
- Correctly predicted to reach **QF** → 3 pts
- Correctly predicted to reach **SF** → 4 pts
- Correctly predicted to reach the **Final** → 5 pts
- Correctly predicted **Champion** → 6 pts

**Round-2 submission mechanic — DECIDED:** participants fill in a **full bracket** — picking the winner of every individual match from RO16 through the final — not just flatly naming which teams reach each stage. Points are then derived from that bracket against the real results.

**Leaderboard:** Round-1 and round-2 points combine into a single overall running total — one leaderboard, not two. Ties are left as ties (same rank, no tiebreaker rule) — Mert explicitly doesn't want one. Plain numbers and rank only — confirmed via the previous "#kupatakip" edition (https://mertgurgenyatagi.github.io/kupatakip/), which has no badges/streaks either, just a straightforward points table. Confetti plays for the winner **publicly, visible to any visitor** of the finished site — not a private moment gated behind the winner's own login.

Round-2 sign-up is **closed to round-1 participants only** — someone who skipped round 1 cannot join fresh for round 2.

If someone signs up but never submits a prediction, they still appear in the participant list, marked as not having submitted (Mert plans to personally chase stragglers over WhatsApp, so treats this as a rare case, not something the site needs to solve socially).

## 4. Sign-up — DECIDED

- Google login required to participate.
- Mandatory fields at sign-up: profile picture, first name, last name. Nothing else.
- Open to anyone with the link — no invite/approval gate.
- Profile (photo/name) is editable any time after sign-up, not locked in.
- No prize on the line — bragging rights only. Fine to say so in the copy.
- **Real first + last name only — no nicknames/handles.**
- Email address (from Google login) is **never shown to other users** — only name + photo are public.
- ~~No per-profile survey flair~~ **REVERSED 2026-07-23**: background-survey answers (Süper Lig team, Messi/Ronaldo, etc.) are now shown per-participant in the leaderboard's participant popup, visible to any signed-in participant — not aggregate-only as originally decided across Rounds 5/8. Mert's explicit call. `surveyResponses/{uid}` read access loosened to `if request.auth != null` accordingly (firestore.rules).
- **Profile pictures: unmoderated** — same trust-the-friend-group stance as chat/forum (§6).
- **Clean fresh start** — no references anywhere to the previous #kupatakip edition (no "season 2," no returning-player callouts), even though Claude may borrow *functional* feature ideas from it (see §3, §8d) — borrowing UI concepts is fine, branding/history references are not.

## 5. Prediction Submission Flow — DECIDED

Not asked at sign-up — triggered later by a dedicated "submit predictions" button. Sequence:

1. One-by-one questionnaire (progress bar visible), collected for later data analysis, not for scoring:
   - Age (integer)
   - Self-rated football knowledge (1–7 Turkish scale, "no interest" to "tactical genius")
   - Messi or Ronaldo (or no opinion)
   - Süper Lig team allegiance (GS / FB / BJK / Trabzon / Anadolu takımı / none)
   - Whether they support a specific UCL team (free text if yes)
   - Primary device: phone / desktop / both
   - **This survey is one-time only** — it does not repeat before the round-2 (knockout) submission.
2. Short animation plays once questionnaire is done.
3. User drags/shuffles the alphabetically-listed teams into their predicted ranking order and submits. Confirmed: full drag-and-drop is fine on mobile too — no simplified tap-to-assign alternative needed.
4. Predictions are editable up until the round's deadline. Re-opening an already-submitted prediction to change it shows an **"are you sure you want to overwrite this?" confirmation** before saving — not a silent seamless re-save.
5. Predictions are hidden from other users until the tournament (that round) starts.

## 6. Community Features — DECIDED

- **Chatroom:** live, real-time group chat (not a refresh-to-see wall), one single shared room for everyone (no separate channels). Permanent scrollback — no clearing/archiving of history.
- **Forum:** 4chan-style — top-level messages act as headers, with threaded replies and replies-to-replies. **Image uploads only** — no video/gif support. No length cap on text posts.
- **Moderation:** none. Full trust in the friend group — no report/delete tooling planned.

## 7. Results & Scoring Automation — DECIDED (skipped)

**Reversed 2026-07-20:** Mert originally wanted match/table results pulled automatically from a live football data source rather than entered by hand. After the leaderboard/team table and stats units were built (both against a manually-maintained `results` Firestore collection — see §8b, §8d), he decided to skip automation entirely rather than research/build it. This isn't a gap: `results` was designed from the start with manual maintenance as the actual mechanism (no admin UI, updates via direct Firestore edits, "Mert asking Claude" — same model as §7b's no-admin-panel stance generally), so nothing in the app depends on automation ever existing. Real results get entered by hand once matches happen. Not revisiting unless Mert raises it again.

**Development-data shortcut — DECIDED:** to keep development moving before the real Aug 26, 2026 team list is confirmed, use the **previous season's participating teams** as placeholder/test data. Mert explicitly chose this "for least headache during this development portion" — swap in the real confirmed list once it's known, don't block build progress waiting on it.

**Build from scratch — DECIDED:** Mert does not want to reference the previous edition's actual source code ("I would rather we did it from scratch"). Feature *concepts* borrowed from it (§8d: who-picked-whom, timeline graph) still stand — only the code/implementation should be original, not the design intent behind those two features.

**Google OAuth — OPEN, deferred on purpose:** no Google Cloud project/OAuth client exists yet. Set up together when implementation reaches that point — not a blocker to resolve now.

## 7a. Hosting — DECIDED

Hosting: **GitHub Pages**, with a small additional service (e.g. Firebase/Supabase/a serverless function) bolted on to cover live chat, automatic results, and forum image uploads — Mert explicitly signed off on this ("Yeah it's fine"). No specific provider chosen yet; that's an implementation-time technical call, not something that needs to go back to him.

Domain: no custom domain — this becomes a **subfolder** of his existing `mertgurgenyatagi.github.io` repo (which hosts multiple projects side by side, e.g. `/eventportal/`), so the eventual URL is expected to look like `mertgurgenyatagi.github.io/kupatakipucl/`. Development continues in this standalone folder for now; the move happens later, once it's ready.

**Git:** deliberately not initialized yet. Mert wants to hold off on git until the questionnaire rounds are done — don't set up version control until he says so.

Backend cost tolerance: strong preference for **strictly free** — "I would love free, Claude. Like, really love it." Treat any paid-tier suggestion as a last resort, not a casual option, and flag it clearly if it ever seems unavoidable.

## 7b. Admin Model — DECIDED

No admin panel. Any manual fix (edit a prediction, remove a user, correct a result) happens by Mert asking Claude directly rather than through a self-serve UI.

Whether Mert himself can see submitted predictions early (before the general reveal) — he doesn't care either way ("Eh, doesn't matter"). Default to treating him like any other user (simplest to build, no special-case access) unless he says otherwise later.

## 8. UX / Access States — PARTIALLY OPEN

Visibility is gated by a 2×2 matrix: tournament started (post-Sept 8) × logged in. Confirmed so far:

- **Not started + not logged in:** mission blurb, countdown to sign-up close, live 0-point alphabetical team ranking, list of signed-up players (first name + photo + count) but not their predictions, no chatroom, no forum.
- **Not started + logged in:** explanation of the two prediction rounds and scoring, countdown to submission close, same 0-point rankings, full player list (full names + photos, still no predictions visible), chatroom + forum both open.
- **Started + not logged in:** mission blurb, notice that sign-up is closed, live team rankings, match days remaining, participant rankings, stats (progression over time + TBD extras), first names + predictions + photos for all participants, no chatroom, forum open.
- **Started + logged in:** confirmed — everything a logged-out user sees, **plus** chatroom access, **plus** their own submitted prediction highlighted somewhere.

Marked in the source briefing as "broad strokes" / intentionally incomplete — expect this section to grow across questionnaire rounds.

## 8a. Deadline UI — DECIDED

- Countdown display: live ticking countdown (days:hours:minutes:seconds), with an explicit fallback rule — **if it gets tricky to implement reliably, drop it for a plain static date rather than over-investing.**
- As a deadline nears, the submit-predictions page shows an urgent visual cue (e.g. a red banner). Scope (site-wide vs. submit-page-only) is **delegated to Claude** ("You decide") — default to submit-page-only unless there's a good reason to widen it.
- **Live submission counter** during the sign-up window ("X of Y have submitted") — confirmed, worth building.
- The Jan 27 → Feb 26 gap (league phase over, RO16 draw not yet happened): **no special "stay tuned" messaging** — just leave the final round-1 standings showing as-is.

## 8b. Team Display — DECIDED (mostly)

Team rankings/standings show club badges/logos next to team names, not just text.

On comparing predictions to real results once the tournament is underway: **DECIDED (locked in Round 7)** — highlight, in green, the teams within a participant's prediction that match/fall correctly against the actual table, rather than a full separate live-table-vs-prediction side-by-side view.

**Pre- vs. post-tournament team table behavior — DECIDED:** Before the tournament starts, the table is just a **static** alphabetical 0-point list — no sorting controls, since sorting is meaningless when everything's tied at zero. Once the tournament is underway, it becomes **sortable by goal difference, goals, etc.** (real live standings). Mert's own framing: "when it's all 0 just static is fine."

**Team-click popup — DECIDED (locked in Round 7):** clicking a team opens a small popup with extra info (most common starting XI, coach, stats). ~~Scoped to after the tournament starts — doesn't apply pre-tournament.~~ **REVERSED 2026-07-23**: `onboarding/PAGE_BRIEFING.txt`'s page-by-page brief explicitly marks the team popup "identical for started and not started" (unlike the participant popup, which it marks N/A pre-start) — the later, more specific instruction wins. The popup opens regardless of phase; pre-tournament it just degrades gracefully the same way the team table itself already does (no result yet → "-"/no qualification band, no decided matches → an all-"upcoming" match history, nobody's picks scored yet → predictors list still shows, just with nothing highlighted correct). See TeamPopup.tsx.

## 8c. Profile Pictures — DECIDED

Users upload their own photo — not pulled automatically from their Google account.

## 8d. Stats Page — LEANING (baseline accepted, now expanded)

Confirmed baseline (Mert: "Sure" to all three proposals) — treat as a starting list, not exhaustive:
1. Each participant's rank-over-time line graph as matchdays complete.
2. A "most accurate predictor" leaderboard.
3. Which teams were most over/under-predicted by the group.
4. **Background-survey results made public** — aggregate results from the mini-questionnaire (age distribution, football-knowledge scale, Messi vs. Ronaldo split, Süper Lig team breakdown, etc.) should be shown somewhere as fun stats/poll results, not kept backend-only.

Two feature ideas worth carrying over from the previous "#kupatakip" edition (functional precedent, not a branding callback — see §4's "clean fresh start" note):
- **"Who picked whom" transparency view** — per team, show how many participants predicted it to advance/reach a given stage. **Visibility: public**, visible even to logged-out visitors once the tournament has started (same as the rest of the started+not-logged-in stats, §8).
- **Match-by-match points timeline graph** — visual accumulation of each participant's points as results come in, not just a snapshot rank. Same public visibility as above. Updates land **quietly, no reveal animation/fanfare** — confirmed for score updates generally, including the very first matchday's results.

## 8e. PWA — DECIDED (rejected)

No installable/add-to-homescreen behavior needed. A normal responsive mobile website is enough.

## 9. Design Direction — PARTIALLY DECIDED

- All-Turkish UI, confirmed with no exceptions — no English toggle, even for non-Turkish-speaking friends.
- **Desktop gets its own real layout this round** — explicit reversal from the previous edition, where desktop was just a squished mobile-first layout. This was called out as something to actively avoid repeating.
- A short, non-overbearing animated onboarding sequence plays on a user's very first visit. Confirmed: **not skippable**, but must stay so brief/lightweight it never feels like a hassle regardless. (Same "not skippable but never annoying" bar applies to other animations sitewide — e.g. the post-questionnaire animation in §5.)
- Mission welcome paragraph: Claude drafts it (in Turkish), Mert edits/approves — not something he's writing from scratch.
- A dedicated "how scoring works" reference page: delegated to Claude's judgment ("I don't know. You decide."). Leaning yes — low cost to build, and the two-round/position-delta scoring system is genuinely non-obvious enough that a revisitable explainer beats relying on the onboarding animation alone.
- Mission blurb tone: **"neutral but not robotic"** — Mert's own phrasing. Not comedic/personality-heavy, but should read like it was written by a person, not corporate copy.
- **Overall site personality: serious / professional**, not meme/fun energy — Mert's own framing: "it's not the United Nations, but still. Very professional design." This is the governing tone for the whole visual identity, not just copy — reads as a real product, not a joke site for friends, despite the low-stakes subject matter.
- **Single theme only for now** — no light/dark toggle. Which one (light or dark) is a design-phase call, not specified by Mert.
- Favicon/tab title: delegated to Claude, using the already-decided UCL color palette/logo as the anchor.
- No "confused? ask me" contact link needed — Mert handles questions organically over WhatsApp as he always has.
- **Launch/access control:** the live site can be up and technically reachable before Aug 26 — no soft-launch gate or staging environment needed. Mert's security model is simply that he controls when the link gets shared with the group ("as long as I don't send them the link no one will guess the URL"). Don't over-engineer access control here.
- Sound: **silent site** — no sound effects anywhere, including the winner moment.
- Winner celebration (§3): confetti.
- Share-prediction button: **not needed**.
- Typography: delegated to Claude's judgment — see §9a for the standard Mert wants it held to.
- **Color palette: official UEFA Champions League colors.**
- **Main logo: the real official UCL logo itself** — not a custom design. Mert retrieves the actual asset file.
- **Team crests: real official club badges** — Mert retrieves these too, not simplified/placeholder icons.
- **Asset workflow — how this actually works:** Claude specifies what's needed (e.g. "I need an SVG/PNG/animation of X"), Mert retrieves and provides it, no back-and-forth needed on his end ("You just 'imagine' a[n asset]... then I go and find it. No questions asked."). Treat this as a standing green light: name the exact asset needed once we're building, rather than guessing or leaving a placeholder indefinitely.
- Beyond palette: no deeper visual identity specified yet — **OPEN**.

## 9a. Frontend Quality Bar — DECIDED

Mert explicitly does not want this to read as generic AI-generated UI ("Claude slop") — he installed the `impeccable` design skill specifically to steer away from that, and wants the result to feel sophisticated and deliberate. This should be treated as a real constraint on the eventual build, not a throwaway preference: invoke `impeccable` when actual frontend design work starts (layout, components, visual identity pass), not just at the very end.

## 9b. Build Process — DECIDED

Two process decisions from Mert, both endorsed:

- **Migration to `mertgurgenyatagi.github.io` happens late, deliberately** — stay in this standalone folder through most of development so frontend/technical details stay easy to change without touching his live personal-site repo. Only move it once it's genuinely stable.
- **Build section-by-section, not the whole site at once.** Each major piece (auth/sign-up shell, prediction submission flow, leaderboard/team table, chat, forum, stats pages, results automation) gets built and shown as its own reviewable increment rather than one big-bang implementation. This matches how the rest of this spec-gathering process has worked (small reviewable rounds) and fits the `impeccable` design workflow better — there's something concrete to react to at each step instead of abstract description.

**Questionnaire phase formally concluded as of Round 8 (2026-07-19).** SPEC.md is the reference going forward; further changes happen through direct conversation/review of built sections, not more rounds.

- ~~Results data source — see §7, needs actual research into available UCL data feeds~~ — moot, see §7: automation skipped entirely, results are entered manually.
- Specific backend/service provider for chat/results/images (Firebase vs. Supabase vs. other) — implementation-time technical call, not a Mert decision.
- Exact form of the end-of-season "you won!" celebration moment (§3) — wanted, but not designed yet.
- The green-highlight-matching-teams idea (§8b) is Mert's own unconfirmed guess — revisit once there's a real UI to react to.
- Post-season archival/reuse for next year — explicitly deferred as "too forward thinking, don't bother" for now. Not a current-scope concern.
- Notifications: **decided** — none, no reminder system at all.

---

## Changelog

- **2026-07-23:** Team-click popup (§8b) built on the `team-popups` branch, self-directed per Mert's "create a new branch and go to town." Reversed §8b's "after tournament starts only" scoping in favor of `onboarding/PAGE_BRIEFING.txt`'s later, more specific "identical for started and not started" — see the strikethrough note above. Real data throughout (live position/points/qualification band, full match history + form derived from `devMatches`/`FIXTURES`, and a new "who predicted this team" list derived from `entries`) except the squad-level fields this app still has no data source for (manager, starting XI, top scorer/assister) — those are explicit dummy data (Mert: "there is no existing API for football data wired right now... just do dummy data"), deterministic per team so they don't reshuffle on reload. Cross-links both ways with the participant popup (a team's predictors list opens a participant; a participant's predictions grid opens a team), and revives DESIGN-SPEC.md §46's filed-for-later easter egg (clicking a team's crest 5 times flashes the site's accent color to that team's real primary color). New team-level data (`primaryColor`/`stadium`/`city`) added to `teams.ts`. References two new asset paths that don't exist yet (`/team-stadiums/{id}.webp` × 36, `/dossier/player-silhouette.svg`) for Mert to fetch, per SPEC.md §9's established asset workflow.
- **2026-07-20:** Post-merge wrap-up: Mert manually verified chat (real-time delivery across two tabs — one transient miss on first try, confirmed a network blip not a bug, worked cleanly on retry), forum (3-level nested reply chain renders correctly, image upload works), and stats (visible via `?debugDate=` once "started"). Separately, **decided to skip results automation (§7) entirely** — reversed from "needs research" to "not doing it." No impact on anything built: the `results` collection was designed from the start for manual maintenance (no admin UI, direct Firestore edits), so nothing depended on automation ever existing. Real results will be entered by hand once matches happen.
- **2026-07-20:** Stats page (§8d) built and merged to `main`, deliberately scoped to 2 of the 6 items §8d lists — a most-accurate-predictor ranking (average position deviation) and a most over/under-predicted-teams ranking — both pure functions computed entirely from unit 3's already-public `predictions`/`results` data, no new Firestore collections or rules needed at all. The other 4 §8d items are explicitly deferred, not dropped: rank-over-time and points-timeline graphs need historical snapshots that can't exist before the tournament starts; "who picked whom" is structurally a round-2 knockout concept with no round-2 data model yet; public survey aggregates need a privacy-preserving server-side (likely Cloud Function) architecture that deserves its own dedicated design pass rather than being rushed here (client-side aggregation would defeat `surveyResponses`' owner-only read rule by exposing raw individual answers to every visitor's browser). Self-directed build; final review spent real effort specifically re-checking whether the scope-down was justified rather than taking it on faith, and confirmed all four deferrals hold up — came back clean ("Ready to merge: Yes").
- **2026-07-20:** Forum (§6) built and merged to `main` as a bare-skeleton increment — 4chan-style threading with genuine arbitrary-depth replies-to-replies (a flat `forumPosts` collection assembled into a tree client-side, this codebase's first recursive component), one optional image per post (PNG/JPEG/WebP only, no gif per spec, 5MB cap), no length cap on text, one-time reads (not real-time like chat — not required by SPEC for forum) with a self-triggered `refetch()` after your own post. First page in the app where "can view" and "can post" genuinely diverge — `pageAccess.ts` lets a logged-out state (`ST_NLI`) view the forum, so compose/reply forms only render for logged-in users while reading stays open; Firestore rules matched this with public read (same reasoning as unit 3's `profiles`/`predictions`/`results`). Both Firestore and Storage rules deployed and live-verified this time (unit 4's chat rules remain undeployed, still blocked by the same intermittent local IPv6 outage — that one's proving persistent, not a one-off). Self-directed build, same delegation as chat; final review came back clean ("Ready to merge: Yes") with only minor polish items deferred (orphaned-parent tree edge case that's currently unreachable given no-delete immutability, tree remounting instead of staying stale during refetch, file-input display not clearing after a successful post).
- **2026-07-20:** Chatroom (§6) built and merged to `main` as a bare-skeleton increment — single shared live chat via Firestore `onSnapshot` (no new backend service), immutable permanent scrollback (no edit/delete anywhere, matches "no moderation, no admin panel"), sender names resolved via `usePlayers` (relocated from the leaderboard module to `src/profile/` since chat is now a second consumer). Self-directed build: Mert delegated this unit's design/plan judgment calls entirely rather than the usual interactive brainstorming round, and later extended that to skipping manual verification checkpoints while away — so the new `messages` Firestore rule is written and committed but not yet deployed (blocked by a persistent local-network IPv6 outage affecting `firebaserules.googleapis.com` specifically) and the actual cross-session real-time behavior hasn't been eyeballed in a browser yet. Both are queued for when Mert is back.
- **2026-07-20:** Leaderboard/team table (§8, §8b) built and merged to `main` as a bare-skeleton increment — club standings table (static 0-point pre-tournament, sortable live standings once populated), signed-up player list (name-visibility split by login state, per-§8 wording), and the participant points leaderboard (client-side scoring, no Cloud Function), wired into both `HomePage` (per visibility state) and a dedicated `/leaderboard` route. New manually-maintained `results` Firestore collection. Final review caught two real gaps before merge: `profiles`/`predictions`/`results` required auth to read, silently breaking every logged-out view §8 promises — opened to public read (write stays owner-only/disabled) after explicit confirmation, matching the project's existing "trust the friend group" stance; and the ST_NLI (started, logged-out) prediction reveal was granting full names instead of the first-names-only §8 specifies — fixed to key off login state, not tournament phase. Deliberately deferred: real crests, green-highlight-matched-teams, team-click popup (all §9a visual-pass items), stats page, automated results ingestion (§7, still its own unit).
- **2026-07-20:** Prediction submission flow (§5) built and merged to `main` as a bare-skeleton increment — survey, drag-to-rank team ranker, overwrite confirmation, submission counter, Firestore/Storage persistence, all manually verified end-to-end against the live Firebase project. Deliberately deferred: the "short animation" between questionnaire and ranker (§5 step 2) — not built yet, revisit during the `impeccable` visual-design pass rather than treating it as an oversight. Also fixed during verification: `storageBucket` was missing from the Firebase client config (would have broken every Storage operation at runtime), and the `stopbilling` budget-killswitch Cloud Function (unrelated to this section, but touched this session) turned out to have never actually worked — three separate deploy/permission bugs, now fixed and version-controlled at `functions/stopbilling/`.
- **2026-07-19:** Initial version, derived entirely from `BRIEFING.txt`. No questionnaire rounds yet.
- **2026-07-19 (correction):** Fixed the hard-dates table — Aug 26 is when the site must go live and the sign-up/prediction window *opens*, not when it closes. Sign-up and round-1 predictions actually close at Sept 8 (window is Aug 26 → Sept 8), matching `BRIEFING.txt` Chapter One.
- **2026-07-19 (Round 1):** Name locked (#kupatakipucl), open sign-up, UCL color palette + logo-to-come, chatroom = live/real-time, forum = 4chan-style threaded with images, no notifications, group size 30–50, hosting = GitHub Pages. New open items surfaced: automatic-results data source unresolved, GH Pages can't natively support live chat/auto-results/image uploads (needs a small add-on service), stats list still to be drafted, started+logged-in view still undefined.
- **2026-07-19 (Round 2):** Hosting tension resolved (small add-on service approved). No moderation, no admin panel (Mert routes fixes through Claude). Own-uploaded profile photos. Started+logged-in view confirmed. Ticking countdown with a graceful static-date fallback. Urgency banner near deadlines. Team badges shown. Baseline stats list accepted. PWA rejected. New gaps surfaced: no leaderboard tie-breaker rule, unclear if round-1/round-2 points combine into one leaderboard, unclear if the pre-submission mini-questionnaire repeats for round 2.
- **2026-07-19 (Round 3):** No tiebreaker (ties just tie). Single combined leaderboard across both rounds. Mini-questionnaire is one-time only. Winner celebration moment wanted (form TBD). Profile edits allowed anytime. Live-vs-prediction comparison leaning toward green-highlighting matched teams (Mert unsure, revisit later). No prize, bragging rights only. Post-season archive/reuse explicitly out of scope for now. Turkish-only confirmed with no exceptions. Chat history is permanent.
- **2026-07-19 (Round 4):** All deadlines are Europe/Istanbul time. No custom domain — will migrate into his existing `mertgurgenyatagi.github.io` repo later. Strong preference for a strictly-free backend. Onboarding/animations not skippable but must stay lightweight/non-hassling. Claude drafts the Turkish mission text. Single shared chatroom. No share button. Confetti for the winner moment. Fully silent site (no sound). Typography delegated — paired with a new explicit constraint: Mert installed the `impeccable` skill and wants the frontend to read as sophisticated/deliberate, not generic AI output (see §9a).
- **2026-07-19 (Round 8, final round):** No per-profile survey flair (stays aggregate-only). Single theme, no light/dark toggle. Forum images-only, no length cap. Urgency banner scope delegated to Claude. Live submission counter confirmed. "Are you sure?" overwrite confirmation on prediction edits. Profile pictures unmoderated. Jan27→Feb26 gap needs no special messaging. Overall site vibe: serious/professional, not fun/meme energy. Two process decisions: migration to the personal-site repo happens late/deliberately, and the build proceeds section-by-section rather than all at once. **Questionnaire phase formally concluded.**
- **2026-07-19 (Round 7):** Repo will become a subfolder of `mertgurgenyatagi.github.io` (alongside his other projects like `/eventportal/`), not a standalone domain. Git init deliberately deferred until questionnaires finish. Google OAuth setup deferred to implementation time. Building from scratch — no reuse of the previous edition's actual code, only its feature concepts. Live-data research stays on Claude. Main logo = the real official UCL logo (Mert retrieves it), team crests = real official badges (also his to retrieve) — asset workflow clarified: Claude names the exact asset needed, Mert fetches it, no back-and-forth. Mert confirmed he's a participant himself, not just running it. Both floating ideas locked in: green-highlight matched teams, and the post-tournament team-click popup. Nothing new surfaced on the open-ended final question.
- **2026-07-19 (Round 6):** Round-2 mechanic clarified — full bracket fill-in, not flat stage picks. "Who picked whom" and the timeline graph are public, even to logged-out users, and update quietly with no fanfare. Full drag-and-drop confirmed fine on mobile. Mission tone: "neutral but not robotic." Site can be reachable before Aug 26 — access control is just "don't share the link yet," no staging gate needed. Team table is static pre-tournament, sortable (goal difference etc.) once it starts, plus a floated (not locked) idea for a team-click popup with squad/coach info post-start. Favicon delegated, no help/contact link needed. Development shortcut: use last season's team list as placeholder data to avoid blocking on the real Aug 26 list.
- **2026-07-19 (Round 5):** No-shows still appear in the participant list (marked). Round 2 closed to round-1 participants only, no fresh joins. Survey data goes public as aggregate stats. Clean fresh start — no callbacks to the old edition. Real names only, no nicknames. "How scoring works" page delegated to Claude (leaning yes). Emails never shown to other users. No special admin-peek access — Mert doesn't care either way, default to no special case. Confetti is public, everyone sees it. Mert pointed to the previous edition (https://mertgurgenyatagi.github.io/kupatakip/) directly instead of guessing on leaderboard flair — confirmed plain leaderboard (no badges/streaks), and surfaced two features worth reusing: a "who picked whom" transparency view and a match-by-match points timeline graph.
