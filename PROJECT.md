# kupatakipucl

A Champions League prediction game for a private group of friends, written in
Turkish. Before the tournament starts, each participant drags all 36
league-phase teams into their predicted finishing order. Once matches begin,
everyone's picks are scored against the real table and ranked on a shared
leaderboard. The site also carries a forum, a global chat with private
sub-lobbies, per-team and per-participant detail popups, and a statistics page.

This document is the single source of truth for what the project currently is.
It was written on 2026-08-27 from a full read of the code on disk, plus a
questionnaire answered by Mert (the sole developer) and direct inspection of the
live Firebase/GCP project. Where something is unverifiable or unresolved, it
says so rather than guessing.

---

## 1. Status

**Not yet launched.** No edition has ever run with real participants, though the
frontend is now live at `https://kupatakipucl.com` as of 2026-08-28 — GitHub
Pages is enabled and the domain is repointed at it.

Mert intends to launch **2026-08-28**, into the `notstarted` phase only, and to
remain in that phase for roughly ten days until the league phase begins on
**2026-09-08**. Sign-up and league predictions both close at that moment.

Target audience is friends and friends-of-friends, sized for **up to 250
participants**. Turkish-only, permanently — there is no i18n layer and none is
planned.

The later phases are explicitly not ready. Knockout in particular is
unfinished and was deprioritised because it is months away. Section 11 lists
every known gap, sorted by when it actually starts to matter.

### Live infrastructure, verified 2026-08-27

Checked directly against the `kupatakipucl` GCP project rather than inferred
from code:

| Thing | State |
|---|---|
| Frontend hosting | **Live** at `https://kupatakipucl.com` via GitHub Pages, published from GitHub Actions. See §9 and DEPLOY.md. |
| Firebase Auth authorized domains | `localhost`, `kupatakipucl.firebaseapp.com`, `kupatakipucl.web.app`, **`kupatakipucl.com`**, **`www.kupatakipucl.com`** — the last two added 2026-08-27. |
| `tournamentState` collection | **Empty** — no `current` doc, so the app defaults to `notstarted`. This is the desired state for launch. |
| Leaderboard Cloud Functions | **All three deployed and ACTIVE** in `europe-west8`, since 2026-08-07. |
| `stopbilling` Cloud Run service | **Deployed**, since 2026-07-20. |
| Realtime Database | Provisioned, `europe-west1`. |
| Firestore region | `europe-west8`. |

### Production database contents, re-verified 2026-08-27 (after the purge)

The 304 documents of development seed data described in earlier revisions of
this document are **gone** — `scripts/purge-dev-data.mjs` removed them. What
remains, read directly from the Firestore REST API:

| Collection | Docs | What it is |
|---|---|---|
| `devConfig` | 1 | `devConfig/state`. Dev-panel only; production never reads it. Harmless. |
| `lobbies` | **0 documents, 5 phantom parents** | Five deleted lobby documents whose `messages` subcollections survived them, holding **8 orphaned chat messages** between them. Live evidence of §11 problem 13. |

Every other collection is absent, including `tournamentState` (so the app
correctly defaults to `notstarted`), `results`, and `leaderboardCache`. The
leaderboard cache docs are created by the first real prediction submission; the
recompute safety net correctly stands down while the control doc is absent.
Storage and the Realtime Database are both empty.

The phantom lobby parents do not render anywhere — no lobby document means no
lobby in the UI — so they are cosmetically invisible, but they are real
documents accruing real storage and they show the delete path is incomplete.

---

## 2. Tech stack

**Frontend**
- React 18 + TypeScript 5, built by Vite 5
- `react-router-dom` 6 in **HashRouter** mode (`#/path`), `base: "./"` — both
  already correct for static hosting with no rewrite rules
- Tailwind CSS 4 via `@tailwindcss/vite`; shadcn components (`base-nova` style)
  built on `@base-ui/react`
- `@dnd-kit` for the prediction ranker's drag and drop
- `motion` for animation, `lucide-react` for icons, `sonner` for toasts
- Inter (`@fontsource-variable/inter`) — one family for every text role

**Backend** — Firebase, project `kupatakipucl`
- Firestore (`europe-west8`) for nearly all data
- Realtime Database (`europe-west1`) for presence and typing only
- Firebase Storage for profile photos and forum images
- Firebase Auth, Google sign-in via popup, sole provider
- Cloud Functions v2 (`functions/leaderboard`) + a Cloud Run service
  (`functions/stopbilling`)

**Testing** — Vitest + Testing Library + jsdom for unit tests; a separate
Vitest config driving the Firestore emulator for integration tests.

---

## 3. Architecture

### 3.1 The visibility-state model

The single most important idea in the codebase. Every page's content and the
nav itself are a function of one value:

```
VisibilityState = {loggedin|loggedout}_{notstarted|leaguephase|preknockout|knockout}
```

Eight states, defined in `src/state/visibilityState.ts`. The phase half comes
from `src/tournament/useTournamentPhase.ts`, which live-reads
`tournamentState/current` from Firestore — a **manually set admin value**, not
derived from any date. A missing doc means `notstarted`.

`src/state/pageAccess.ts` maps each page to the states it is allowed in, and
`src/shell/navLinks.ts` maps each state to its nav links. `AppShell.test.tsx`
asserts the two tables agree, which is only meaningful because both shells read
the same `NAV_LINKS` object.

Access by page:

| Page | Allowed in |
|---|---|
| `/` Home | always, never gated |
| `/about` | always, never gated |
| `/predictions` | logged in, all phases |
| `/knockout-predictions` | logged in, all phases |
| `/forum` | logged in all phases; logged out only once started |
| `/leaderboard` | logged in, started phases only |
| `/stats` | logged in, started phases only |
| `/profile` | logged in, all phases |
| `/join/:inviteId` | logged in (headless, redirects) |
| `/dev` | dev builds only (`import.meta.env.DEV`) |

A blocked page renders `PageUnavailable` ("Bu bölüm şu anda kullanılamıyor.").

### 3.2 The desktop/mobile fork

`src/lib/useIsMobile.ts` exposes one media query, `(max-width: 1023px)`, via
`useSyncExternalStore` so the very first render already knows the width. At and
above 1024px the app pins `html/body/#root` to a fixed viewport with internal
scroll regions; below it, the document scrolls.

Mobile is a **separate component tree**, not a responsive reflow. `AppShell`
picks `MobileShell` or `DesktopShell`, and eight pages fork again internally.
The mobile shell puts chat in a right-edge drawer and hoists all three popups
into a single shell-level `MobilePopupHost` whose data hooks mount lazily on
first open.

### 3.3 App composition

```
ErrorBoundary
└── AuthProvider                 Firebase Auth session (+ dev override)
    └── ProfileGate              blocks until fonts ready, then until a
        │                        signed-in user has BOTH a profile and a
        │                        survey response; otherwise renders SignupFlow
        └── HashRouter
            └── AppShell         DesktopShell | MobileShell
                └── Routes
```

`ProfileGate` deliberately does not treat "profile but no survey" as resumable —
abandoning mid-quiz restarts signup from step 0. See §11, this is the source of
a serious defect.

### 3.4 Data-loading conventions

- **Live listeners** (`onSnapshot`) for anything that must update in place:
  profiles, players, leaderboard cache, tournament phase, chat, forum, lobbies.
- **One-shot** `getDocs`/`getDoc` for slower-moving data: results, dev matches,
  survey responses, knockout predictions.
- **`fromCache` guard**: several listeners discard the first snapshot if
  `metadata.fromCache` is true, because Firestore can synthesise a partial
  snapshot from unrelated cached docs and it would otherwise read as "loaded".
- **Session cache** (`src/lib/sessionCache.ts`): two layers — an in-memory Map
  plus `localStorage` under prefix `kupatakip-cache:` with a 5-minute TTL. All
  storage failures are swallowed. Lets a page navigation show last-known data
  instead of a skeleton.
- **Shared subscriptions**: `useProfile` and the lobby hooks keep a module-level
  registry so N mounts of the same uid open one listener, closed when the last
  unmounts.
- **Image preload gate** (`src/lib/useImagePreload.ts`): pages reveal only once
  their images have settled, so nothing pops in afterwards. Settled URLs are
  remembered process-wide.
- **Loading-stuck timeout** (`src/lib/useLoadingStuck.ts`, added 2026-08-28):
  a live `onSnapshot` listener's channel can be silently blocked client-side
  by an ad/privacy blocker (`net::ERR_BLOCKED_BY_CLIENT` on
  `Listen/channel` — see §11 problem 36), which never surfaces as a
  catchable error, so a hook gated on the first snapshot sits in
  `loading: true` forever. Any new page or hook that blocks its reveal on a
  live-listener `loading` flag should route that flag through this hook and
  show `SlowLoadNotice` (`src/components/ui/slow-load-notice.tsx`) once
  stuck, the way `LoggedInHome`, `LoggedInHomeStarted` and `ForumPage` do —
  otherwise it inherits the same silent-hang risk.

---

## 4. Feature map of `src/`

### `auth/`
`AuthProvider` wraps `onAuthStateChanged` and exposes `{user, loading}`. In dev
builds only, a dev-panel override can fake the signed-in state (Firestore rules
still see the real session). `LoginButton` does `signInWithPopup` with Google;
`LogoutButton` signs out and navigates home.

### `profile/`
- `useProfile(uid)` — shared live listener per uid, session-cached. Also exports
  `saveProfile`, `updateProfilePhoto`, `deleteProfile`.
- `usePlayers()` — **auth-aware**: signed-in users subscribe to `profiles` (full
  data), signed-out to `publicProfiles` (never contains `lastName`). Cache keys
  are split so a mid-session login can't cross-serve the wrong shape.
- `ProfileGate` — the signup gate described above.
- `deletedAccount.ts` — a uid with no matching player means a deleted account;
  every author-lookup surface renders "Silindi" with the logo as avatar rather
  than leaking a raw uid.
- Photos are compressed client-side to **96px max, quality 0.5, WebP** and
  uploaded to a never-reused path so they can carry an immutable cache header.

### `signup/`
An 11-step full-screen flow rendered outside `AppShell`:

1. `welcome` (auto-advance 2600ms) · 2. `photo` · 3. `name` → **writes the
profile** · 4. bounce · 5. age wheel (10–90, default 25) · 6. football knowledge
(1–7) · 7. Messi/Ronaldo · 8. Süper Lig team · 9. UCL team (36 crests + "Yok")
· 10. device → **writes the survey** · 11. bounce → done.

Back-navigation preserves answers and skips bounce screens. The quiz is
mandatory and one-time: `surveyResponses` forbids update and delete outright.

### `predictions/`
The core mechanic. `TeamRanker` is a `@dnd-kit` two-panel drag-and-drop: 36
numbered slots on the left, a crest grid (desktop) or named list (mobile) on the
right. Slot-to-slot drags swap; dragging out clears. Submit unlocks only when
all 36 slots are filled. Hovering a row for 2s reveals the ±2 scoring band.

`/predictions` is a **first-submission-only door** — it redirects home if the
phase isn't `notstarted` or a prediction already exists. Revision afterwards
happens in a dialog on the profile page, behind an overwrite confirmation.

Also here: the survey types/labels, the intro "movie beats" shown before the
ranker, and the scoring-example diagram.

### `knockout/`
A four-round bracket — Round of 16 → quarters → semis → champion, 15 picks
total. Picking a team evicts it from every later round. Three separate bracket
implementations exist: `KnockoutStagePicker` (desktop editor, carries its own
duplicated copy of the pick logic), `KnockoutBracket` (compact, desktop
read-only and editable), and `MobileKnockoutBracket`.

**The Round of 16 is eight hardcoded pairings** in `mockKnockoutData.ts`,
including four all-domestic ties no real draw permits. They drive every knockout
surface in the app. There is no knockout scoring anywhere.

### `leaderboard/`
The largest domain. Participant standings, the 36-team league table, three
popups, and the pure scoring logic.

**Scoring** (`scoring.ts`): a pick is correct when
`|predicted − actual| < 3` — so deltas of 0, 1 or 2 score and exactly 3 does
not — worth **3 points**. Maximum 108. Mert's rationale: league placement is
volatile, so a ballpark-correct guess is all that's expected. The same function
is hand-duplicated in the Cloud Function.

**Qualification bands** (`qualification.ts`), real UEFA structure: 1–8 direct to
the Round of 16, 9–24 playoff round, 25–36 eliminated.

**Ranking** (`ranking.ts`): standard competition ranking, ties share a rank and
the next rank skips. No movement arrows.

Popups: `TeamPopup` (predictors, match history, and a generated squad),
`ParticipantPopup` (their full 36-row prediction, quiz answers, rank history
chart), `MatchupPopup` (one fixture, both teams' predictor columns).

Several modules here import fixtures and match outcomes from `src/devpanel/` —
see §11, this is the biggest structural problem in the repo.

### `forum/`
A flat `forumPosts` collection; replies are documents with `parentId` set. Root
posts render as a grid of fixed-height thread cards; clicking opens a full
thread dialog. Supports posting, replying, **quoting** (a text snapshot capped at
140 chars, so it survives the original being deleted), likes (denormalised onto
the post doc), editing text, hard delete with cascade to replies, image upload
(compressed to 400px/0.45), and @-mentions.

Search filters only already-loaded root posts by text or author name — never
reply text, never unpaged history.

### `chat/`
One `ChatRoom`/`ChatComposer` pair serves two scopes: `lobbyId === null` is the
global room (`messages`), otherwise a lobby's own subcollection. Newest 50 live,
older pages loaded on demand. Messages group by sender within 5 minutes, with
date dividers. Quoting, soft delete (never hard — the doc stays, readers render
a placeholder), mentions with an amber row tint, and a search over the last 2000
messages.

**There is no `/chat` page.** Chat is a Home bento cell on desktop and a
shell-level drawer on mobile.

Presence and typing live in the **Realtime Database**, moved off Firestore
because a live listener plus heartbeat fanned every write out to every watcher.
RTDB's server-side `onDisconnect()` needs no heartbeat and is metered
separately.

### `lobbies/`
Private sub-groups. A lobby doc plus a `members` subcollection (the source of
truth) plus a `memberUids` array denormalised onto the lobby doc purely so the
read rule can check membership without a second read.

Caps: 3 owned, 3 joined, 15-char names. Invites are `lobbyInvites` documents
whose id *is* the token, valid **exactly one hour**, reusable by any number of
people, and never revocable. `/join/:inviteId` is a headless route that attempts
the join once and redirects home with a toast on failure.

Leaving as the sole creator deletes the lobby; leaving as creator with others
transfers ownership to the earliest joiner.

### `home/`
Six distinct compositions across the eight states, forking again for mobile:

| State | Desktop | Mobile |
|---|---|---|
| `loggedout_notstarted` | `HomeLandingLoggedOut` — hero band, countdown, avatar stack, sign-in | `MobileHomeNotStartedLoggedOut` |
| `loggedin_notstarted` | `HomeLandingLoggedIn` — 4-cell bento: participants, forum, hero, chat | `MobileHomeNotStartedLoggedIn` |
| logged-out started ×3 | `HomeLandingLoggedOutStarted` | `MobileHomeStartedLoggedOut` |
| logged-in started ×3 | `HomeLandingLoggedInStarted` | `MobileHomeStartedLoggedIn` |

The `preknockout` and `knockout` states reuse the `leaguephase` composition
verbatim — the code marks this as unconsidered placeholder reuse, not design.

`deadlines.ts` holds the two shared dates:
`TOURNAMENT_START_ISO = 2026-09-08T00:00:00+03:00` (real) and
`KNOCKOUT_PREDICTION_DEADLINE_ISO = 2027-02-11T00:00:00+03:00` (self-declared
placeholder). **Neither gates anything** — both only drive countdown displays.

### `stats/`
Signed-in, started phases only. Computes team bias (predicted vs actual
position), team agreement (population standard deviation of predicted
positions), and survey distributions across age buckets, football knowledge,
Messi/Ronaldo and Süper Lig support. Roughly half the page is fabricated: three
of seven tournament widgets are invented footballers, and the UCL-team chart is
a hardcoded array even though the real answers exist in `surveyResponses`.

### `devpanel/`
Dev-only UI at `/dev`. Sets a phase override, a fake login state, a display
date, and marks fixtures decided one at a time (enforcing that earlier matches
resolve first). Deciding a match recomputes all 36 `results` docs in one batch.

`fixtures.ts` holds 144 fixtures — the real 2025-26 calendar with years shifted
forward, a placeholder. `standings.ts` computes the table using **synthetic
scorelines: every win is 1-0, every draw 0-0**; only `matchesPlayed` is real.

**This folder is not isolated from production** — see §11.

### `shell/`, `components/ui/`, `styles/`
`AppShell` forks the two shells. `MobilePopupHost` hoists the three popups to
the shell on mobile with lazy-mounted data hooks. `components/ui/` is shadcn
plus three hand-rolled pieces: `frame.tsx` (the picture-frame cell every page
composes from), `sheet.tsx`, and `responsive-dialog.tsx` (a dialog that becomes
a bottom sheet on a phone).

`styles/colors.css` is the single source of truth for every colour. The app is
permanently single-theme dark; the `.dark` class exists only so shadcn's own
`dark:` classes never activate from the OS setting.

---

## 5. Data model

### Firestore

| Collection | Doc id | Shape |
|---|---|---|
| `profiles/{uid}` | uid | `firstName, lastName, photoURL, createdAt` |
| `publicProfiles/{uid}` | uid | `firstName, photoURL, createdAt` — **never `lastName`** |
| `surveyResponses/{uid}` | uid | `age, footballKnowledge, messiOrRonaldo, superLigTeam, uclTeam, device, submittedAt` |
| `predictions/{uid}` | uid | `ranking: string[36], submittedAt, updatedAt` |
| `knockoutPredictions/{uid}` | uid | `quarterFinalists[8], semiFinalists[4], finalists[2], champion, submittedAt, updatedAt` |
| `results/{teamId}` | team id | `position, points, goalDifference, goalsFor, goalsAgainst, matchesPlayed?` |
| `leaderboardCache/current` | — | `entries[], computedAt` — written only by the Cloud Function |
| `leaderboardCache/control` | — | concurrency-control doc for the recompute |
| `tournamentState/current` | — | `phase` |
| `messages/{id}` | auto | `uid, text, createdAt, mentionedUids?, deleted?, quoted*` |
| `forumPosts/{id}` | auto | `uid, text, imageURL, parentId, createdAt, editedAt, mentionedUids, quoted*, likedByUids` |
| `lobbies/{id}` | auto | `name, createdByUid, createdAt, memberUids[]` |
| `lobbies/{id}/members/{uid}` | uid | `uid, joinedAt, viaInviteId` |
| `lobbies/{id}/messages/{id}` | auto | `Message` + optional `system` |
| `lobbyInvites/{id}` | auto | `lobbyId, createdByUid, createdAt, expiresAt` |
| `devConfig/state`, `devMatches/{fixtureId}` | — | dev-panel state |

Note the knockout field naming is off by one round: `quarterFinalists` holds the
**Round of 16 winners**, and so on up.

### Realtime Database
- `presence/{uid}` → `true`, with a server-side `onDisconnect().remove()`
- `typingStatus/{uid}` → `{updatedAt}`, rules enforce a ≥1000ms write floor

### Storage
- `profile-photos/{uid}-{timestamp}` — signed-in read, owner create/delete, 5MB,
  images only
- `forum-images/{uid}-{timestamp}` — public read, signed-in create, 5MB,
  PNG/JPEG/WebP only

Both use fresh never-reused paths so uploads can carry
`max-age=31536000, immutable` safely; the previous object is explicitly deleted
on replacement.

### Security rules — current posture

The rules file is unusually well-reasoned and heavily commented, but it was
written for a pre-launch site with no real users, and several rules say so
explicitly. Summary:

- `profiles` signed-in read; `publicProfiles` public read (this split exists so
  logged-out, potentially search-indexed visitors never receive a surname —
  Firestore cannot filter fields out of a read, so it needs a separate
  collection)
- `predictions`, `knockoutPredictions`, `forumPosts`, `results`,
  `tournamentState`, `leaderboardCache` — **public read**
- `surveyResponses` — signed-in read, owner create, **no update or delete ever**
- `messages` / lobby messages — signed-in (or member) read, own-uid create,
  update restricted to setting `deleted`, no delete
- `forumPosts` — own-uid create with quote-integrity checks (a quote must point
  at a real post and name its true author); update either by the author for
  text/mentions, or by anyone toggling exactly their own uid in `likedByUids`;
  delete by the author or by the owner of the reply's root post
- `lobbies` — read gated on `memberUids`, with a carefully constrained update
  rule covering rename, ownership transfer and membership sync
- `lobbyInvites` — `get` allowed, `list` explicitly denied so invites can't be
  enumerated
- `leaderboardCache` — nobody can write; only the Admin SDK
- **`results`, `tournamentState`, `devConfig`, `devMatches` — writable by ANY
  signed-in user.** Deliberate pre-launch loosening. See §11.

Client-side length caps (360 chars for posts and messages, 15 for names and
lobby names) are mirrored in the rules, since the client caps are trivially
bypassable. There is no server-side rate limiting; `useSendCooldown` applies a
1200ms client cooldown and is candid that it stops accidents, not attackers.

---

## 6. Cloud Functions

Two independent codebases, deployed by different tools.

### `functions/leaderboard` — Firebase Functions v2, `europe-west8`
Recomputes the whole leaderboard whenever a prediction or a result changes, and
writes it to `leaderboardCache/current`, so clients read **one document**
instead of downloading every prediction and profile and redoing the scoring on
each visit.

Three exports, all currently deployed and active:
- `recomputeLeaderboardOnPrediction` — `onDocumentWritten("predictions/{uid}")`
- `recomputeLeaderboardOnResult` — `onDocumentWritten("results/{teamId}")`
- `recomputeLeaderboardSafetyNet` — `onSchedule("every 5 minutes")`, region
  pinned explicitly because scheduled functions don't inherit the database's
  region

The interesting part is `recomputeGuard.js`, whose three pure predicates are
unit-tested exhaustively:

- **`shouldSkipAlreadyCovered`** — if a finished recompute already read data
  after this write committed, stand down immediately. This is what makes
  coalescing work when triggers run *sequentially*, which is what the emulator
  does and where a debounce alone collapses nothing.
- **`shouldProceedAfterDebounce`** — after a 2s debounce, normally only the
  newest request proceeds; a 30s staleness ceiling prevents starvation under a
  sustained write stream.
- **`shouldCommitRecompute`** — the load-bearing one. Stored results stay
  monotonic in read freshness under any interleaving, so an older read can never
  overwrite a newer one.

The design's stated reasoning: "the leaderboard is quietly wrong" is the worst
failure this app has, so the debounce is not trusted on its own.

Deploy: `firebase deploy --only functions:leaderboard`

### `functions/stopbilling` — Cloud Run, `europe-west8`
A budget killswitch. Subscribed to a Pub/Sub billing-alert topic; when reported
cost exceeds budget it **unlinks the billing account** from the project. Needs
`cloudbilling.googleapis.com` enabled and a dedicated service account with
`roles/billing.projectManager` + `roles/browser`.

Deploy with `gcloud run deploy` from the CLI. Its README warns specifically
against the Cloud Run console's "Edit & deploy new revision" flow, which has
silently reverted the service to a placeholder image before.

The scoring function is **duplicated by hand** between
`src/leaderboard/scoring.ts` and `functions/leaderboard/index.js`, with a
comment instructing that they be kept in sync and no test enforcing it. Mert's
decision: leave it.

---

## 7. Scripts and tools

`scripts/` — all one-off, all authenticating as the active `gcloud` user via the
Firestore REST API, no service-account key:

| Script | Purpose |
|---|---|
| `seed-dummy-participants.mjs` | Seeds 50 synthetic profiles + predictions |
| `seed-dummy-surveys.mjs` | Seeds their survey answers |
| `backfill-public-profiles.mjs` | One-off migration populating `publicProfiles` |
| `set-dev-config.mjs` | Flips `devConfig/state` — **dev builds only, no effect on production** |
| `import-club-badges.mjs` | Copies badge SVGs from `assets/` into `public/` under clean slugs and regenerates `clubBadgeSlugs.ts` |
| `crop-hero-images.mjs` | Crops hero portraits to 800×1200 using per-photo focal points |
| `gen-og-image.mjs` | Renders `public/og-image.png`, reading colours from `colors.css` |

`tools/mobile-wireframe/` — a self-contained, dependency-free HTML tool for
drawing mobile wireframes on a 12×20 grid across all eight visibility states.
Its saved output (`mobile-wireframes.json`, 2026-08-06, 96 screens) drove the
mobile fork.

**`public/` vs `assets/`**: `public/` is shipped (29 club badges, 17 hero
portraits, 3 brand marks, the OG image); `assets/` is raw working material
(original SVGs with messy filenames, uncropped source photos, a crop-tuning
page). `assets/` currently also contains **7 newly added badge SVGs that have
not yet been imported into `public/`**.

---

## 8. Testing

- **Unit/component**: `npm test` (Vitest, jsdom, `test/setup.ts` polyfilling
  ResizeObserver, IntersectionObserver, matchMedia, `scrollIntoView`,
  `createObjectURL` and `Image`). **127 test files** against 204 source files —
  most modules have a sibling test, and the tests are frequently the clearest
  statement of intended behaviour.
- **Integration**: `npm run test:integration` runs
  `integration/leaderboardRecompute.itest.ts` against the Firestore emulator.
  The `.itest.ts` suffix keeps it out of the default suite. It asserts that a
  36-document results batch collapses to far fewer recomputes, and that no
  prediction is ever dropped when many are submitted at once.

  Requires **JDK 21+** on PATH; this machine's default `java` is 1.8, so it must
  run with Android Studio's bundled JRE:
  ```
  JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" \
  PATH="$JAVA_HOME/bin:$PATH" npm run test:integration
  ```
- **Not verified in this audit**: `node_modules` was not installed when this
  document was written, so the suite was not run. Mert reports it passed when he
  last checked.

---

## 9. Build and deploy

```
npm run dev              vite dev server (start-dev.bat pins port 5173)
npm run build            tsc -b && vite build  →  dist/
npm run preview          serve the built output
npm test                 unit suite
npm run test:integration emulator-backed integration suite
```

**The frontend deploys to GitHub Pages via GitHub Actions.** See
**[DEPLOY.md](DEPLOY.md)** for the full runbook; this is the summary.

`firebase.json` configures firestore, storage, database and functions and has
**no `hosting` block** — Firebase Hosting is not used and `kupatakipucl.web.app`
will never serve this site. The backend (rules, functions, the stopbilling Cloud
Run service) is still deployed by hand from Mert's machine.

Two workflows, added 2026-08-27:

- `.github/workflows/ci.yml` — every branch and PR: `tsc -b`, the unit suite,
  and a build. A second job runs the Firestore-emulator integration suite on a
  JDK 21 runner. Publishes nothing.
- `.github/workflows/deploy.yml` — pushes to `main` and manual dispatch: tests,
  builds, asserts the build is sound, and publishes `dist/` as a Pages artifact.
  Deploying from an artifact rather than a `gh-pages` branch keeps build output
  out of the repository.

`base: "./"` and HashRouter mean Pages needs no rewrite rules or 404 fallback.
**Runtime asset paths are root-absolute** (`/club-badges/…`, `/hero/…`,
`/brand/…`), so the build is correct at a domain root and only at a domain root;
on a project subpath every crest 404s. `public/CNAME` prevents that, and
`deploy.yml` asserts it survived the build.

Firebase config is read from Vite env vars (`.env.example` lists the six keys).
**`.env.local` is *not* committed** — an earlier revision of this document said
it was, which was wrong and would have produced a CI build shipping
`apiKey: undefined`. `.env` **is** committed, deliberately: Vite
inlines every `VITE_*` var into the public JS bundle, so all six values are
already served to every visitor in `dist/assets/index-*.js`. Hiding them would
protect nothing. Access is controlled by the security rules in §5 and by Firebase
Auth's authorized-domain list, which now reads `localhost`,
`kupatakipucl.firebaseapp.com`, `kupatakipucl.web.app`, `kupatakipucl.com`,
`www.kupatakipucl.com` — verified by reading it back from production.

**Live at `https://kupatakipucl.com`.** Pages is enabled with GitHub Actions as
its source, and Spaceship's parking-page A records have been replaced with
GitHub's. DEPLOY.md §3 has the exact steps, in case anything needs redoing.

### Repository and branches

Remote: `https://github.com/mertgurgenyatagi/kupatakipucl.git` (public).
Default branch: `main`.

The repository carries a long tail of merged feature branches
(`forum`, `signup`, `scaling`, `mobile-wireframe-tool`, `great-reform`, …), most
of which are historical and can be ignored.

This document and `HANDOVER.md` were committed on `memory-reset`, which was
level with `main` at the time, then fast-forwarded into `main`:

```
git add -A
git commit          # "docs: blank-slate audit — PROJECT.md and HANDOVER.md"
git push origin memory-reset

git checkout main
git merge memory-reset
git push origin main

git checkout -b launch-prep
git push -u origin launch-prep
```

That commit also records the deletion of the previous documentation tree
(`HANDOVER.md`, `PROJECT_STATE.md`, `docs/superpowers/**`), which had been
removed from the working tree before the audit began. **`launch-prep`, cut from
`main`, is the branch for the pre-launch work in §11.**

---

## 10. Conventions worth knowing

- **Comments carry the reasoning.** Much of this codebase explains *why* at
  length, often citing a decision, a date, or a specific bug. That reasoning is
  frequently the only surviving record — treat it as valuable even where it has
  drifted.
- **Stale document references.** About 38 files cite `SPEC.md`,
  `PAGEMAP_SPEC.md`, `DESIGN-SPEC`, `PROJECT_STATE.md`, `HANDOVER.md` and
  `docs/superpowers/…`. **None of these exist any more.** This document replaces
  them. Comments also reference `SurveyForm.tsx`, `devpanel/StatsPageTuner.tsx`
  and `TeamPopupTuner.tsx`, none of which exist either.
- **"Cursorify"**: no I-beam cursors anywhere; the root sets `cursor-default`
  and interactive elements opt into `cursor-pointer` individually.
- **Frames**: pages compose from `Frame` cells rather than one page-filling
  layout, each allowed its own internal scroll.
- **Turkish throughout** — every user-facing string, including error messages.

---

## 11. Known problems

Sorted by when each actually starts to matter. Everything here was verified
against the code; the disposition column records Mert's decision.

### Before launch

| # | Problem | Disposition |
|---|---|---|
| 1 | **Team list is the wrong season.** `teams.ts` still holds the 2025-26 field and was last modified 2026-07-23. The real 2026-27 list was confirmed 2026-08-26 and is not in the project. Predictions submitted against the old list store team ids that will not exist after the swap, and `computeScore` silently skips unmatched ids rather than erroring. | Must swap before any real sign-up |
| 2 | **Crests do not match teams.** `teamCrestSrc` hashes the team id into a 29-badge list, so no team shows its own badge and 36 teams share 25 badges. 7 new badge SVGs were added to `assets/` on 2026-08-27 but have not been imported into `public/`, and `clubBadgeSlugs.ts` is unchanged. | Fix — real crests, correctly mapped |
| 3 | **Production database holds 50 dummy participants**, plus synthetic `results`, 16 decided `devMatches`, a stale `leaderboardCache`, and test forum/chat content. Home would show 53 participants, 50 fictional. | Must be cleaned before launch |
| 4 | **Signup lockout.** Anyone who abandons signup after the last quiz step is permanently locked out: `saveSurveyResponse` is a plain `setDoc`, the rules forbid update, and `ProfileGate` always restarts from step 0. Unrecoverable for that account. | Fix |
| 5 | ~~**No deployment exists.**~~ **Done, live 2026-08-28.** GitHub Actions builds and publishes to GitHub Pages, `kupatakipucl.com` and `www.` are authorized in Firebase Auth, the `og:`/`twitter:` tags point at the real host, Pages is enabled, and DNS points at GitHub. See [DEPLOY.md](DEPLOY.md). | Done |
| 6 | **`results`, `tournamentState`, `devConfig` and `devMatches` are writable by any signed-in user.** A participant could rewrite the standings or push the whole site into a phase that isn't ready. | Lock down |
| 7 | **Other people's predictions are world-readable before the league phase.** The UI hides them; the data is directly fetchable. | Should not be visible pre-league-phase |
| 8 | **Knockout entry point is reachable during `notstarted`.** `/knockout-predictions` is allowed in every logged-in phase and has no already-submitted redirect, so brackets can be submitted against fake pairings. Not linked from the nav, so URL-only. | Hide until preknockout |
| 9 | ~~**Mobile create-lobby button does nothing.**~~ **Done 2026-08-27.** Both lobby dialogs are mounted on the mobile branch of `LoggedInHome`. | Done |
| 10 | **The drag-and-drop ranker is being replaced.** Mert intends to change this interaction; it is the one thing every participant must complete. | Redesign pending |
| 11 | ~~**Profile shows raw team slugs.**~~ **Done 2026-08-27.** `uclTeamLabel()` in `surveyLabels.ts`, applied at all three call sites — the profile page *and both branches of `ParticipantPopup`*, which this entry missed. | Done |
| 12 | **Lobby management was desktop-only.** **Fixed for the `notstarted` home 2026-08-27** — a settings gear in the mobile participants header opens `LobbyManagementPanel`, now a bottom sheet on a phone. **Still open for the started-phase mobile home**, which has no lobby UI of any kind and no participants cell to hang one on; unreachable until 2026-09-08. | Partly done |
| 13 | ~~**Deleting a lobby leaves its messages in the database.**~~ **Done 2026-08-27.** Root cause was `allow delete: if false` in the rules, so the cascade was impossible. Rules changed and deployed; `leaveLobby`'s last-member-out branch now runs the same cascade; 8 orphaned messages under 5 phantom lobbies purged from production. | Done |
| 36 | ~~**Home and Forum can hang blank forever for a signed-in participant running an ad blocker.**~~ **Fixed at the root 2026-08-28**. `onSnapshot`'s real-time channel gets blocked client-side by some ad/privacy blockers as `net::ERR_BLOCKED_BY_CLIENT`. Previously fixed at the symptom via `useLoadingStuck` to show a notice. Now, `useLoadingStuck` correctly triggers an automatic fallback to one-shot `getDoc()` / `getDocs()` reads in `useProfile`, `usePosts`, `useMessages`, and `usePlayers` — hitting a different endpoint that bypasses filter lists, allowing the app to initialize seamlessly (sans live updates). | Done |
| 37 | ~~**Multiple devices clobber presence state.**~~ **Fixed 2026-08-28**. Because `usePresenceHeartbeat` registered `onDisconnect().remove()` against a simple boolean `presence/{uid} = true`, logging in on two devices caused the later device's close event to nuke the earlier device's presence. Migrated to RTDB connection IDs via `push()` so each session is managed independently. | Done |
| 38 | ~~**Prediction page impossibly laggy and unscrollable on mobile.**~~ **Fixed 2026-08-28**. The `TouchSensor` blocked native browser scrolling; added `touch-action: pan-y` to draggable items to restore scrollability. Extremely laggy due to unmemoized React trees and expensive `pointerWithin` intersections on 72 nodes; wrapped `TeamCrest` in `React.memo` and changed `@dnd-kit` collision detection to `closestCenter`. | Done |

### By 2026-09-08 (league phase)

| # | Problem |
|---|---|
| 14 | **No way to enter real match results.** The dev panel is the only writer of `results`, and it writes synthetic 1-0/0-0 scorelines. Intended solution: a live API. |
| 15 | **Production code depends on the dev panel.** `TeamPopup`, `MatchupPopup`, `ParticipantPopup`, `rankHistory` and `teamMatchHistory` import fixtures and `devMatches` from `src/devpanel/`, while `upcomingFixtures.ts` avoids that collection precisely because it is "dev-only and auth-gated". These cannot both be right. |
| 16 | **Fixture list is the 2025-26 calendar with years shifted forward.** |
| 17 | **Rank-history chart may never show real data** — it replays `devMatches`, which only the dev panel writes, and no production history source exists or can exist. |
| 18 | **No production tooling sets the tournament phase.** `set-dev-config.mjs` writes `devConfig`, which production never reads. The Sept 8 flip is currently a hand edit in the Firebase console. Left as-is by decision. |
| 19 | **Süper Lig "no team" answers render wrong on Stats** — signup stores `"Tutmuyorum"`, the abbreviation map only knows `"Yok"`. |
| 20 | **Half the Stats page is fabricated** — three of seven widgets are invented footballers, and the UCL-team chart is hardcoded even though real answers exist and are simply never aggregated. |
| 21 | **Team popup squads are randomly generated** from a seeded RNG; every team plays 4-2-3-1. |
| 22 | **Lobby caps unenforced on the started-phase home** — `HomeLandingLoggedInStarted` declares `canCreateLobby` but never reads it. Left as-is by decision. |

### Later

| # | Problem |
|---|---|
| 23 | **Round of 16 is eight hardcoded pairings**, four of them all-domestic ties. Drives every knockout surface. |
| 24 | **No knockout scoring exists** — the UI promises 3/4/5/6 points per round; nothing implements it. |
| 25 | **Knockout deadline is a placeholder** and locks nothing. |
| 26 | **`KnockoutStagePicker` duplicates the whole pick state machine** that `useKnockoutPicks` was extracted to prevent. |
| 27 | **Read-only brackets render empty** — no prediction is passed in. |
| 28 | **`MatchupPopup`'s knockout branch is unreachable** — its condition can never be true, so ~70 lines never render. A test asserts the current behaviour. |
| 29 | **Dead code**: `PlayerList.tsx` (4 passing tests, no importer), `KnockoutPredictionSummary.tsx`, `LobbyInviteWithId`, and `usePosts().refetch` — a no-op threaded through 8 call sites. |
| 30 | **Tuning objects outlived their tuners** — `statsPageTuning` and `teamPopupTuning` are threaded through 5 components whose tuner UIs no longer exist. |
| 31 | **Forum mentions are stored but never read** — no highlight, no notifications. |
| 32 | **Forum search is narrower than it looks** — loaded root posts and author names only. |
| 33 | **`NearbyStandingsList` can spin forever on a tie at the tail** — its load-more guard compares a rank against a list length, and tied ranks skip numbers. |
| 34 | **Account deletion is incomplete** — the knockout prediction is left behind (`deleteKnockoutPrediction` exists, is tested, and is never called), and survey answers can never be deleted by anyone under the current rules. |
| 35 | **Scoring is duplicated** between client and Cloud Function, untested on the server side. Left as-is by decision. |

---

## 12. Open questions

Things still unresolved after the questionnaire.

1. ~~**The exact 36-team list.**~~ **Resolved 2026-08-27.** Mert confirmed the
   36 badge SVGs in `assets/club_badges/` are the field. `teams.ts` holds that
   list and `teams.test.ts` asserts badges and teams cover each other in both
   directions.

2. **What replaces the drag-and-drop ranker.** Flagged as changing; the
   replacement interaction is undecided.

3. **Whether sign-up genuinely closes on 2026-09-08.** Stated as intended, but
   nothing enforces it, and the phase is set by hand.

4. **How real results will arrive.** "A live API" — no provider, schedule or
   ingestion path chosen.

5. **Whether `devMatches` is meant to be production data.** Mert's own answer
   was uncertain ("probably just for convenience until the league phase starts
   proper"). The code contradicts itself on this point (#15).

6. ~~**Whether the current build/publish step should be automated.**~~
   **Decided 2026-08-27 without him**, at his request — he had no view and did
   not want to form one. Answer: yes, automated, GitHub Actions, two workflows
   (§9). If it ever becomes a nuisance, deleting `.github/workflows/` returns the
   project to hand deploys with nothing else to unpick.

7. **Dates render in the viewer's timezone.** Every fixed date is authored at
   `+03:00`, but the app formats with local `getDate()`/`getMonth()`, so the
   About timeline reads "25 Ağu" from London and "26 Ağu" from Istanbul. The
   test suite pins `Europe/Istanbul` (`test/setup.ts`); the app does not.
   Surfaced by the first CI run, 2026-08-27.

8. **The 2026-08-26 date on the About page timeline** ("Lig Tahminleri Açılır")
   has already passed. Whether the six About dates should be revised for the
   real schedule is unaddressed.

9. ~~**Test suite status.**~~ **Verified 2026-08-27**: 131 files / 1025 tests
   pass, `tsc -b` clean, 35 integration tests pass, all green on CI too.

---

*Written 2026-08-27 from the state of the code on disk, a questionnaire answered
by Mert, and direct inspection of the live Firebase/GCP project. Sections 1
(infrastructure and database contents), 9 and 11 contain facts verified against
production that contradict assumptions elsewhere in the repository's comments.*
