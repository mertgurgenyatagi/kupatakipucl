# Handover — interim notes

**Purpose:** a rolling handover note for whatever isn't in `PROJECT_STATE.md`. `PROJECT_STATE.md` is the standing description of what the app *is*; this file is for what changed recently, decisions made along the way, and loose ends someone picking this up should know about. Do not duplicate anything `PROJECT_STATE.md` already covers — if a fact belongs there, put it there instead and leave it out of this file.

This file is meant to be pruned/rewritten as things get resolved or folded into `PROJECT_STATE.md` proper — it's not an archive.

**Term: "Xerox pass."** Reusing an existing, already-built page/composition wholesale for a different, not-yet-designed state — purely to replace placeholder text with *something real*, under explicit instruction not to worry about whether it's actually appropriate for that state ("don't overthink it," "we'll go through all of them much later"). Not a design decision, not even a rough one — a stopgap. A page/state marked as Xeroxed (from wherever) should be treated as **unreviewed** for its own specific context until a real pass happens; don't cite its current layout, copy, or behavior as an intentional choice for that state.

## 2026-08-06 — Mobile built, branch `mobile` (not yet merged)

Mert filled in the wireframe tool (19 of ~76 cells drawn, committed at
`tools/mobile-wireframe/mobile-wireframes.json`) and handed the rest over with one
instruction, quoted because it drove every judgement call below: *"Rest you can fill on your
own. Trust your skills and trust the golden rule (which I just made up right now): **ruthlessly
sacrifice elements for the sake of non-busyness**."* Spec at
`docs/superpowers/specs/2026-08-06-mobile-design.md`. `tsc -b` clean, `vite build` clean,
**956 tests / 126 files** (up from 930/123).

**Mobile is a fork, not a reflow.** Below 1024px the app runs its own shell and its own page
compositions, sharing every data hook and leaf component with desktop. The reasoning is in the
spec, but the short version: desktop Home is a five-widget three-column bento and mobile Home
is three stacked frames — that is a different set of children, not a `grid-cols-3 → 1` change,
and expressing it in breakpoint classes means shipping every desktop widget to every phone to
hide it with `hidden lg:block`. The breakpoint reuses the exact 1024px line `index.css` already
used for its fixed-viewport switch, so **the dead zone where a fixed-viewport desktop
composition rendered inside a scrolling document is gone** — that was most of why the old
sub-1024 experience was bad. Desktop is untouched below the fork; the 930 pre-existing tests
still pass unmodified because `test/setup.ts`'s `matchMedia` polyfill returns `false`.

**Three structural changes worth knowing before touching anything mobile:**

1. **Chat is no longer page content.** It is a right-edge drawer in the shell, reachable from
   every screen, which is what freed Home to have three widgets instead of four.
2. **There is one popup layer for the whole mobile app** (`MobilePopupHost`), not one per page.
   Desktop keeps a private copy in LeaderboardPage/ProfilePage/HomeLandingLoggedOutStarted/
   ForumPage; mobile can't, because a shell-level chat drawer has no page to hold that state
   for it. Any new mobile surface should call `useMobilePopups()` rather than declare its own.
   Its data hooks mount lazily on first open, so About/Forum don't pay for them.
3. **The centre of the mobile header is your own face once signed in, not the wordmark.** This
   is wireframed and deliberate, reads odd written down, and has a test pinning it so it
   doesn't get "fixed" by accident.

**What the golden rule actually cut**, listed so nobody re-adds it thinking it was an
oversight: the hero carousel (everywhere — 17 preloaded portraits of pure decoration), chat
from Home, the fixtures widget/drawer from Home and Leaderboard, the 36-team `TeamTable` from
Leaderboard, the avatar stack from the landing page, the share button from the header,
**`TeamPopup`'s entire dossier tab**, and `ParticipantPopup`'s rank-history chart. The last two
are the ones with a real argument behind them rather than just space: the dossier is 100%
fabricated data (`PROJECT_STATE.md` §6.3) taking two of three columns, and rank history has no
production data path at all (same §).

**Two real bugs the browser caught that the suite could not** — the pattern this file has now
logged three times, and it held again:

- **The standings pair grew to fit all 16 rows and pushed the bracket off screen.** The shell's
  root is `min-h-dvh` on purpose (a feed must be able to scroll the document), but `min-height`
  gives a flex child no definite height to divide, so two frames meant to split one screenful
  just grew. Fixed with a `.mobile-screenful` utility computed from the header's own geometry.
- **Both prediction pages were `h-dvh` while rendering below a 56px header**, overflowing by
  exactly the header's height. Desktop never showed it because `html/body` are
  `overflow:hidden` above 1024px, so the excess silently clipped. **Any full-viewport page
  inside the shell needs `.mobile-screenful`, not `h-dvh`.**

**Predictions needed the most real work**, and for a reason worth remembering: `TeamGrid`
shows a crest and puts the team's name in a **hover** tooltip. Touch has no hover — and every
crest in this app is deliberately assigned to the wrong club pending the roster replacement
(§9), so the pool on a phone would have been 36 unidentifiable badges. That is why the
wireframe says "list". `MobileTeamPool` is a named list reusing the same drag ids. Separately,
`PointerSensor`'s 5px threshold claims the drag the page needs for scrolling, so touch now
activates on press-and-hold; desktop's sensor is untouched.

**Deduplication done along the way:** the bracket's pick state machine is now
`useKnockoutPicks`, shared by the desktop and mobile brackets, with the eviction rules
(deselecting a quarter-finalist must empty the trophy) covered by real tests. `NAV_LINKS` moved
to `src/shell/navLinks.ts` so both shells read one table and the nav-matches-`pageAccess`
invariant covers both.

**Open follow-ups:**
- **No logged-in or started-phase screen has been verified against real data** — the §6.9 auth
  wall again, now doubly blocking since `profiles/{uid}` went signed-in-only in the 2026-08-02
  privacy split, so even the DevPanel's `loggedInOverride` can't get through without
  credentials. They *were* verified for layout, overflow and fit at 390×844 through a
  temporary preview harness rendering the real components with synthetic props (deleted before
  commit; that is how both bugs above were found). **That proves geometry, not Firestore
  behaviour.** Home logged-out/not-started, About, the nav drawer and the Forum gate are the
  only screens checked against the real app.
- **`KnockoutStagePicker` is a third copy of the bracket pick machine**, still not on
  `useKnockoutPicks`. It's desktop-only and was left alone deliberately rather than widen this
  branch's blast radius — but it should be folded in.
- Profile's delete button sits below the predictions frame on mobile, not inside the profile
  block as the wireframe draws it. Deliberate: a destructive action is better off not adjacent
  to the avatar. Flag if wrong.
- The About page keeps its contact line, which the wireframe omits — one line of real content,
  and the site's only way to reach anyone. Trivially cut if that reads as a misjudgement.
- Landscape phone is untuned, and tablets get the phone layout in a centred column capped at
  34rem. Both deliberate, neither designed.

---

## 2026-08-06 — Mobile wireframe tool built, branch `mobile-wireframe-tool` (merged to `main`)

Mobile design is now in scope after being explicitly out of scope for the whole project to date (every prior entry below says so). Rather than have Mert design mobile layouts freeform, built a small standalone tool for him to lay them out first: `tools/mobile-wireframe/index.html` — double-click to open, no server/build/install, self-contained (`lib.js` holds the pure logic as a classic script so it loads over `file://`; `lib.test.ts` covers it, 65 tests, runs in the normal `npm test`). Design spec at `docs/superpowers/specs/2026-08-06-mobile-wireframe-tool-design.md`.

**What it is**: a phone-shaped canvas, grid-snapped (12 columns × 20 rows/screenful, widened from an initial 6 after Mert found it too coarse), where he drags out labelled rectangles — no real widgets, no real copy, layout only. Screens are organized as a matrix (row = page/popup/sequence, column = one of the 8 `VisibilityState`s, derived exactly from `src/state/pageAccess.ts` so live cells are real not guessed) plus a shell screen (drawn once, ghosted on every page) and popup screens (get a draggable bottom-sheet handle instead). Every state starts as an alias of its row's first drawn cell, so filling the ~76-cell matrix is really ~15 drawings plus deliberate breakouts where mobile differs. Each cell also carries a widget checklist pulled from that page's real JSX composition, as a memory aid. Blocks can stack on top of each other (added mid-session per direct request) via Alt+drag or a Draw-over toggle, with a Layers list to reach anything fully buried.

**Output, and the reason this entry exists**: two buttons — `Save file` downloads `mobile-wireframes.json` for Mert to drop into `tools/mobile-wireframe/` and commit; `Copy for Claude` copies a text spec (box-art elevation + an exact row listing) for one screen or everything. **If `tools/mobile-wireframe/mobile-wireframes.json` exists in the repo, that is Mert's mobile layout data and the next real task is almost certainly to read it and build the mobile compositions it describes** — read the file directly (it's plain JSON) rather than asking him to paste anything; `WF.renderAllText(doc)` (in `lib.js`, loadable in a throwaway Node/browser context) reproduces the same text spec the Copy button gives him if the raw block coordinates aren't self-explanatory enough.

**Real bugs the browser-verification pass caught that the unit tests didn't** (worth a second read of `PROJECT_STATE.md`'s existing loading-flash lesson from 2026-08-03, which keeps re-earning itself): an ID selector's `display:flex` was outranking the `[hidden]` attribute, so an alias/N/A veil could show on a screen that wasn't actually N/A; a cell that had blocks drawn on it never actually left `alias: "auto"`, so the whole mirroring mechanic — the thing that makes the matrix tractable — silently did nothing until a fix in both the live-edit path and `migrateDoc` (so an already-saved file self-heals too); the phone canvas was taller than any real viewport and never fit, fixed with a zoom control defaulting to "fit one screenful" plus a `min-height:0` fix on the flex chain (its absence was also making the fit measurement circular).

~~**Not merged to `main` yet**~~ **Merged to `main` 2026-08-06**, along with Mert's completed
`mobile-wireframes.json`, as the first step of the mobile build above. `tsc -b` clean, full
suite 930 tests / 123 files (up from 865/122 before this branch) at every checkpoint.

---

## 2026-08-06 — Performance sweep + 19-item fix list, branch `perf-and-fixes-sweep` → merged to `main`

A 19-item punch list from Mert, explicitly weighted toward optimization ("your main focus should be optimization"). Mobile explicitly and totally out of scope, as usual. `tsc -b` clean, full suite green (865 tests / 122 files, up from 863/122), production `vite build` clean.

**Most of the performance complaints had two shared root causes, not fifteen separate ones.** Worth internalizing before chasing any future "the site feels slow" report:

1. **The sitewide image-preload gate was structurally inert** — the thing the 2026-08-03 entry below spent a whole session building. `useImagePreload` held `ready` in state and only assigned it inside an effect. On the render where `urls` first went from `[]` (data still loading) to populated — which is precisely when the gate matters — it still saw the previous `ready === true`, painted ungated content for a frame, and only then did the effect pull it back to a skeleton. So the observable behavior was *worse* than no gate: content, flash of skeleton, content. It now derives `ready` during render. It also re-gated from scratch on every route change and every popup open; settled urls are now remembered in a module-level `Set` (safe because every preloaded image is on an immutable, timestamped path — see `PROJECT_STATE.md` §8.3), so reopening a popup no longer re-waits on 36 team crests already sitting in the browser cache. That single change is most of what made `TeamPopup`/`ParticipantPopup`/`MatchupPopup` feel slow to open.

2. **Retained compositing layers from finished entrance animations.** `animate-cotton-rise` was applied per *row* in `LeaderboardTable` and `LeagueTableList`, and inside `TeamTable`'s shared `cell` class — so roughly 7 cells × 36 rows — plus `animate-cotton-fade` on every `AvatarImage`. All use `forwards` fill, which leaves the element holding a transform and keeps it composited after the animation ends. ~50 rows and ~50 avatars each holding a layer inside a scroll container is what made profile pictures visibly wobble while scrolling. Removed at row/cell/image level along with the now-pointless stagger delays; the panel-level `Frame` reveals are untouched, so the page still animates in, just as one surface instead of fifty.

Separately, the predictions ranker: `TeamDropList`'s 36 slots were `<motion.li layout>`. Framer's `layout` re-measures every element's bounding box on every render, and that list re-renders on every pointer move during a drag — while never actually animating anything, because it's a fixed 36 slots keyed by index, so a slot's position never changes, only its contents do. Pure cost, zero payoff. Now a plain memoized `<li>`; `TeamGrid` cells memoized too, and no longer transition a `transform` (the `hover:scale` went with it). Dialog enter/exit was 500ms in both directions, now 200ms.

**Two findings that were misdiagnosed as cosmetic and turned out to be real bugs:**

- **The profile league-prediction edit dialog was rendering at ~384px, not the 1024px its class implied.** `DialogContent`'s base class ends in `sm:max-w-sm`, and `sm:`-prefixed utilities are emitted after unprefixed ones in the stylesheet — so the `max-w-5xl` passed by `ProfilePage` never applied above 640px. Mert's "make it about 3.5× wider" turns out to be ~3.5× the *real* rendered width, which is how the 1344px it now uses was picked. **Any dialog that needs a custom width must pass a `sm:`-prefixed max-width**, or it silently collapses to `max-w-sm` on desktop. Worth checking the other `DialogContent` call sites against this.
- **The forum's post timestamp was semantically wrong, not just stale.** `ThreadCard` and `RecentPostsPreview` rendered `stats.lastActivityAt` directly beneath the *root author's* name, so a week-old thread read "2 dk önce" the moment anyone replied to it. Now shows the post's own `createdAt`; last-activity still drives sort order, which was always the intent. Relative times also tick now (one shared 30s interval for all subscribers, not a timer per row) and `timeAgo` guards non-finite and future timestamps — `createdAt` is written from the poster's own `Date.now()`, not a server timestamp, so clock skew can genuinely produce a future value.

**The rest of the list**, briefly: forum author avatar and name are now independent participant-popup targets (new `PostAuthorLink`; also removed a `DialogTitle` `<h2>` nested inside a `<button>` in `ThreadPopup`); thread popup scrollbar hidden; `Daha eski konuları yükle` no longer flashes on a warm cache (`hasMore` started `true`, now tri-state `null` = "don't know yet"); replies bucketed by root once in `Forum.tsx` instead of a `posts.filter()` per card inside the render loop. Lobby switcher is a white square with a dark chevron, moved left of the settings gear with real separation; leaving a lobby now confirms (it's as hard to undo as deleting — rejoining needs a fresh invite — and the copy names the ownership-transfer/deletion consequence when the leaver is the owner); cells keep their own titles instead of retitling to "Genel" when the viewer belongs to no lobby at all. The upcoming-matches drawer's crests/names now open `TeamPopup` — `FixtureRow` had supported `onSelectTeam` since Home's preview widget needed it, the drawer just never passed it through. Deeper edge fade on the home mini-standings (21px → 52px). The preknockout "Tahminlerini yap" widget lost its green border, eyebrow, and CTA fill (the keyboard focus ring stays accent-colored — sitewide convention, invisible until tabbed to).

**Decisions made without asking, flag if wrong:**
- **What "special lobby logic" means for a leaderboard widget** (item 16 was the largest piece). The started-phase home already had lobby *creation* but hardcoded chat and the mini-standings to global scope, so a lobby created there was invisible once the tournament began. Chat swaps collection path like everywhere else; the standings widget **filters the global leaderboard down to lobby members**, so a five-person lobby reads 1–5 rather than 12/27/31. That re-ranking choice is a product call, not an obvious one.
- **Removing the per-row stagger animations is a visible design change**, not purely an optimization — the tables now appear as a unit rather than cascading. Easily reverted if the cascade is missed, but it cannot coexist with smooth scrolling in those lists.

**Open follow-ups:**
- **Only the logged-out landing page was verified live.** Production phase is `notstarted` and no Google credentials were available, so the DevPanel phase override is unreachable — the same §6.9 wall every recent session has hit. **Items 3, 4, 5, 16, 17, 18 and 19 all live on logged-in or started-phase surfaces and rest entirely on the automated suite.** Per the methodological note in the 2026-08-03 entry below, that is explicitly not proof for anything touching a live Firestore listener, and the lobby-scoping work touches several. Needs a real click-through.
- The `sm:max-w-sm` shadowing described above was only fixed on the one dialog that reported a problem. Other `DialogContent` call sites passing an unprefixed width may be silently collapsing the same way.
- `useImagePreload`'s module-level cache is never invalidated within a tab session. Correct for immutable asset paths, but if a mutable image url is ever added to a preload list it will be gated once and then trusted forever.

---

## 2026-08-04/05 — Knockout Leaderboard Page Refactor, branch `main`

Refactored the logged-in knockout leaderboard page (`LeaderboardPage.tsx`) to support `knockout` and `preknockout` phases with a bracket-dominant layout.

- **Three-column layout**: Restructured the layout for knockout/preknockout to show the `KnockoutBracket` on the left, `LeaderboardHero` (carousel + fixtures drawer) in the middle, and `LeaderboardTable` (standings) on the right.
- **Bracket Section Styling & Compression**:
  - Overrode the bracket container `Frame` styling with `bg-background border-transparent shadow-none` so it blends cleanly into the main background canvas.
  - Added a `compact` prop to `KnockoutBracket` that removes the top spacer (when in `readOnly` mode) and tightens gaps/paddings, keeping team pill sizes intact.
- **Widget Sizing Ratios**:
  - Standings widget set to `297px`.
  - Hero carousel set to `256px`.
  - The bracket takes up the remaining flexible width (`1fr`).
- **Verified**: TypeScript compiles clean, and all `LeaderboardPage` unit tests pass.

---

## 2026-08-04 — Knockout popup refinements, branch `final-sweep`

Built and merged (branch `final-sweep`): four design refinements to `TeamPopup`, `MatchupPopup`, and `ParticipantPopup` covering the `notlogged_knockout` and `logged_knockout` visibility states. These are surgical changes — no new components, no new data models.

**Changes built:**

1. **`TeamPopup` — knockout stage header** (`phase === "knockout"`): Replaced the three header stat boxes (Ort. Sıra, Gerçek Sıra, Puan) with a single, large, bold `font-display` uppercase label: `SON 16 TURU` for RO16 teams, `LİG AŞAMASI ELENDİ` for eliminated teams. The inline stage badge (previously a small pill next to the manager name in all phases) was removed from the sub-header row entirely — the large label replaces it. In non-knockout phases the header is unchanged and the stats render as before.

2. **`TeamPopup` — predictor list for knockout teams** (`isRo16Team`): For teams in the Round of 16, the predicted-position number (formerly always shown at the right of each predictor row) is no longer shown. Only a faint, frameless, colorized stage badge remains: amber (`text-amber-300/90`) for 👑, sky-blue (`text-sky-300/80`) for `ÇF`/`YF`/`F`, nothing for `S16` (no badge rendered). No border, no background pill, no glow — just a plain tinted monospace label. For non-RO16 teams, the position number is still shown and the badge is never shown (unchanged behavior).

3. **`MatchupPopup` — RO16 predictor lists**: Already built in the prior session (see "Knockout Predictions & Profile refinements" entry above). No changes this session.

4. **`ParticipantPopup` — conditional sizing and layout split**: The wide `96vw` × `94vh` dialog is now **only active during knockout/preknockout phases** (`isKnockoutPhaseOrPre`). In league/notstarted phases the dialog reverts to the compact `sm:max-w-2xl` sizing used before the knockout work began, with the classic two-column + chart-row layout. In knockout phases the layout is a **60/40 horizontal grid** (left column: predictions alone; right column: right-side content), and the right column is now a **`grid-rows-2` 50/50 vertical split** (top: Quiz Answers, bottom: Rank History Chart) instead of the old flex-grow + shrink-0 pair.

**Verified**: `tsc -b` clean, full suite green (861 tests / 122 files) before merge.


Completed layout, styling, and flow refinements for knockout predictions across the homepage, main predictions page, and profile page.

**Refinements built:**
- **Homepage Sohbet Auto-Resize**: Moved the flex basis constraint wrapper inside `KnockoutPredictionWidget` so that when predictions are submitted and the widget returns `null`, the wrapper does not take up space, allowing the Sohbet chat frame to auto-resize to 100% of the column height.
- **Monochromatic Ambient Depth Backdrop**: Restored the radial background gradient and floating blur blobs on the `/knockout-predictions` page using 100% monochromatic slate, zinc, and neutral dark tones.
- **Fixed Width Final Column**: Enforced strict, professional fixed-width constraints on the center Final column and its `MatchBox` components on `/knockout-predictions`.
- **Symmetric Compact Profile Bracket**:
  - Expanded `ProfilePage` width to `max-w-[1400px]` during `preknockout` and `knockout` phases.
  - Designed and implemented a compact, non-scrollable 2-halves symmetric bracket (`KnockoutBracket.tsx`) that fits cleanly inside the Profile page container.
  - Applied the user's styling specifications: reduced the box width by exactly 40% (`w-24` / 96px), removed checkmarks on selected pills, highlighted selections with solid white borders, and scaled up text/pills/badges by 30%.
- **Inline Edit Mode & Confirmation**:
  - Bracket on Profile page starts in read-only mode by default with a "Düzenle" button in the header.
  - Toggling edit mode unlocks the bracket inputs and shows "Vazgeç" (Cancel) to discard edits.
  - Attempting to save trigger a confirmation overwrite dialog matching the league predictions pattern.
  - Wrapped action bars and champion badges in constant-height containers to completely stabilize vertical layouts on both the main page and profile view.
  - Clicking team pills in read-only mode triggers the standard `TeamPopup` details modal.

---

## 2026-08-03 — Loading-flash audit + fixes, branch `frontend-sweep` (not yet merged)

Not merged — Mert's explicit choice at the end of this session was to keep the branch as-is locally, unpushed, for now. 18 commits, three loosely-related strands of work.

**Content pass**: Home's not-started/logged-out mission blurb replaced with Mert's revised copy. `/about`'s left-column text was rewritten again this session — a single "encyclopedic" paragraph (no line breaks) covering what the site is, the league-phase scoring formula, and, newly, the knockout-phase scoring rule (3/4/5/6 points for quarterfinalist/semifinalist/finalist/champion — a real product decision relayed this session, not implemented anywhere else in the app yet, same status as the rest of knockout-prediction per `PROJECT_STATE.md` §13-B), then shortened again after Mert said the first version was too long. The date timeline widget's width was also trimmed slightly. **The `/about` design spec linked from the entry below is now doubly out of date** — this is the second unrecorded rewrite of that page's copy since it shipped; keep treating the live `AboutPage.tsx` as ground truth, not the spec doc.

**First attempt at "the site feels glitchy on load"**: Mert asked for a genuinely sitewide fix, not a patch — brainstormed, spec'd (`docs/superpowers/specs/2026-08-03-sitewide-loading-flash-design.md`), planned (`docs/superpowers/plans/2026-08-03-sitewide-loading-flash.md`), and built: a single `useFontsReady()` gate moved into `ProfileGate` (so no page, including the nav, ever paints in a fallback font — replacing an `/about`-only version that existed before this session); `HomePage`/`StatsPage`/`PredictionsPage`'s blank `return null` loading states replaced with skeletons matching the `LeaderboardPage`/`ForumPage`/`ProfilePage` convention (plus a nested blank-flash inside `HomeLandingLoggedOutStarted`'s own posts fetch, found while building this); a fade-in added to the shared `AvatarImage` (covers every avatar and team crest sitewide); and `HeroCarousel.tsx` changed to preload all 17 portraits before rendering any of them, instead of painting an empty frame while the active one fetched.

**Mert tested it live and reported none of it actually fixed what he was seeing** — a screenshot from the real dev server showed the Katılımcılar list populating with only one participant before others popped in as blank rows, a real (non-deleted) forum poster mislabeled "Silindi," and a forum image staying blank. Systematic debugging (not guessing) traced this to something the plan above never touched: **`usePlayers.ts` and five sibling Firestore live-listener hooks (`usePosts`, `useMessages`, `useLobbyMessages`, `useMyLobbies`, `useLobbyMembers`) all reported `loading: false` on the *first* `onSnapshot` callback, without checking `snapshot.metadata.fromCache`.** `ProfileGate` and `AppShell` each independently watch `profiles/{currentUid}`, which primes Firestore's local watch cache — so `usePlayers()`'s own collection listener could receive a fast, partial, cache-only snapshot (just the signed-in viewer's own doc) before the real server-confirmed list arrived, and every gate built on `playersLoading` (including the brand-new skeleton gate above) released on that partial result. All six hooks now ignore a `fromCache` snapshot until the first server-confirmed one arrives; live updates after that point are unaffected. **`useProfile`, `useLeaderboard`, and `useTournamentPhase` were checked and deliberately left alone** — they're single-document listeners, not vulnerable to this specific "partial list" failure mode (a lone doc is atomic; there's no "some of N documents" state for it to get stuck in).

**The forum-image fix from the first attempt was itself a regression**, caught in the same pass: it mounted the `<img>` immediately at `opacity-0` and faded it in 300ms after load, which for a real Storage-hosted photo (unlike this app's local dev assets) is a *longer*, more visible blank window than before, not shorter. Replaced with the same mount-when-ready idiom already used by `AvatarImage`/`HeroCarousel`: a `Skeleton` placeholder until the image actually decodes, then the already-loaded `<img>` renders directly, plus a real `onError` fallback (an `ImageOff` icon) — the only image category on the site that previously had zero failure handling.

**A methodological note worth keeping**: the automated test suite passed at every checkpoint through both rounds, including the first (wrong) fix. None of it caught the actual bug, because the `fromCache` timing behavior this depends on doesn't reproduce in jsdom's mocked Firestore — it only showed up against the real dev server. Don't treat a green suite as proof that a loading-state fix is correct for anything touching a live Firestore listener; it only proves the mocked shape of the fix is internally consistent.

**This note earned itself out on 2026-08-06** (entry above): the image-preload gate built in this session shipped green and stayed green for three days while being functionally inert, because its bug was also a render-timing one that jsdom reproduces happily. The suite asserted the hook's contract, not the frame ordering that made the contract meaningless.

**Third round — Mert reported live that images still popped in after the page had already rendered** (Katılımcılar avatars specifically; he also flagged the fix made images feel *slower*, tracing correctly to `HeroCarousel`'s "preload all before rendering any" trade from round one). Rather than patch the symptom, he asked for the underlying principle applied everywhere: no page or popup should ever reveal before its own images are ready. Brainstormed and spec'd (`docs/superpowers/specs/2026-08-03-sitewide-image-preload-gate-design.md`) rather than built ad hoc. `HeroCarousel`'s private preload hook was extracted to a shared `useImagePreload(urls)` (`src/lib/useImagePreload.ts`) and wired into every full page's existing loading-skeleton gate (Home in every `VisibilityState`, Leaderboard, Stats, Forum, Profile, Predictions) and into all three click-to-open popups (`TeamPopup`/`ParticipantPopup`/`MatchupPopup`, which previously had no image-readiness gate of their own — they now show a small skeleton `Frame` until their crests/avatars resolve). Large lists (52-person Katılımcılar, 36-row team table) preload every entry, not just what's visible — a direct, deliberate choice, same "slower load is fine, pictures arrive with the page" precedent `HeroCarousel` already established.

**Chat is explicitly excluded** — both surfaces keep today's live per-message `AvatarImage` fade-in, since gating a genuinely live stream on image preload would stall new messages behind a slow avatar fetch, which is worse than the flash it'd be fixing. Forum's post list is treated as bounded (not live), gated the same as everything else — with one nuance: its "load older" pagination only gates the *first* batch; older posts pulled in afterward use the existing per-item skeleton instead of re-hiding content already on screen, since that's a user-triggered pull, not a live push.

**Verified**: `tsc -b` clean, full suite green (845 tests / 118 files — 4 new tests for the shared hook, plus fixes to loading-gate assumptions baked into several existing page tests that asserted on synchronous content without awaiting the new preload flush). Live-checked against a real dev server: the logged-out landing page's avatar stack now renders with photos already present, no separate pop-in frame. Not verified live for any logged-in/started-phase composition — same DevPanel auth-gap limitation as prior sessions (§6.9), no Google credentials available in this session.

**Open follow-up items:**
- Awaiting live re-confirmation from Mert specifically on the Katılımcılar list and any other logged-in surfaces — only the logged-out landing page was checked live this session.
- If a similar flash/glitch ever gets reported on data fed by `useProfile`, `useLeaderboard`, or `useTournamentPhase`, revisit whether they're really exempt from the earlier `fromCache` fix — the reasoning above (atomic single-doc reads) held up under review but wasn't tested against a live repro the way `usePlayers` was.
- ~~Branch is unmerged and unpushed — sitting on `frontend-sweep` locally, per Mert's explicit "keep as-is for now."~~ **Stale as of 2026-08-06: `frontend-sweep` is fully merged into `main` and pushed** (`git branch --merged main` lists it; it is 0 commits ahead). Don't trust this line if you're trying to work out where the image-preload work lives — it's on `main`, and as of the 2026-08-06 entry above it also actually functions, which it did not before.
- The knockout-phase-end timeline node on `/about` still has no real date (placeholder noted in the `/about` entry below) — now doubly relevant since the knockout scoring rule is written into the page's own body text.

---

## 2026-08-03 — Home's logged-in league-phase composition (+ preknockout/knockout reuse), merged to `main`

Built and merged (branch `home-loggedin-leaguephase`, 8 commits): the `loggedin_leaguephase` composition of Home — the other "started" Home cell still on the generic `[Placeholder]` skeleton per the status grid, now that logged-out league-phase already shipped (previous entry family below). Design spec at `docs/superpowers/specs/2026-08-03-home-loggedin-leaguephase-design.md`, implementation plan at `docs/superpowers/plans/2026-08-03-home-loggedin-leaguephase.md` — built via brainstorm → spec → plan → inline task-by-task execution, from a hand-drawn wireframe.

**Layout**: welcome banner (identical to logged-in-not-started's — extracted into a new shared `HomeWelcomeBanner.tsx` so both pages can't drift) above a 3-column bento: `UpcomingMatchesPreview` + `RecentPostsPreview` stacked in col 1, `HomeHero` alone in col 2, a new `NearbyStandingsList` widget + global-only `ChatRoom` stacked in col 3. Per direct instruction, **no `FrameHeader`/title band on any of the five widgets** — a deliberate departure from `HomeLandingLoggedIn`'s navy-banded cells — and the online-count badge that used to live in Sohbet's header moved to a plain inline line above the chat transcript instead.

**Katılımcılar (the participant-list widget) and the Special Lobby switcher are absent from this page entirely** — replaced by `UpcomingMatchesPreview` and the new `NearbyStandingsList` respectively. `NearbyStandingsList` shows a 5-row window of the leaderboard centered on the viewer, **sliding** rather than padding at either edge (rank 1 or 2 shows ranks 1–5, last place shows the bottom 5, a viewer with no entry yet falls back to the top 5) — the windowing math is a small pure exported function (`selectNearbyWindow`), unit-tested directly against all four edge cases plus the middle case.

**The welcome banner's CTA is unconditionally hidden** on this page (`showCta={false}`) regardless of prediction-submission status — `/predictions` redirects home for anyone visiting once the tournament has started, so reusing the old `!submitterUids.has(me.uid)` check would have linked to a dead end for anyone who missed the deadline.

**Scope expanded mid-session with a Xerox pass** (see term definition at the top of this file): right after the league-phase composition shipped, Mert asked to reuse it wholesale for `loggedin_preknockout` and `loggedin_knockout` too — "populate the pages," his words, not a real pass at whether the layout is actually appropriate for those two phases ("we will go through all of them much much much later"). `HomePage.tsx` now routes all three states to the same `LoggedInHomeStarted`/`HomeLandingLoggedInStarted` pair; the only real change was threading the actual current `TournamentPhase` through to `MatchupPopup` (previously hardcoded to `"leaguephase"`) so its knockout branch still gates correctly if the admin sets the phase to `knockout` in production.

**Verified**: `tsc -b` clean, full suite green (822 tests / 114 files, up from 792/110 pre-branch). **Not verified live**: reaching `loggedin_leaguephase`/`preknockout`/`knockout` requires a genuine Google sign-in plus the DevPanel phase override (§6.9's documented auth gap), and no credentials were available in this session — same limitation the Matchup Popup branch hit below. Correctness rests on the automated suite (94 new/changed tests across the six touched-or-added files), not a click-through.

**Open follow-up, same backlog as every other entry below**:
- `loggedin_preknockout`/`loggedin_knockout` are Xeroxed from the league-phase layout, not a design decision — flagged directly by Mert as something to revisit in a real pass later.
- `PROJECT_STATE.md` §4/§6.1's Home description and page-access matrix don't mention any of this yet — mechanical update, not urgent.

---

## 2026-08-03 — Matchup Popup shipped, merged to `main`

Built and merged (branch `matchup-popup`, 15 commits): the Matchup Popup — the last of the three popup families on the status grid, previously "Not Finished" everywhere except `notLogged_notStarted`. It fills in two pre-existing "reserved for a future match-detail view" no-op click handlers that had been sitting inert since earlier branches: `FixtureRow.tsx`'s row click (upcoming-fixtures drawer/preview) and `TeamPopup.tsx`'s `MatchRow`'s row click (match-history rows). Design spec at `docs/superpowers/specs/2026-08-02-matchup-popup-design.md`, implementation plan at `docs/superpowers/plans/2026-08-02-matchup-popup.md` — built via brainstorm → spec → plan → subagent-driven-development (10 implementation tasks, each with its own dispatch + task review, plus a final whole-branch review), all from three hand-drawn wireframes explicitly flagged by Mert as rough intent sketches, not a literal visual spec.

**New component**: `src/leaderboard/MatchupPopup.tsx`, same `Dialog`+`Frame` recipe as `TeamPopup`/`ParticipantPopup`. Three phase-driven content modes: bare fixture card pre-tournament (nothing else exists yet to show), fixture card + each team's real rank/points + real predictor list (via the existing `getTeamPredictors`) once the league phase is running, and a real, styled-but-currently-unreachable knockout branch — deliberately built anyway per direct instruction, even though the knockout-prediction feature itself has no data model anywhere in the app (confirmed by an exhaustive grep during brainstorming, matches PROJECT_STATE §13-B). Unplayed-vs-decided fixture display reuses the same `useDevMatches()` source `TeamPopup`'s own match history already reads — same known production gap, inherited not solved.

**Wired into exactly 3 pages** — not the 5 originally assumed during brainstorming. Two rounds of correction during planning: `StatsHero` turned out to be `HeroCarousel` alone (no drawer, unlike `LeaderboardHero`) and `StatsPageView` has no `TeamPopup`/`ParticipantPopup` at all; `HomeHero` (logged-in Home's hero cell) is *also* just `HeroCarousel` alone, not a `LeaderboardHero` wrapper as first assumed, and `HomeLandingLoggedIn` has no `TeamPopup` either. Net result: only `LeaderboardPage.tsx`, `ProfilePage.tsx`, and `HomeLandingLoggedOutStarted.tsx` had any reserved trigger to fill in — Stats and the logged-in-Home dashboard have no fixture list or popup infrastructure of any kind today, so there was nothing to wire there. Worth remembering if either of those pages' own popup/fixture-list support gets built later — this branch didn't touch them.

**A real bug was caught and fixed by the final whole-branch review**, not by any of the 10 per-task reviews: the knockout branch was originally keyed on the component's `phase` prop — the *global*, admin-set tournament phase — rather than on the specific fixture being shown. Since `TeamPopup`'s match history opens this popup for real historical league fixtures regardless of the current global phase, the bug would have made any such fixture wrongly render as a knockout match (wrong header, real predictor list replaced by the "not built yet" placeholder) the moment the admin ever sets the tournament phase to `knockout` in production. Fixed by deriving `isKnockoutFixture` from whether the resolved `Fixture` is actually a member of the league-only `FIXTURES` array (always true today, by construction — `fixture` is only ever resolved via `FIXTURES.find`), which correctly and provably makes the knockout branch unreachable via any real prop combination, matching the original design intent instead of contradicting it. One accepted consequence: the knockout render branch is now untestable through `MatchupPopup`'s public props without reintroducing the exact reachability the fix removes — left uncovered by unit tests on purpose, documented in the fix commit and the branch's SDD ledger.

**Verified**: `tsc -b` clean, full suite green (110 test files / 792 tests, up from 108/774 pre-branch) before merge. Manual browser check confirmed the app loads with no new console errors and page-level gating still works for logged-out visitors; live in-browser interaction with the popup itself could not be verified end-to-end — `DevPanel`'s phase override requires a genuine Google sign-in (PROJECT_STATE §6.9's documented gap), and no credentials were available in this session. Correctness rests on the automated suite plus 10 task-level reviews and the final whole-branch review, not a live click-through.

**Open follow-up, same backlog as every other entry below**: `PROJECT_STATE.md`'s page-access matrix and feature tour don't mention the Matchup Popup at all yet — mechanical update, not urgent.

---

## 2026-08-02 — Codebase cleanup + Puan Durumu/quiz-answer login gating, merged to `main`

Built and merged (branch `minor-tweaks-cleanup`): two unrelated pieces of work done in the same branch — a general cleanup pass, and two access-control fixes flagged directly by Mert.

**Cleanup pass**, mostly working straight off `PROJECT_STATE.md` §13's dead-code/hygiene list: deleted `PlaceholderPage.tsx`, `SubmissionCounter.tsx`, and `LeaderboardCells.tsx` (`ParticipantCountCell`/`CurrentLeaderCell`) — all confirmed zero-caller; deleted the entire `team_logos/` asset directory (36 tracked PNGs, unreferenced anywhere); trimmed unused shadcn-vendor exports (`DialogTrigger`, `TableFooter`, `TableCaption`, `AvatarBadge`) and a leftover Next.js `"use client"` directive off `table.tsx`. Centralized the "Bu bölüm şu anda kullanılamıyor." gate string (previously duplicated across 6 files) into a new `src/components/ui/page-unavailable.tsx`; deduped `stats/surveyAggregates.ts`'s copy of `MESSI_OR_RONALDO_LABELS` to import `predictions/surveyLabels.ts`'s instead. Rewrote `scripts/set-dev-config.mjs`, which had gone stale against `DevConfig`'s real shape (still wrote a `tournamentActive` boolean that hasn't existed since the `phaseOverride` enum rework) and was silently no-oping every phase-override call.

**Access-control fixes**, both direct requests:
1. **Puan Durumu (`/leaderboard`) is now signed-in only** — `state/pageAccess.ts` and `AppShell.tsx`'s nav both changed from `statesFor(STARTED_PHASES, [true, false])` to `[true]`, same shape Stats already used. A logged-out visitor once the tournament's started no longer sees the nav link or gets anything but the standard blocked message at the route itself.
2. **`ParticipantPopup`'s quiz-answers widget is no longer reachable by a logged-out viewer.** New optional `viewerLoggedIn` prop (default `true`): when `false`, the `surveyResponses` read is skipped outright (rather than attempted and shown as a permission error) and a plain "giriş yapmalısınız" message renders instead. Wired to `viewerLoggedIn={Boolean(user)}` in `ForumPage.tsx` (the one page a logged-out visitor can still open this popup from, since Forum's been open to logged-out visitors since the previous entry below) and to `viewerLoggedIn={false}` in `HomeLandingLoggedOutStarted.tsx` (never has a signed-in viewer by construction).

**Note on scope, since it went back and forth this session**: the first pass at fix #2 also *removed* Home's participant-standings column (`LeaderboardTable`) and `ParticipantPopup` outright, on the reasoning that it was the one leak and the cleanest fix — and widened `LeagueTableList` to show full team names in the freed space. Mert corrected this: Home's 4-column layout (including the standings column and popup) should stay exactly as it was: only the actual `/leaderboard` route needed gating, and the quiz-answer leak should be closed via the `viewerLoggedIn` flag, not by deleting the widget. That's the version that shipped — `LeagueTableList` is back to showing `team.shortName`, not `team.name`.

**Verified**: `tsc -b` clean, full suite green (108 test files / 774 tests) before merge.

**Open follow-up, same backlog as every other entry below**: `PROJECT_STATE.md` §4's page-access matrix now has a second stale point beyond what's already noted — it still describes Leaderboard as "visible logged in or out, once started," which is no longer true. Mechanical update, not urgent.

---

## 2026-08-02 — Home's logged-out league-phase composition, merged to `main`

Built and merged (branch `home-loggedout-leaguephase`): the `loggedout_leaguephase` `VisibilityState` — one of the two Home states still showing the generic `[Placeholder]` skeleton per `PROJECT_STATE.md` §6.1 — now has a real composition. Design spec at `docs/superpowers/specs/2026-08-02-home-loggedout-leaguephase-design.md`, implementation plan at `docs/superpowers/plans/2026-08-02-home-loggedout-leaguephase.md`. Built from a hand-drawn wireframe: a 4-column bento (league table | upcoming fixtures + forum preview | hero carousel | participant standings), routed via a new early return in `HomePage.tsx`.

**New/changed components**: `HomeLandingLoggedOutStarted.tsx` (the composition itself — no banner/blurb, desktop-only, mirrors `LeaderboardPage.tsx`'s `TeamPopup`/`ParticipantPopup` cross-linking); `LeagueTableList.tsx` (new — single tall scrollable standings list, one row per team, row height matched to `LeaderboardTable`'s rhythm, static column-label header identical to `TeamTable`'s S/Takım/O/A/Y/AV/P); `FixtureRow.tsx` (extracted out of `UpcomingMatchesDrawer.tsx` — pure refactor, drawer's own rendering is unchanged — then given a `compact` layout variant and an `onSelectTeam` callback for the new `UpcomingMatchesPreview.tsx`, a static non-collapsible 3-fixture widget); `RecentPostsPreview.tsx` widened to accept `uid: string | null`, gating its like button the same way `ThreadCard.tsx` already does for the full Forum page.

**Sizing/layout is the product of many live-iteration rounds, not the design spec's first-pass numbers** — treat the shipped code as ground truth over the spec doc here (same caveat as the `/about` entry below). Notable: the upcoming-matches frame is sized to its content (`shrink-0` + explicit height) rather than a flex-grow ratio of the column, specifically so a future row-height change actually changes the visible card size instead of just leaving blank space — a real bug caught mid-session (flex-grow ratios are decoupled from content height by design).

**Production data fix, unrelated to this branch's code but blocking it visually**: `leaderboardCache/current` didn't exist in production at all (confirmed via a direct unauthenticated REST read — Firestore returned 404) despite 51 real `predictions/{uid}` docs and full `results` data existing. Root cause: `functions/leaderboard`'s `onDocumentWritten` triggers never fired for any of that existing data (every prediction/result write on record predates the trigger being live, and nothing had written to either collection since) — not a client bug, every leaderboard UI (old and new) was correctly rendering the empty state for a genuinely-missing doc. Fixed by a real value change to `results/ajax.matchesPlayed` (1→2, confirmed via `updateTime` bump) followed by an immediate revert back to 1 — Firestore silently no-ops identical-value writes (confirmed: `updateTime` doesn't move), so a genuine change-then-revert was necessary to actually fire the trigger. `leaderboardCache/current` now holds 52 real entries and will self-maintain from here on since every future prediction/result write recomputes it.

**Open follow-up items:**

- **`scripts/set-dev-config.mjs` is stale and silently no-ops the phase override.** It writes a `tournamentActive` boolean field that no longer exists in `DevConfig` (`useDevConfig.ts`'s real shape today is `phaseOverride: TournamentPhase | null` — a 4-value enum from the pagemap-round-01 rework, not the old pre/post boolean this script predates). Running it as documented does nothing useful for phase-switching. Needs either a rewrite to match the current schema or removal — whoever reaches for it next will lose time to this exact confusion (I did).
- **Two separate Google Cloud SDK installs are on this machine's PATH** (`Program Files (x86)\Google\Cloud SDK` and `AppData\Local\Google\Cloud SDK`) — not something I touched, but worth pruning one someday to remove the ambiguity.
- **`gcloud` intermittently stalls/crashes on this machine** (`OSError: [Errno 22] Invalid argument` on a stdout flush, per its own per-invocation logs in `%APPDATA%\gcloud\logs\`) — a Windows/Python console-pipe quirk, not a project or credentials issue. Resolved itself after the first couple of invocations each session; if it recurs, avoid `$(...)` capture in Git Bash and prefer PowerShell or file-redirected output.
- **`LeaderboardTable`'s rank-1 "leader" row lost its accent-green treatment this session** (row wash, rank color, points color all removed, per direct instruction) — this affects `/leaderboard` too, not just Home, since it's the same shared component. Not a regression, a deliberate style call.
- Per the original status grid this work came out of: `loggedin_leaguephase` and both `preknockout`/`knockout` phases (either login state) still render the shared `[Placeholder]` skeleton — `HomeLandingLoggedOutStarted` was written data-driven with nothing league-phase-specific baked in, so it's a plausible reuse candidate for the logged-out `preknockout`/`knockout` cells later, but that wiring is a separate future decision.
- Mobile — untouched, per the site-wide convention this whole effort followed (explicit instruction this session: "absolutely and utterly ignore mobile").
- `PROJECT_STATE.md` §6.1 and its Home status description are now out of date (this state is no longer a placeholder) — mechanical update, not urgent, same backlog as the other `PROJECT_STATE.md` drift noted below.

---

## 2026-08-02 — Forum opened to logged-out visitors + site-wide surname privacy, merged to `main`

Built and merged (branch `forum-loggedout-leaguephase`, 15 commits): Forum is now reachable (read-only) by logged-out visitors in every started tournament phase, and participant surnames are no longer served to any logged-out session anywhere in the app — not just on Forum. Design spec at `docs/superpowers/specs/2026-08-02-forum-logged-out-and-name-privacy-design.md`, implementation plan at `docs/superpowers/plans/2026-08-02-forum-logged-out-and-name-privacy.md`. What started as "let's do Forum first" expanded mid-brainstorm once it became clear Firestore rules can't filter individual fields out of a document read — the only real fix for surname privacy was a data-layer split, which also touched the Leaderboard family (already logged-out-visible today) and half a dozen other components that had never been asked to handle a missing `lastName`.

**Data layer**: new `publicProfiles/{uid}` Firestore collection (`firstName`/`photoURL`/`createdAt` only, public read); `profiles/{uid}` read tightened to signed-in-only (still holds `lastName`). `functions/leaderboard`'s computed `leaderboardCache` doc — a second, independent public leak of the same field — had `lastName` stripped from its output too. `usePlayers()` is now auth-aware (reads `profiles` when signed in, `publicProfiles` when not); `fullName()`/`initials()` centralized in `src/profile/deletedAccount.ts` and degrade to first-name-only instead of crashing when `lastName` is absent — adopted across Forum, the whole Leaderboard family, Chat, Lobbies, and Home, replacing 7+ duplicated inline `initials()` copies.

**Deployed** (2026-08-02, same session): `firestore.rules` live, `scripts/backfill-public-profiles.mjs` run against production (52/52 profiles backfilled), `functions/leaderboard` redeployed with the new output shape.

**Open follow-up items:**

- **`leaderboardCache/current` may still hold stale `lastName` fields** until the next real write to `predictions/{uid}` or `results/{teamId}` triggers a fresh server-side recompute — the deployed function is correct going forward, but nothing forced an immediate recompute of the already-cached document. Low urgency pre-launch (seed data only), but worth checking before this matters for real.
- **A stale, undocumented Cloud Function was found and deleted during this deploy**: `recomputeLeaderboardOnBracketPrediction` (region `europe-west8`) existed in production with no matching source anywhere in this branch or, as far as a repo search shows, any commit history. The name suggests knockout/bracket-prediction scoring — a feature `PROJECT_STATE.md` §6.2/§13-B explicitly notes has no code behind it anywhere. Mert confirmed it was fine to delete, but if bracket-prediction work exists on some other branch, worktree, or machine that never got merged, its deployed function is now gone — worth a mental note if that feature resurfaces looking "half-done."
- **`PROJECT_STATE.md` is now out of date** on: §4's page-access matrix (Forum is no longer "requires login? yes" unconditionally — it's login-required only for `notstarted`), §4's nav table (`loggedout_{started phase}` now includes Forum), §8.1's Firestore collections table (needs a `publicProfiles` row; `profiles`' read access is no longer "public"). Mechanical updates, not urgent, same as the `/about` merge's leftover PROJECT_STATE debt below.
- **Two infra warnings surfaced during the `functions/leaderboard` deploy**, unrelated to this work but now dated and worth tracking: Node.js 20 is deprecated (decommissions 2026-10-30) and the `firebase-functions` package version is outdated (breaking changes on upgrade). Neither blocks anything today.
- Per the original status grid this work came out of: Home's logged-out league-phase content, the Matchup Popup, and Participant Popup's remaining wiring are still separately unbuilt — none of that was in scope here.
- Mobile — untouched, per the site-wide convention this whole effort followed.

---

## 2026-08-02 — `/about` page shipped, merged to `main`

Built and merged (branch `about-page`, 3 commits, squash-free merge `88db2a9`): a static `/about` route, ungated, identical content in every `VisibilityState`. Design spec at `docs/superpowers/specs/2026-08-02-about-page-design.md` — **note it documents the page's first draft**, not the final shipped version; the page went through a significant unrecorded second pass after Mert reacted with a hand-drawn wireframe and then a further round of copy/layout/timeline corrections. The spec doc was updated once (after the wireframe pivot) but not again after the later corrections — treat the live code (`src/pages/AboutPage.tsx`) as ground truth over the spec doc for this page.

**Open follow-up items:**

- The timeline's 6th node ("Eleme Aşaması") uses a placeholder date (`2027-05-30`) with no real basis — there is no fixed knockout-phase-end date anywhere in the project yet. Mert said not to worry about it for now ("dates will be changed anyway"), but it needs a real value before this reads as anything but a guess.
- Mobile was explicitly *not* tuned for this page, per direct instruction ("completely disregard mobile from your thoughts"). The page uses fixed desktop-oriented sizing/grid with no responsive breakpoints, unlike every other page in the app. If mobile ever matters for `/about`, it needs a dedicated pass, not just a tweak.
- `PROJECT_STATE.md` itself is now slightly out of date on a few narrow points because of this merge: its §3 route table and §4 nav-link table don't list `/about` or "Hakkında," and its page-access matrix doesn't mention that About is nav-visible-but-ungated (same pattern as Home). Small, mechanical updates — not urgent, but worth doing whenever `PROJECT_STATE.md` next gets a refresh pass.
- A font-loading flicker fix (`useFontsReady`, gating the reveal animation on `document.fonts.ready`) was added locally inside `AboutPage.tsx` to fix a flicker Mert noticed on this page's large hero text. It was scoped to this one page, not applied site-wide — worth revisiting if the same flicker turns out to be visible elsewhere (smaller text elsewhere likely has the same underlying issue, just less noticeable).
