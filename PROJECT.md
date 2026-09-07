# kupatakipucl

A Champions League prediction game for a private group of friends, written in
Turkish. Before the tournament starts, each participant places all 36
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

**Launched, in the `notstarted` phase.** The site has been live at
`https://kupatakipucl.com` since 2026-08-28. As of 2026-09-07, **32 real people
have signed up** — the first edition to ever run with real participants.

Sign-up and league predictions both close when the league phase begins on
**2026-09-08**. That flip is still a manual one (§11 #18) — Mert confirmed on
2026-09-07 that he's preparing for it in a separate branch, expected within
hours of that check-in.

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

### Live participation, checked 2026-09-07

Re-checked directly against production, ten days after launch: **32 real
signups** (`profiles`, `publicProfiles`, `surveyResponses` all at 32, no
dummy accounts), of which **17 have actually submitted a league
prediction** — the other 15 have an account but no picks in yet, with one
day left before predictions close. Real activity has also started
elsewhere: 4 `forumPosts`, 9 global chat `messages`, still 0 `lobbies`
created.

---

## 2. Tech stack

**Frontend**
- React 18 + TypeScript 5, built by Vite 5
- `react-router-dom` 6 in **HashRouter** mode (`#/path`), `base: "./"` — both
  already correct for static hosting with no rewrite rules
- Tailwind CSS 4 via `@tailwindcss/vite`; shadcn components (`base-nova` style)
  built on `@base-ui/react`
- `motion` for animation, `lucide-react` for icons, `sonner` for toasts
- Inter (`@fontsource-variable/inter`) — one family for every text role

**Backend** — Firebase, project `kupatakipucl`
- Firestore (`europe-west8`) for nearly all data
- Realtime Database (`europe-west1`) for presence and typing only
- Firebase Storage for profile photos and forum images
- Firebase Auth, Google sign-in via popup, sole provider
- Cloud Functions v2 (`functions/leaderboard`) + a Cloud Run service
  (`functions/stopbilling`)
- Firebase Analytics (GA4), enabled 2026-08-28 — Mert's own visitor metrics,
  nothing downstream depends on it

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
profile**, and warns (without blocking) on a name that doesn't look like a
normal first/last name, added 2026-08-28 · 4. bounce · 5. age wheel (10–90,
default 25) · 6. football knowledge (1–7) · 7. Messi/Ronaldo · 8. Süper Lig
team · 9. UCL team (36 crests + "Yok") · 10. device → **writes the survey**
· 11. bounce → done.

Back-navigation preserves answers and skips bounce screens. The quiz is
mandatory and one-time: `surveyResponses` forbids update and delete outright.

### `predictions/`
The core mechanic. `TeamRanker` is a two-panel **click-to-place** board: 36
numbered ranks on the left, a crest grid (desktop) or named list (mobile) on the
right. Click a team to pick it up, click where it goes. Submit unlocks only when
all 36 ranks are filled. Hovering a row for 2s reveals the ±2 scoring band.

There is no drag and drop, by design — it was removed outright on 2026-09-06
(§11 #10) after proving unreliable on desktop and awkward on touch. `@dnd-kit`
is uninstalled; nothing else in the codebase used it.

Every transition lives in **`rankerState.ts`**, a pure reducer with no React and
no DOM in it — pick up, place, swap, return-to-pool, cancel. Two clicks do
everything, and holding a team is *selection only*: nothing moves until the
second click. `TeamSlotList`, `TeamGrid` and `MobileTeamPool` are dumb renderers
that report clicks. Because it's pure and click-driven, the actual interaction
is unit-tested for the first time (jsdom cannot simulate a pointer drag, which
is why the drag version had no behavioural coverage at all).

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

**Real fixture data (2026-09-07, fixing #16).** `useFixtures.ts` reads
`fixtures/{id}` (functions/fixtures' football-data.org sync, §6). `upcomingFixtures.ts`'s
`getUpcomingFixtures(fixtures)` is now pure and parameterized (fixtures
passed in, not imported, and no longer takes `now` — see below) and feeds `UpcomingMatchesDrawer`/
`UpcomingMatchesPreview`/`FixtureRow`, all retyped to `RealFixture`
(`realFixtureTypes.ts`). `MatchupPopup.tsx` resolves its fixture from
`useFixtures()` instead of the devpanel mock, and reads that fixture's own
`homeGoals`/`awayGoals` directly instead of replaying `devMatches` outcomes.
`rankHistory.ts` (ParticipantPopup's rank-history chart) replays the real
fixture calendar's actual goals match-by-match, in kickoff order, instead of
the mock calendar's synthetic 1-0/0-0 scorelines.

The points/goal-difference/tie-break math itself was extracted out of
`src/devpanel/standings.ts` into `standingsAccumulator.ts`'s
`computeStandingsFromMatches` — a generic function taking actual goals per
fixture — so the dev panel's synthetic-outcome path and the real-goals path
share one implementation instead of two that could drift apart.
`devpanel/standings.ts`'s own `computeStandings(outcomes)` is now a thin
adapter (synthetic outcome → synthetic goals → the shared function);
`standings.test.ts` passes unchanged, proving the extraction didn't alter its
behavior.

`teamMatchHistory.ts` was deliberately **not** touched — its only consumer is
the parked `TeamPopup.tsx` (below), so it stays wired to the devpanel mock
until that popup is revived.

**Live-match feature, 2026-09-07.** Mert's ask, kept deliberately open-ended
("be creative"). Live detection is entirely derived from data already
synced — `fixtures/{id}.status` (`IN_PLAY`/`PAUSED` = live) and
`homeGoals`/`awayGoals` — via `liveFixtures.ts`'s `isFixtureLive`/
`getLiveTeamIds`/`hasAnyLiveFixture`. `LiveDot.tsx` is the shared breathing
red dot (respects `prefers-reduced-motion`, same convention as the rest of
the app's `motion` usage). Four surfaces:

- `FixtureRow.tsx` — red tint, breathing dot, live score in place of kickoff
  time. Required redefining `upcomingFixtures.ts`'s "upcoming" filter from
  "kickoff in the future" to "not yet `FINISHED`" — a live match's kickoff is
  by definition already in the past, so the old filter would have dropped it
  from the list at the exact moment it became worth showing.
- The standings tables — `TeamTable.tsx` (tint only) and `LeagueTableList.tsx`
  (tint plus a `motion` `layout` reposition animation on `results` updates).
  `TeamTable`'s CSS-Grid-as-table rows are `display:contents` and have no box
  for `layout` to animate, so that touch only made it into `LeagueTableList`,
  a real `<ul>`.
- `MatchupPopup.tsx` — same tint/dot/live-score treatment, splitting
  `MatchupCenter`'s old two-state (upcoming/decided) score display into three
  (upcoming/live/finished).
- A small pulsing dot on the "Puan Durumu" nav link (both shells) plus, on
  mobile, the hamburger button itself (ambient, visible without opening the
  drawer) when anything is live anywhere.

`useFixtures.ts` and `useResults.ts` both switched from one-shot `getDocs` to
live `onSnapshot` listeners — an open tab now sees a live score or a
reordered table without a refresh, which is just the project's own existing
rule (§3.4: live listeners for anything that must update in place) applied
to two reads that hadn't needed it before.

The polling cadence that actually makes this feel live lives in
`functions/fixtures` — see §6's `pollGate.js` writeup, including the
shared-control-doc race bug caught and fixed the same session.

Popups: `TeamPopup` (predictors, match history, and a generated squad),
`ParticipantPopup` (their full 36-row prediction, quiz answers, rank history
chart), `MatchupPopup` (one fixture, both teams' predictor columns).

**`TeamPopup` is shelved, 2026-09-07.** Every real call site now renders
`TeamPopupParked.tsx` instead — a big "Bu bölüm şu anda hazır değil." message,
nothing else. `TeamPopup.tsx` itself is untouched and left in the tree
deliberately: Mert plans to bring its squad/dossier content to life later via
his own scraping automation rather than football-data.org (whose Free tier
has no lineup/squad data anyway), so the full implementation needs to survive
intact for that. `TeamPopup.test.tsx` still exercises it directly. See §11
#21.

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
**Cleared out, 2026-09-07.** Everything this section used to describe — team
bias, team agreement, survey distributions, the three fabricated tournament
widgets, the hardcoded UCL-team chart — is deleted outright, not preserved.
Mert's call: unlike `TeamPopup` (§4 `leaderboard/`), there was nothing here
worth keeping. `/stats` now always renders `PageUnavailable`, dropped from the
nav but still reachable by direct URL (`src/shell/navLinks.ts`,
`src/state/pageAccess.ts`). `RankedStatList.tsx` and `StatsHero.tsx` survive
in this folder only because `StatWidget.tsx` and `HomeHero.tsx` still use
them for something unrelated. See §11 #19/#20.

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
| `leaderboardCache/submitters` | — | the set of uids with a submitted prediction, written by the same Cloud Function transaction — lets `usePredictionSubmitters` answer "who's in" without reading (or being allowed to read) everyone's actual picks. Missing from this table until 2026-09-07; the feature predates this document. |
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
- `knockoutPredictions`, `forumPosts`, `results`, `tournamentState`,
  `leaderboardCache` — **public read**
- `predictions` — read requires either the tournament having started or the
  request being the prediction's own owner (fixed 2026-08-27, see §11 #7).
  `knockoutPredictions` was left fully public-read — a loose end, see §11 #40
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
- **`results`, `tournamentState`, `devConfig`, `devMatches`** — write is
  restricted to three admin accounts (`isAdmin()`, three hardcoded uids, all
  Mert's). Fixed 2026-08-27, see §11 #6 — this line used to say these were
  writable by any signed-in user, which stopped being true the same day this
  document was first written.

Client-side length caps (360 chars for posts and messages, 15 for names and
lobby names) are mirrored in the rules, since the client caps are trivially
bypassable. There is no server-side rate limiting; `useSendCooldown` applies a
1200ms client cooldown and is candid that it stops accidents, not attackers.

---

## 6. Cloud Functions

Three codebases across two deploy tools: `leaderboard` and `fixtures` are both
plain Firebase Functions (Firebase CLI), `stopbilling` is a Cloud Run service
(`gcloud run deploy`).

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

### `functions/fixtures` — Firebase Functions v2, `europe-west8`
Added 2026-09-07 on the `league-phase-prep` branch, fixing #14 and #16. Two
`onSchedule("every 2 minutes")` functions, both live and verified against
production:

- **`syncFootballDataResults`** pulls the live UEFA Champions League
  league-phase table from [football-data.org](https://www.football-data.org)'s
  Free tier and overwrites `results/{teamId}` with it — the same collection
  `src/devpanel/useDevMatches.ts` writes by hand, and the one
  `functions/leaderboard`'s `onDocumentWritten("results/{teamId}")` already
  watches, so a sync recomputes the leaderboard automatically with no extra
  wiring.
- **`syncFootballDataFixtures`** pulls the full 144-match calendar (past and
  future) and writes `fixtures/{id}` — `id` is football-data.org's own match
  id, `order` is assigned by sorting on kickoff time (ties broken by match id)
  so it's always true chronological order, and `homeGoals`/`awayGoals` are
  `null` until a match finishes. This is a brand new collection, unrelated to
  `src/devpanel/fixtures.ts`'s mock calendar — see "The dev panel fallback"
  below for why the two were kept separate rather than merged.

Both deployed and manually triggered post-deploy to confirm correctness: 36
`results` docs and 144 `fixtures` docs, all with the right shape, read back
directly from Firestore.

Provider history: API-Football was the original choice (§ this doc's earlier
revisions), but its Free plan turned out to hard-block every season outside
2022–2024 — confirmed live against Mert's key, not a rate limit, a wall.
Pivoted to football-data.org the same session; its Free tier carries UEFA
Champions League "free forever," including the live 2026-27 season, confirmed
against Mert's key with real fixtures and the correct 36-team single-table
league-phase format (`stage: LEAGUE_STAGE`, `type: TOTAL`) rather than the old
group-stage shape.

**What Free tier does and doesn't give you:** fixtures, standings, and scores
(delayed by an unspecified amount) — yes. Lineups, goal scorers, cards, and
squads — no, on any plan below paid. Mert's call, 2026-09-07: accept the Free
tier's limits rather than pay for more; "it is what it is." This caps what the
incoming team-popup and stats-page redesigns (#XX, #YY below) can show —
neither has been scoped yet (see §11 #19–21), precisely because this had to
be settled first.

**Polling cadence — live-aware, built 2026-09-07 for the live-match feature.**
Originally a flat 10-minute interval (round 1: 90/10 matchday/quiet-day
splits didn't make sense once football-data's Free tier turned out to cap at
10 requests/**minute**, not per day). Once Mert wanted an actual live-match UI
feature, that flat interval stopped being good enough — this is where
`pollGate.js` came in. Both functions now run on a 2-minute schedule, but
`gatedSync()` (index.js) decides on every tick whether to actually call
football-data.org:

- **Live window**: any fixture that kicked off within the last 3.5 hours
  (2.5h estimated match length + 1h grace for late corrections) → poll.
- **Sparse**: otherwise, only once it's been ≥5 hours since that sync type's
  own last real sync → poll. Everything else is a cheap no-op (one
  `getRecentFixtures` query, ≤20 docs).

**Caught and fixed live, 2026-09-07:** the "last synced" state was originally
one shared control doc (`fixturesSyncControl/state`) read by both functions.
Manually triggering both close together revealed a race — whichever
function's gate check ran first would write a fresh timestamp, and the
other would then see that as "we just synced" and skip its own sync
entirely, even though results and fixtures are two different football-data.org
endpoints. Fixed by giving each sync type its own doc
(`fixturesSyncControl/results`, `fixturesSyncControl/fixtures`) — verified
live afterward: both wrote independent timestamps on the same tick.
`pollGate.test.js` covers the decision logic; `syncControl.js` is the
Firestore-touching part `pollGate.js` deliberately stays free of, kept
untested directly since it's a thin wrapper.

**Team-id mapping:** football-data.org's numeric team ids have no relationship
to `src/predictions/teams.ts`'s slugs. `functions/fixtures/teamIdMap.js`
hand-maps all 36, built against a live standings response on 2026-09-07 and
covers exactly the 36 teams in `teams.ts` — asserted both directions by
`teamIdMap.test.js`.

**The dev panel fallback:** kept exactly as-is per Mert's decision, 2026-09-07
("keep it, but make sure it doesn't mess about with anything") — its manual
"mark match decided" flow still writes `results` and `devMatches` normally,
completely untouched. Since results sync writes the same `results` collection
the dev panel does, anything the dev panel writes there only survives until
the next successful sync; that's intended for bridging a football-data.org
outage, not for a correction meant to stick. `devMatches` and
`src/devpanel/fixtures.ts`'s mock calendar themselves are never written or
read by anything in `functions/fixtures` — Mert doesn't use the dev panel to
flip matches in production and didn't want it touched at all, so rather than
repoint it at real data, every production consumer was repointed at the new
`fixtures` collection instead (see §4 `leaderboard/`), leaving the dev panel
fully isolated for local testing.

**Setup:** the football-data.org API token lives in a Firebase Functions v2
secret (`FOOTBALL_DATA_TOKEN`, set via `firebase functions:secrets:set`).
`firebase.json`'s `functions` key is an array of two codebases (`leaderboard`,
`fixtures`). Deploy: `firebase deploy --only functions:fixtures`.

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
  `createObjectURL` and `Image`). **132 files / 1052 tests, re-verified
  2026-09-07** after the stats clear-out, TeamPopup shelving, and the
  football-data.org fixture/results integration — includes
  `functions/fixtures`'s own test files (Vitest picks up any `*.test.js`
  outside `src/` too, same as `functions/leaderboard`'s). Most modules have a
  sibling test, and the tests are frequently the clearest statement of
  intended behaviour.
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

Firebase config is read from Vite env vars (`.env.example` lists the eight keys).
**`.env.local` is *not* committed** — an earlier revision of this document said
it was, which was wrong and would have produced a CI build shipping
`apiKey: undefined`. `.env` **is** committed, deliberately: Vite
inlines every `VITE_*` var into the public JS bundle, so all eight values are
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

**`league-phase-prep` merged into `main`, 2026-09-07** — same day as the
manual flip to `leaguephase` — carrying everything this document's §4, §6,
and §11 describe as done that day: the football-data.org pivot and real
results/fixtures sync (`functions/fixtures`, fixing #14/#16), the shelving of
`TeamPopup` and the clearing of Stats (#19–21), and the live-match feature
(real-time tinting/score/reposition across the standings, upcoming-matches
widgets, and MatchupPopup). `main` had not diverged from this branch's base,
so the merge was a fast-forward:

```
git add -A
git commit         # this session's work — see PROJECT.md §4/§6/§11 for what's in it
git push origin league-phase-prep

git checkout main
git merge league-phase-prep
git push origin main
```

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

**Heads up, 2026-09-07:** Mert is about to start a `league-phase-prep` branch
and named three things in it up front — real match results (#14), the dev
panel's grip on production surfaces (#15), and the knockout backlog (#23–26).
Until that branch lands, treat those as "in progress," not unowned.

### Before launch

| # | Problem | Disposition |
|---|---|---|
| 1 | ~~**Team list is the wrong season.**~~ **Done, 2026-08-27.** `teams.ts` now holds the confirmed 2026-27 field. This was fixed the same evening this document was first written (`198e1fb`); the table just never got updated to say so. `teams.test.ts` asserts the team list and badge map cover each other. | Done |
| 2 | ~~**Crests do not match teams.**~~ **Done, 2026-08-27.** `teamCrestSrc` is now a direct id-to-badge lookup, not a hash into a shared pool. All 36 badges (the original 29 plus the 7 added 2026-08-27) are in `public/club-badges/`, each named for the team it belongs to, and `clubBadgeSlugs.ts` was regenerated to match. | Done |
| 3 | ~~**Production database holds 50 dummy participants**~~ **Done, 2026-08-27.** The dummy data was purged the same day this document was first written (`653da5a`), just after this row was drafted. Re-checked live 2026-09-07: `profiles`, `publicProfiles` and `surveyResponses` all hold exactly 32 documents — the 32 real signups, zero dummy accounts. | Done |
| 4 | ~~**Signup lockout.**~~ **Done, 2026-08-27 (`c450b49`) — and the original write-up had the wrong trigger.** The quiz step writes the survey immediately, so nobody actually gets stuck mid-signup; the real trigger was *deleting your account* — `surveyResponses` couldn't be deleted, so the old survey outlived the profile, and signing up again ran into the one-time-quiz rule as an "update" on a document that still existed. Fixed at both ends: the rules now let an owner overwrite or delete their own survey response, and account deletion now also removes the survey response and the knockout prediction (see #34). | Done |
| 5 | ~~**No deployment exists.**~~ **Done, live 2026-08-28.** GitHub Actions builds and publishes to GitHub Pages, `kupatakipucl.com` and `www.` are authorized in Firebase Auth, the `og:`/`twitter:` tags point at the real host, Pages is enabled, and DNS points at GitHub. See [DEPLOY.md](DEPLOY.md). | Done |
| 6 | ~~**`results`, `tournamentState`, `devConfig` and `devMatches` are writable by any signed-in user.**~~ **Done, 2026-08-27.** All four are now gated behind `isAdmin()`, checked against three hardcoded accounts — Mert confirmed 2026-09-07 these are his. | Done |
| 7 | ~~**Other people's predictions are world-readable before the league phase.**~~ **Done, 2026-08-27.** `predictions/{uid}` read now requires either the tournament having started or the request matching the prediction's own uid. `knockoutPredictions` was left fully public-read — see #40, a minor loose end. | Done |
| 8 | ~~**Knockout entry point is reachable during `notstarted`.**~~ **Done, 2026-08-27.** `/knockout-predictions` is now restricted to the knockout-adjacent phases in `pageAccess.ts`, with a comment noting the page shouldn't invite predictions against a draw that doesn't exist yet. | Done |
| 9 | ~~**Mobile create-lobby button does nothing.**~~ **Done 2026-08-27.** Both lobby dialogs are mounted on the mobile branch of `LoggedInHome`. | Done |
| 10 | ~~**The drag-and-drop ranker is being replaced.**~~ **Done 2026-09-06.** Replaced outright with a click-to-place board: click a team, click the rank it goes in. Root cause of the old one's unreliability was a drag-overlay modifier applied only to `DragOverlay` and not to `DndContext`, so the visible card and the invisible hit-test rect drifted apart by however far off-centre you grabbed an item; a missing `onDragCancel` also left a stuck ghost card after Escape. Rather than patch the geometry, the interaction was rebuilt as a pure reducer (`rankerState.ts`) and `@dnd-kit` was uninstalled. | Done |
| 11 | ~~**Profile shows raw team slugs.**~~ **Done 2026-08-27.** `uclTeamLabel()` in `surveyLabels.ts`, applied at all three call sites — the profile page *and both branches of `ParticipantPopup`*, which this entry missed. | Done |
| 12 | **Lobby management was desktop-only.** **Fixed for the `notstarted` home 2026-08-27** — a settings gear in the mobile participants header opens `LobbyManagementPanel`, now a bottom sheet on a phone. **Still open for the started-phase mobile home**, which has no lobby UI of any kind and no participants cell to hang one on; unreachable until 2026-09-08. | Partly done |
| 13 | ~~**Deleting a lobby leaves its messages in the database.**~~ **Done 2026-08-27.** Root cause was `allow delete: if false` in the rules, so the cascade was impossible. Rules changed and deployed; `leaveLobby`'s last-member-out branch now runs the same cascade; 8 orphaned messages under 5 phantom lobbies purged from production. | Done |
| 36 | ~~**Home and Forum can hang blank forever for a signed-in participant running an ad blocker.**~~ **Fixed at the root 2026-08-28**. `onSnapshot`'s real-time channel gets blocked client-side by some ad/privacy blockers as `net::ERR_BLOCKED_BY_CLIENT`. Previously fixed at the symptom via `useLoadingStuck` to show a notice. Now, `useLoadingStuck` correctly triggers an automatic fallback to one-shot `getDoc()` / `getDocs()` reads in `useProfile`, `usePosts`, `useMessages`, and `usePlayers` — hitting a different endpoint that bypasses filter lists, allowing the app to initialize seamlessly (sans live updates). | Done |
| 37 | ~~**Multiple devices clobber presence state.**~~ **Fixed 2026-08-28**. Because `usePresenceHeartbeat` registered `onDisconnect().remove()` against a simple boolean `presence/{uid} = true`, logging in on two devices caused the later device's close event to nuke the earlier device's presence. Migrated to RTDB connection IDs via `push()` so each session is managed independently. | Done |
| 38 | ~~**Prediction page impossibly laggy and unscrollable on mobile, drags snapping back.**~~ **Fixed 2026-08-28**. The `TouchSensor` previously blocked native browser scrolling. Fixing scrolling by adding `touch-pan-y` caused Safari to aggressively cancel drags ("snap back") when users moved vertically. The final fix was separating the interactions: added a `GripVertical` drag handle with `touch-none` exclusively applied to the grip. Unified the drag sensor to `distance: 5` globally. Users now scroll seamlessly by touching the rows, and drag flawlessly by the handle. Extremely laggy due to unmemoized React trees and expensive `pointerWithin` intersections on 72 nodes; wrapped `TeamCrest` in `React.memo` and changed `@dnd-kit` collision detection to `closestCenter`. **Moot since 2026-09-06** — dragging is gone entirely (#10), so the grip handles, touch sensors and collision tuning described here no longer exist. The `TeamCrest` memoisation was kept. | Done |
| 39 | ~~**Deleting your own forum post could fail with "Missing or insufficient permissions."**~~ **Fixed 2026-08-28**. `deletePost.ts` cascades a whole thread in one atomic batch; the rule read `resource.data.uid` unconditionally, and deleting an already-gone document (a stale `replyIds` entry — plausibly from the `usePosts` ad-blocker fallback in problem 36 serving an out-of-date snapshot) is a null-value evaluation error that denies the *entire* batch, not just that one delete. `firestore.rules`' `forumPosts` delete rule now short-circuits on `!exists()` first, so deleting an already-gone doc is a no-op instead of poisoning the batch. Confirmed against the emulator: five legitimate cascade shapes all pass; a non-owner deleting someone else's post is still correctly denied. Deployed live. | Done |

### By 2026-09-08 (league phase)

| # | Problem |
|---|---|
| 14 | ~~**No way to enter real match results.**~~ **Done, deployed and verified live, 2026-09-07.** `functions/fixtures:syncFootballDataResults` syncs `results/{teamId}` from football-data.org every 10 minutes; see §6. Manually triggered once post-deploy and confirmed end-to-end: all 36 `results` docs written correctly, `functions/leaderboard`'s recompute trigger fired automatically 6 seconds later. |
| 15 | ~~**Production code depends on the dev panel.**~~ `TeamPopup`, `MatchupPopup`, `ParticipantPopup`, `rankHistory` and `teamMatchHistory` import fixtures and `devMatches` from `src/devpanel/`, while `upcomingFixtures.ts` avoids that collection precisely because it is "dev-only and auth-gated". These cannot both be right. **Done for the live surfaces, 2026-09-07** — `MatchupPopup`, `rankHistory` (ParticipantPopup) and `upcomingFixtures.ts` now all read the real `fixtures` collection (§4, §6) instead. `teamMatchHistory` is untouched by design — its only consumer is the parked `TeamPopup` (#21), so it's dormant, not fixed; both resurface together whenever that popup is revived. |
| 16 | ~~**Fixture list is the 2025-26 calendar with years shifted forward.**~~ **Done, 2026-09-07.** `functions/fixtures:syncFootballDataFixtures` syncs the real 144-match calendar into `fixtures/{id}` every 10 minutes; see §6. Every live consumer repointed at it (§4). The mock calendar (`src/devpanel/fixtures.ts`) still exists, untouched, feeding only the dev panel and the now-dormant `teamMatchHistory`/`TeamPopup` pair. |
| 17 | **Rank-history chart may never show real data** — it replays `devMatches`, which only the dev panel writes, and no production history source exists or can exist. |
| 18 | **No production tooling sets the tournament phase.** `set-dev-config.mjs` writes `devConfig`, which production never reads. The Sept 8 flip is currently a hand edit in the Firebase console. Left as-is by decision — reconfirmed 2026-09-07, unlike #14/#15/#23–26 this one is *not* part of the incoming branch: "a small thing, no tool needed." |
| 19 | ~~**Süper Lig "no team" answers render wrong on Stats**~~ — signup stores `"Tutmuyorum"`, the abbreviation map only knows `"Yok"`. **Moot, 2026-09-07** — the entire Stats page was cleared (§4 `stats/`), this widget no longer exists. |
| 20 | ~~**Half the Stats page is fabricated**~~ — three of seven widgets are invented footballers, and the UCL-team chart is hardcoded even though real answers exist and are simply never aggregated. **Moot, 2026-09-07** — the whole page was cleared rather than fixed; nothing here survived to redesign. |
| 21 | **Team popup squads are randomly generated** from a seeded RNG; every team plays 4-2-3-1. **Shelved, 2026-09-07** — `TeamPopup` (where this lives) no longer renders in production at all; see §4 `leaderboard/`. Not fixed, just parked: Mert plans to replace the generated squads with real ones via his own scraping automation later, not football-data.org. |
| 22 | **Lobby caps unenforced on the started-phase home** — `HomeLandingLoggedInStarted` declares `canCreateLobby` but never reads it. Left as-is by decision. |

### Later

Problems 23–26 (the knockout backlog) were also named for the incoming
`league-phase-prep` branch (2026-09-07) — sooner than the "months away"
framing above would suggest.

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
| 34 | ~~**Account deletion is incomplete**~~ **Done, 2026-08-27 (`c450b49`).** Deleting an account now runs `deleteProfile`, `deletePrediction`, `deleteSurveyResponse` and `deleteKnockoutPrediction` together in one `Promise.all`, so a partial failure aborts before sign-out instead of leaving an unrecoverable half-deleted account. See #4 — this was fixed in the same commit. |
| 35 | **Scoring is duplicated** between client and Cloud Function, untested on the server side. Left as-is by decision. |
| 40 | **`knockoutPredictions` is still world-readable.** Fixing #7 tightened `predictions` but left `knockoutPredictions` fully public-read. Low priority in practice — the entry point itself is hidden until `preknockout` (#8), so there's nothing real to read yet. Unaddressed as of 2026-09-07; Mert didn't weigh in either way when asked. |

---

## 12. Open questions

Things still unresolved after the questionnaire.

1. ~~**The exact 36-team list.**~~ **Resolved 2026-08-27.** Mert confirmed the
   36 badge SVGs in `assets/club_badges/` are the field. `teams.ts` holds that
   list and `teams.test.ts` asserts badges and teams cover each other in both
   directions.

2. ~~**What replaces the drag-and-drop ranker.**~~ **Resolved 2026-09-06.**
   Click-to-place: click a team, then click the rank it goes in. Holding is
   selection only; a held team dropped on an occupied rank swaps with it, and
   clicking the pool returns it. Escape or clicking it again cancels. See §4
   `predictions/` and `rankerState.ts`.

3. **Whether sign-up genuinely closes on 2026-09-08.** Re-confirmed 2026-09-07:
   still exactly as stated. Sign-up and predictions close only when Mert
   manually flips `tournamentState/current` to `leaguephase` — nothing in the
   code enforces the date itself. He's preparing that flip in a separate
   branch, expected within hours of the 2026-09-07 check-in.

4. ~~**How real results will arrive.**~~ **Resolved 2026-09-07.**
   football-data.org (pivoted from API-Football mid-session — its Free plan
   turned out to hard-block every season outside 2022–2024), synced every 10
   minutes by `functions/fixtures`. See §6.

5. ~~**Whether `devMatches` is meant to be production data.**~~ **Resolved
   2026-09-07, by explicit decision rather than by finding an answer:**
   no — and it never will be. Mert: "I don't really give a shit about dev...
   I will never use it to flip matches." Rather than migrate it, every
   production consumer was repointed at the real `fixtures`/`results`
   collections instead, leaving `devMatches` and the mock calendar purely a
   local dev/test fixture (§4, §6). The contradiction in #15 is resolved the
   same way.

6. ~~**Whether the current build/publish step should be automated.**~~
   **Decided 2026-08-27 without him**, at his request — he had no view and did
   not want to form one. Answer: yes, automated, GitHub Actions, two workflows
   (§9). If it ever becomes a nuisance, deleting `.github/workflows/` returns the
   project to hand deploys with nothing else to unpick.

7. ~~**Dates render in the viewer's timezone.**~~ **Decided 2026-09-07: not
   worth fixing.** Every fixed date is authored at `+03:00`, but the app
   formats with local `getDate()`/`getMonth()`, so the About timeline reads
   "25 Ağu" from London and "26 Ağu" from Istanbul. The test suite pins
   `Europe/Istanbul` (`test/setup.ts`); the app does not. Surfaced by the
   first CI run, 2026-08-27. Left unfixed by decision — every real signup so
   far is in Turkey, so the bug has no actual victims. Worth a second look
   only if the audience ever extends beyond it.

8. ~~**The 2026-08-26 date on the About page timeline** ("Lig Tahminleri Açılır")
   has already passed. Whether the six About dates should be revised for the
   real schedule is unaddressed.~~ **Resolved 2026-08-28**. The timeline was updated to reflect the final 7-step schedule requested by Mert (Aug 28 – Jun 5). "Lig Aşaması" and "Eleme Aşaması" are correctly rendered as date intervals.

9. ~~**Test suite status.**~~ **Re-verified 2026-09-06**: 134 files / 1058 tests
   pass, `tsc -b` clean, production build clean. (Integration suite unchanged
   and not re-run this session — the ranker rewrite touches no Firestore path.)

---

*Written 2026-08-27 from the state of the code on disk, a questionnaire answered
by Mert, and direct inspection of the live Firebase/GCP project. Sections 1
(infrastructure and database contents), 9 and 11 contain facts verified against
production that contradict assumptions elsewhere in the repository's comments.*
