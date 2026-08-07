# kupatakipucl — Project State

**As of:** commit `05ba98d` on branch `great-reform` (2026-08-01). `great-reform` is exactly one commit ahead of `main` — that commit is the doc-purge described below.

**Methodology:** this document was produced by reading the entire codebase (`src/`, `functions/`, `scripts/`, all config, all assets) from scratch, reading the full git history, and running the app with a real dev server and a real browser (Playwright). Live-verified claims (logged-out landing page, the five gated pages' access behavior, Google sign-in wiring, mobile layout, a reproduced DevPanel bug) are marked as such. Logged-in-only flows (Predictions, Forum, Chat, Lobbies, Profile editing) could not be verified interactively without either completing a real Google OAuth sign-in against the project's live production Firebase backend, or hitting the same auth wall documented in §13 — so those are described from direct source reading instead, cross-checked across multiple independent passes. No prior design docs, specs, or questionnaires were consulted; nearly all of them were deleted from this repo in the commit that immediately precedes this one (see §14), which is the reason this document exists.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Tech stack](#2-tech-stack)
3. [Architecture — how the pieces connect](#3-architecture--how-the-pieces-connect)
4. [Routing, access control &amp; navigation](#4-routing-access-control--navigation)
5. [Auth &amp; onboarding](#5-auth--onboarding)
6. [Feature tour](#6-feature-tour)
7. [Scoring &amp; tournament mechanics](#7-scoring--tournament-mechanics)
8. [Data layer — Firebase in detail](#8-data-layer--firebase-in-detail)
9. [Visual &amp; design language](#9-visual--design-language)
10. [Testing](#10-testing)
11. [Backend, infra &amp; deployment](#11-backend-infra--deployment)
12. [Assets](#12-assets)
13. [Rough edges &amp; known gaps](#13-rough-edges--known-gaps)
14. [Evolution — how we got here](#14-evolution--how-we-got-here)

---

## 1. What this is

**kupatakipucl** ("kupa takip" — Turkish for "cup tracking") is a Turkish-language web app that runs a UEFA Champions League prediction pool for a friend group. It is not a generic product — it's built by one primary developer for a specific, named group of people, and the codebase's comments talk in first person about that developer's own decisions throughout ("Mert's explicit call," "Mert: 'ill remove it way before launch'").

**The core loop:**
1. A visitor signs in with Google.
2. They're forced through a mandatory onboarding sequence: pick a profile photo, set a (permanently locked) name, then answer a 6-question fun quiz (footballing knowledge, Messi-or-Ronaldo, Süper Lig allegiance, a UCL team crush, device type, age).
3. Once, before the tournament starts, they rank all 36 real UCL league-phase teams from 1st to 36th. This is a one-time action — there's no coming back to redo it once the tournament begins (only editing via the Profile page, until it locks).
4. As real match results come in, each of their 36 picks scores points based on how close the prediction was to the team's actual final standing.
5. Along the way there's a leaderboard, a Twitter-style forum, a live chat (global and in-invite-only "Special Lobbies" sub-groups), and per-team/per-participant "popup" dossiers.

**Current lifecycle stage: pre-launch.** There is exactly one Firebase project (`kupatakipucl`) and no dev/prod split. As of this audit, its data consists of 50 seeded synthetic participants (`dummy-001`..`dummy-050`, created by `scripts/seed-dummy-participants.mjs` / `seed-dummy-surveys.mjs`) plus a small, unexplained handful more (the logged-out landing page reads "52 kişi katıldı" — 2 more than the documented seed count; live-observed, not otherwise explained anywhere in the repo). The real tournament phase right now is `notstarted` (live-confirmed — the app renders its dedicated "not started" landing page). The registration/prediction deadline is a hardcoded constant, `TOURNAMENT_START_ISO = "2026-09-08T00:00:00+03:00"` (`src/home/deadlines.ts`) — everything in the app currently treats that date as both "when predictions lock" and "when the league phase starts."

This whole codebase is young and was built fast: 182 commits, every single one dated between **2026-07-19 and 2026-08-01** — a 13-day, extremely intensive build (see §14).

---

## 2. Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 18.3 + TypeScript 5.5 | Strict mode, `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` all on |
| Build tool | Vite 5.4 | `@vitejs/plugin-react`, `@tailwindcss/vite` |
| Routing | react-router-dom v6, **`HashRouter`** | URLs are `/#/predictions` etc. — a static-hosting-friendly choice (no server-side rewrite rules needed for deep links) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) + `tw-animate-css` | Single fixed dark theme (see §9) |
| Component kit | `shadcn` CLI, style **`base-nova`** → built on **`@base-ui/react`**, not Radix | `components.json` at repo root |
| Drag &amp; drop | `@dnd-kit/{core,sortable,utilities}` | Powers the 36-team prediction ranker |
| Animation | `motion` (the Framer Motion successor package, imported as `motion/react`) | One shared "cotton" easing curve used everywhere (§9) |
| Toasts | `sonner` | Mounted once in `AppShell` |
| Icons | `lucide-react` | shadcn's configured icon library |
| Font | `@fontsource-variable/inter` | The *only* typeface in the entire app |
| Backend/data | `firebase` v10 — **Auth**, **Firestore**, **Realtime Database**, **Storage** | One project, no emulators, no dev/prod split |
| Server compute | Firebase Cloud Functions (3 functions: 2 Firestore-triggered + 1 scheduled) + one out-of-band Cloud Run service | See §11 |
| Testing | Vitest 2, jsdom, `@testing-library/react` + `jest-dom` | Real, actively-maintained test suite (§10) |
| Image processing (build-time only) | `sharp` | Used by two one-off Node scripts, not shipped to the client |

---

## 3. Architecture — how the pieces connect

The whole app is a single-page client. There is no server-rendered HTML beyond the static `index.html` shell, and (see §13) no hosting deploy target is currently configured for it at all.

**Provider/route tree (`src/App.tsx`, exact):**

```
<ErrorBoundary>
  <AuthProvider>          — Firebase onAuthStateChanged, + a DEV-only fake-login override
    <ProfileGate>          — blocks everything until profile + survey both exist
      <HashRouter>
        <AppShell>          — persistent header/nav, renders children in a route-keyed fade
          <Routes>
            /                → HomePage
            /predictions     → PredictionsPage
            /leaderboard     → LeaderboardPage
            /forum           → ForumPage
            /stats           → StatsPage
            /profile         → ProfilePage
            /join/:inviteId  → JoinLobbyPage
            /dev             → DevPanel        (only if import.meta.env.DEV)
```

**Firebase surface area** (`src/firebase.ts`):
- `auth` — Google sign-in only (§5).
- `db` (Firestore) — the primary data store for essentially everything: profiles, predictions, survey responses, real results, the precomputed leaderboard, forum posts, global + lobby chat, lobbies/invites, and the dev-tooling docs. Full collection-by-collection breakdown in §8.
- `rtdb` (Realtime Database) — used for **exactly two things**: presence (`presence/{uid}`) and typing indicators (`typingStatus/{uid}`), migrated off Firestore specifically for cost/scaling reasons (see §8, §14). Nothing else touches it.
- `storage` — two paths: `profile-photos/{uid}-{timestamp}` and `forum-images/{uid}-{timestamp}`.

**Server side:**
- `functions/leaderboard` — real Firebase Functions (two Firestore-triggered, one scheduled), precomputes the leaderboard server-side so clients don't redo the scoring math on every visit.
- `functions/stopbilling` — **not** a Firebase Function at all; a manually-deployed Cloud Run service that acts as a billing killswitch. See §11.
- No CI/CD exists anywhere in the repo (no `.github/`). Every deploy — hosting (once configured), Firestore/Storage/RTDB rules, the leaderboard function, the Cloud Run service — is a manual, developer-run CLI command.

---

## 4. Routing, access control &amp; navigation

### The `VisibilityState` machine

Nearly every page's behavior is driven by one derived value, computed fresh on every render and nowhere else:

```ts
// src/state/visibilityState.ts
getVisibilityState(isLoggedIn, phase) = `${isLoggedIn ? "loggedin" : "loggedout"}_${phase}`
```

`phase` is one of `notstarted | leaguephase | preknockout | knockout` (§7), so there are exactly **8 states**, e.g. `loggedout_notstarted`, `loggedin_knockout`. This is the entire derivation — no other branching exists. `useVisibilityState()` just feeds it `Boolean(useAuth().user)` and the live tournament phase.

### Page access matrix (`src/state/pageAccess.ts`, exact)

| Page | Allowed phases | Requires login? |
|---|---|---|
| Home (`/`) | all 4 | never gated |
| Predictions | all 4 | yes |
| Leaderboard | started phases only (league/pre-knockout/knockout) | no — visible logged in or out, once started |
| Forum | all 4 | yes (was open to logged-out visitors once-started; a later product decision closed that) |
| Stats | started phases only | yes |
| Profile | all 4 | yes |

Every page that fails its own gate renders the **exact same literal string**, independently in each file: `<p>Bu bölüm şu anda kullanılamıyor.</p>` ("This section isn't available right now.") — live-confirmed on Predictions, Leaderboard, and Stats while logged out during the current real `notstarted` phase. It's tested per-page but duplicated six times (once each in Predictions/Leaderboard/Forum/Stats/Profile, plus once more in an unrelated dead component — see §13) rather than centralized.

### Top navigation (`src/shell/AppShell.tsx`)

The header nav is a **separate** lookup table keyed on the same `VisibilityState`, and a dedicated test (`AppShell.test.tsx`) asserts it always matches `pageAccess.ts` exactly:

| State | Nav links shown |
|---|---|
| `loggedout_notstarted` | Ana Sayfa (Home) only |
| `loggedin_notstarted` | Ana Sayfa, Forum |
| `loggedout_{started phase}` | Ana Sayfa, Puan Durumu (Leaderboard) |
| `loggedin_{started phase}` | Ana Sayfa, Puan Durumu, Forum, İstatistikler |

**Predictions and Profile are never top-nav links, in any state.** Predictions is reached only via a contextual "Tahminini Yap" CTA on the logged-in home dashboard (which itself disappears once you've submitted); Profile is reached only via the avatar/name in the header's account slot. There's also a `/dev` link in the account slot, gated on `import.meta.env.DEV`, with a code comment: *"Mert: 'ill remove it way before launch'."*

No footer exists anywhere in the app.

---

## 5. Auth &amp; onboarding

**Sign-in method: Google only.** `signInWithPopup(auth, new GoogleAuthProvider())` (`src/auth/LoginButton.tsx`) is the sole authentication entry point in the entire codebase — confirmed by exhaustively grepping for every other Firebase Auth method (email link, anonymous, phone, Facebook, GitHub, etc.); none exist. **Live-confirmed:** clicking the sign-in button opens a real Google OAuth consent screen pointed at `kupatakipucl.firebaseapp.com/__/auth/handler` with a real, registered OAuth client ID — this is genuinely wired up, not a stub. Cancelling the popup surfaces a visible Turkish error under the button ("Giriş yapılamadı, tekrar deneyin.") rather than failing silently.

**`ProfileGate`** blocks the *entire* app (everything below `AuthProvider`) until a signed-in user has **both** a `profiles/{uid}` document **and** a `surveyResponses/{uid}` document. If either is missing, it renders the onboarding flow instead of the app. This is deliberately **not resumable**: closing the tab or reloading mid-quiz restarts from the very beginning next time, by explicit design choice (stated directly in the code's own comments) — a stale partial profile/photo from an abandoned attempt is simply overwritten later, never cleaned up specially.

**`SignupFlow` — exact step sequence:**

| # | Step | What happens |
|---|---|---|
| 1 | welcome | Static "#kupatakipucl'ye hoş geldin!" message, auto-advances after 2.6s |
| 2 | photo | Circular photo picker, manual continue, disabled until a file is chosen |
| 3 | name | First/last name, each capped at 15 characters — **locked forever once set, no edit UI ever exists**. → **First Firestore write** here: photo is compressed (96px/quality 0.5) and uploaded to `profile-photos/{uid}-{timestamp}`, then `profiles/{uid}` is `setDoc`'d with `{firstName, lastName, photoURL, createdAt}` |
| 4 | bounce-profile | "Tamamdır! Şimdi sana birkaç sorumuz var." confirmation beat, auto-advances |
| 5 | quiz-age | Age 10–90, iOS-style scroll wheel + explicit step buttons (added because trackpad scroll wasn't reliably reaching the wheel) |
| 6 | quiz-knowledge | "Futbol bilgini nasıl değerlendirirsin?" — 7 options from "Hiç alakam yok" to a tactics-nerd joke option |
| 7 | quiz-messi | Messi vs. Ronaldo vs. no opinion |
| 8 | quiz-superlig | Which Süper Lig team (Galatasaray/Fenerbahçe/Beşiktaş/Trabzonspor/other/none) |
| 9 | quiz-uclteam | Pick a UCL team you support, from all 36 crests, or "Yok" |
| 10 | quiz-device | Phone/desktop/both — **selecting immediately fires the second write**, no separate confirm step: `surveyResponses/{uid}` gets `{age, footballKnowledge, messiOrRonaldo, superLigTeam, uclTeam, device, submittedAt}` |
| 11 | bounce-survey | "Kayıt başarılı!" confirmation, then `onDone()` — hands control back to `ProfileGate` |

Both writes have inline error handling that keeps the user on the same step with a Turkish retry message rather than silently advancing. Motion throughout uses one shared "cotton" easing curve (§9); a persistent progress bar fills across the whole sequence; the back button is hidden on the four beat/welcome/bounce screens.

---

## 6. Feature tour

### 6.1 Home (`/`)

The only page with dedicated compositions for two of the eight `VisibilityState`s; the other six ("started," in any phase, either login state) currently share one **generic, unfinished skeleton** in `HomePage.tsx` itself:

```
"[Placeholder] Started, not logged in: mission blurb + sign-up-closed notice + match days remaining go here."
"[Placeholder] Started, logged in: same as above, plus chat access."
```

These two bracketed strings are shipped verbatim, live, in the current codebase — the "started" experience (once the tournament actually begins) has never been designed past a team table + player list + leaderboard table.

**`loggedout_notstarted` — live-confirmed via screenshot, desktop and mobile:** A single, deliberately non-scrolling screen. An animated background (`DustHaze` — 5 heavily-blurred, CSS-animated color blobs plus a faint fractal-noise overlay; the code comment quotes the original design brief verbatim: *"an animating blurred haze of enlargened dust particles in a dance of pitch black and blue, moving with elegance and embodying high definition"*). Left side: a headline reading "36 takım. **{N}** katılımcı. 1 turnuva." where the number is rendered through an odometer-style digit animation (`SlotNumber`) — **and is not the real count**. It's driven by `useIrregularCounter`, an explicitly decorative hook that climbs by +1/+2/+3 at random short intervals and snaps back down once it exceeds 1.5× the real base, looping forever purely for visual liveliness (live-observed: the number changed from 58 to 59 to 65 across three page loads with no data changing). Below the headline: the real Google sign-in CTA, and a small avatar stack + "**52** kişi katıldı" using the actual, un-animated participant count. Right side: a plain-language explanation of the game, and a 4-digit Gün/Saat/Dakika/Saniye countdown to the Sept 8, 2026 deadline.

**`loggedin_notstarted`:** `LoggedInHome` (a pure data-fetching wrapper — deliberately kept separate so its auth-gated live listeners, like chat, "only ever mount for a signed-in visitor") renders `HomeLandingLoggedIn`, a Frame/bento dashboard: a welcome banner with a "Tahminini Yap" CTA (hidden once you've submitted) and a mini countdown, then a four-column cell row — **Katılımcılar** (lobby-scoped participant list with gold checkmarks for who's submitted, plus the lobby switcher), **Forum** (a 3-post preview), **HomeHero** (a shared crossfading portrait carousel, reused from the leaderboard/stats pages), and **Sohbet** (lobby-scoped live chat with an online-count badge).

### 6.2 Predictions (`/predictions`)

A **one-time door, not a page you revisit**: the code's own comment calls it exactly that. It's only reachable when `state === "loggedin_notstarted"` **and** no prediction has been saved yet — any other visit (already submitted, or the tournament has started) redirects straight home. Editing an already-submitted prediction happens entirely on the Profile page instead, using the same ranker component.

Visually it abandons the site's normal Frame/bento chrome and instead reuses `SignupFlow`'s own full-viewport sequence machinery (`AutoAdvance`, `BounceCheck`, the same "cotton" transition curve): a few fading narrative "beats" (one of which shows a static `ScoringExampleDiagram` illustrating the scoring rule) → a drag-and-drop `TeamRanker` (built on `@dnd-kit`, all 36 teams, defaults to alphabetical order) → submit → "Tahminlerin kaydedildi!" confirmation → auto-return home after 2 seconds.

A prediction is stored as `{ranking: string[], submittedAt, updatedAt}` — a strict full ordering of all 36 team IDs; array position *is* the predicted finishing position, there's no separate rank field. Re-saving preserves the original `submittedAt` while bumping `updatedAt`.

The intro copy also **explicitly promises a second, knockout-round prediction** once the league phase ends. No such feature — data model, hook, or UI — exists anywhere in the codebase (confirmed by an exhaustive "knockout" grep). This is a real product promise with nothing built behind it yet.

### 6.3 Leaderboard (`/leaderboard`)

A three-column bento layout (team table | hero carousel | standings), deliberately widened to 1400px past the site's normal 1100px content cap (flagged in its own code comment as "a discussion point, not a silent drift").

- **`TeamTable`** — all 36 teams, real standings once available, clicking a row opens **`TeamPopup`**.
- **`TeamPopup`** mixes real and entirely fabricated data:
  - *Real*: rank/points, full 8-fixture match history (derived from the real fixture calendar + whatever results exist), and a "who predicted this team" list ordered by each predictor's real overall rank.
  - *Fabricated*: the "dossier" tab — manager name, formation, starting XI, top scorers/assists/ratings — is **100% seeded-random fake data**, deterministic per team (so it doesn't reshuffle on reload) but not connected to any real football data source. The code says so directly: *"there is no existing API for football data wired right now... just do dummy data."*
- **`ParticipantPopup`** — a participant's full profile: their prediction, their quiz answers (a deliberate privacy reversal — originally meant to be aggregate-only/anonymous, changed so this popup could show individual answers), and their rank history.
- **Rank history is a real gap**: the only code that produces a historical rank trajectory (`rankHistory.ts`) works by replaying the **dev-only** `devMatches` collection outcome-by-outcome. Its own comment states plainly that there is **no equivalent mechanism for production data at all** — real results are hand-edited directly into Firestore with "no code path to snapshot through," because results automation was explicitly scoped out. In other words: once this tournament is live, there is currently no way for the app to show anyone's rank trajectory over time, only their current rank.
- **`UpcomingMatchesDrawer`** — a collapsible bottom drawer of upcoming fixtures, deliberately *not* gated by login/phase (unlike everything else on this page) so it works for a logged-out, pre-launch visitor too.

### 6.4 Stats (`/stats`)

Two Frames side by side plus a hero carousel: "Turnuva İstatistikleri" (team-bias — which teams over/under-perform their average predicted position; team-agreement — which teams' predicted positions cluster tightly vs. are all over the place; plus 3 widgets of intentionally-fake sample player stats) and "Katılımcı İstatistikleri" (real distributions: age buckets, football-knowledge self-rating, Messi-or-Ronaldo, Süper Lig team).

One bar chart, **"UCL Takımı," is entirely hardcoded placeholder data** (a fixed 5-row array) despite the underlying `uclTeam` survey field being real, collected data since day one — the gap is simply that the stats module never grew an aggregation function for that one field (every other survey question has one). The code comments frame this as pending a planned conversion of that field from free text to a fixed dropdown.

### 6.5 Forum (`/forum`)

A single flat `forumPosts` collection — replies are just posts with `parentId` pointing at a root post; there is **no real nesting**, ever (the UI always attaches a new reply directly to the thread root, even when replying to a reply). The illusion of threaded conversation comes entirely from a **quote mechanism**: a reply can snapshot another post's text/author at quote time, and that snapshot survives even if the quoted post is later hard-deleted.

Likes are denormalized directly onto each post as a `likedByUids` array, toggled with `arrayUnion`/`arrayRemove` (no separate collection, no read-then-write race). Deleting a post is a **real, hard delete** (unlike chat's soft delete, see below) — cascades to every reply in one batch, then best-effort cleans up any attached Storage images. The live post feed is capped at the 50 most recent documents and cached client-side (in-memory + a 5-minute `localStorage` layer) so repeat visits paint instantly instead of showing a loading flash — the same caching/pagination module is shared verbatim across the forum and both chat surfaces.

### 6.6 Chat

Two chat surfaces exist, split purely by **Firestore collection path**, not a `lobbyId` field: global chat lives at `messages`, a Special Lobby's chat lives at `lobbies/{lobbyId}/messages`. Every read/write/search/delete helper takes an optional `lobbyId` and switches path accordingly.

Composer: auto-growing textarea, `@mention` autocomplete, quote chips, a 360-character hard cap with a counter that only appears past 300 characters, a send cooldown. **Typing indicators are a global-chat-only feature** — deliberately disabled for lobby chat. Messages support only a self-delete (a soft "deleted" flag, rendered as a placeholder — the document itself is never removed); author lookups always resolve against the *global* player list even inside a lobby, specifically so someone who has since left or been removed from a lobby doesn't have their old messages wrongly show up as belonging to a deleted account.

**Presence and typing status live on Realtime Database, not Firestore** — migrated deliberately for cost reasons (the old Firestore version used a 20-second heartbeat plus a collection-wide live listener, which cost reads proportional to writers × listeners). The new mechanism has no heartbeat at all: it registers a server-side `onDisconnect().remove()` *before* writing its own presence flag, so a dropped connection (closed tab, crash, lost network) is cleaned up by Firebase's servers, not a client-side timeout. Typing status layers three independent rate limits: a 6-second client-side staleness cutoff, a 1-second minimum-write-interval on the client, and a matching ≥1-second write-gap enforced server-side in `database.rules.json` itself.

### 6.7 Special Lobbies ("özel lobi")

Small, invite-only sub-groups within the main pool, each with its own membership, chat, and management panel. A user may own up to 3 and belong to up to 3 total.

- **Data model**: `lobbies/{id}` holds `{name, createdByUid, createdAt, memberUids[]}` — `memberUids` is a **denormalized mirror** of the real source of truth, the `lobbies/{id}/members/{uid}` subcollection, added purely so the Firestore security rule can check membership on the one document it's already fetching instead of paying a second read per access. Invites (`lobbyInvites/{id}`, top-level collection) expire after exactly 1 hour and can only be looked up by their own ID — listing all invites is explicitly forbidden in the rules ("defeats invite-only entirely").
- **Lifecycle**: create/join/leave/rename/remove-member/delete are all real, individually-tested actions. A few notable details: leaving as the owner transfers ownership to the longest-standing remaining member (or deletes the lobby if it was the last member); deleting a lobby deletes its members in **chunks of 15**, because a Firestore security rule that does an in-batch `get()` for every non-self member-delete runs into Firestore's hard 20-rules-call-per-batch ceiling on anything larger.
- **UI**: `LobbySwitcher` is literally just a bare "›" arrow that cycles through your lobbies plus "General" — no dropdown, no label (deliberately simplified from an earlier version). `LobbyManagementPanel` covers rename (saves on blur), invite-link generation, a member list with a crown icon on the owner, member removal, leaving (no confirmation), and deletion (does require a confirmation dialog).

### 6.8 Profile (`/profile`)

The **only** editable field is the photo. First/last name have no edit control anywhere — locked forever by explicit design, both client- and server-enforced. The page also shows (once the tournament has started) a rank/points mini-stat, a read-only table of the user's own quiz answers, and their prediction — re-editable via the same ranker (behind an "Emin misiniz?" overwrite confirmation) until the tournament starts, after which it becomes a read-only list annotated with everyone's average predicted position per team. Deleting your account removes your profile and prediction documents, best-effort-deletes your photo from Storage, signs you out, and sends you home — but **deliberately leaves your old chat and forum messages in place**, which is why every author-lookup surface in the app has to handle rendering a vanished uid as "Silindi" with a fallback avatar.

### 6.9 Dev Panel (`/dev`, dev-only)

A developer tool, only compiled in when `import.meta.env.DEV` is true, for previewing the app without waiting on real calendar dates: force a tournament phase, force a logged-in/out UI state, set a fake "current date," and step through fixture outcomes matchday by matchday (which also writes synthetic standings straight into the real `results` collection — an explicitly temporary, self-documented hole in the security rules, see §13).

**Live-reproduced bug:** every one of these overrides is backed by Firestore documents (`devConfig/state`, `devMatches/*`) whose security rule is `allow read, write: if request.auth != null` — i.e. it requires a genuinely signed-in session, any account, full stop. A session that has never actually signed in gets `Missing or insufficient permissions` on **every** read and write here, and the panel gives **no visible indication of this in its own UI** — buttons render normally, the "automatic" option correctly shows as selected (since it matches the client-side default the failed read leaves in place), and the only evidence is in the browser console. I captured this directly: navigating to `/dev` while logged out throws repeated console errors, and clicking a phase-override button throws an uncaught `Missing or insufficient permissions.` rejection with zero on-screen feedback. A developer who hasn't signed in with a real Google account first will see what looks like a fully working panel that silently does nothing.

---

## 7. Scoring &amp; tournament mechanics

**Scoring formula** (`src/leaderboard/scoring.ts`, duplicated by hand — not imported — in `functions/leaderboard/index.js` for the server-side precompute):

```ts
isPickCorrect(predictedPosition, actualPosition) = Math.abs(predictedPosition - actualPosition) < 3
POINTS_PER_CORRECT_PICK = 3
```

Each of a participant's 36 picks scores 3 points if their predicted finishing position is within 2 places of the team's real one (a gap of exactly 3+ scores 0). Theoretical maximum: 108 points, for a perfect prediction. Ties on the leaderboard use standard competition ranking (shared ranks, next rank skips — `1,1,3,3,3,6`).

**Tournament phase is a manual switch, not a calendar computation.** `useTournamentPhase()` subscribes to a single Firestore document, `tournamentState/current`, whose `phase` field is set by hand (there is no admin UI anywhere in the app — it's edited directly in the Firebase console) and defaults to `notstarted` if the document doesn't exist. The dev-only phase override is a completely independent mechanism layered on top, and doesn't require also faking a matching date — there's a *separate*, also-independent dev override (`resolveNow()` / a `?debugDate=` URL param) that only affects what the app considers "upcoming" for the fixtures drawer.

**The fixture calendar is real.** `src/devpanel/fixtures.ts` encodes the genuine, complete 2025/26 UEFA Champions League league-phase schedule — 144 fixtures across 8 matchdays, all 36 real clubs (including the real 2025/26 debutants: Kairat Almaty, Pafos, Athletic Club, Union Saint-Gilloise, Qarabağ), real kickoff times converted to Turkish local time. The one deliberate fabrication: every date's *year* is bumped forward by one (2026 standing in for 2025, 2027 for 2026), because the real 2026/27 calendar doesn't exist yet. This same file, together with `devpanel/standings.ts`'s table-computation logic (points/goal-difference/head-to-head-free tiebreaks, with every scoreline synthesized as either 1-0 or 0-0 purely so the columns aren't all zero), powers the entire dev-preview experience — and, per the rank-history gap above, has no counterpart wired up for real production results at all.

**Server-side precompute**: `functions/leaderboard` is triggered on every write to `predictions/{uid}` or `results/{teamId}`, doing a full (non-incremental) recompute of every participant's score and rank, written to `leaderboardCache/current` — the one document clients actually read, so nobody's browser has to download and re-score every prediction on every visit.

Those triggers **coalesce** rather than recomputing once per changed document (2026-08-07 scaling pass, §11). A single dev-panel match outcome rewrites all 36 `results` docs in one batch; measured in production at 250 participants, that now costs **3 recomputes rather than ~36**, and a 200-write prediction burst costs 2. The commit is transactional and refuses any write whose read began before the stored result's, so overlapping recomputes cannot lose an update — the old code could silently drop a just-submitted prediction from the leaderboard with nothing scheduled to re-trigger it.

---

## 8. Data layer — Firebase in detail

### 8.1 Firestore collections

| Collection | Read | Write | Notes |
|---|---|---|---|
| `profiles/{uid}` | public | owner only | Validated server-side: names ≤15 chars, matches the client cap |
| `predictions/{uid}` | public | owner only | Validated: `ranking` must be exactly 36 entries |
| `surveyResponses/{uid}` | any signed-in user | owner, create-only (no update/delete) | Read access was deliberately widened from owner-only once `ParticipantPopup` needed to show others' answers |
| `results/{teamId}` | public | **any signed-in user** | Explicitly a *temporary* hole — comment: "so the dev panel can push synthetic standings from the browser; tighten back to `if false` once admin tooling lands" |
| `leaderboardCache/{doc}` | public | nobody (client `write: false`) | Only the Admin-SDK-run Cloud Function can write it |
| `tournamentState/{doc}` | public | any signed-in user | The single manual phase-switch document; same "no admin UI yet" trust model as `results` |
| `devConfig/{doc}`, `devMatches/{id}` | signed-in only | signed-in only | Dev-panel state (§6.9) |
| `messages/{id}` (global chat) | signed-in only | owner-attributed create; self-delete-flag-only update | 360-char server-enforced cap |
| `forumPosts/{id}` | public | owner-attributed create; limited update (own text, or anyone toggling their own like) | Hard delete allowed (own post, or any reply under a post you own) |
| `lobbies/{id}` | members only (via denormalized `memberUids`) | creator create; member rename/ownership-transfer; creator delete | |
| `lobbies/{id}/members/{uid}` | self or existing members | self-join (direct or invite-gated) | |
| `lobbies/{id}/messages/{id}` | members only | members only | Structurally identical to global chat |
| `lobbyInvites/{id}` | get-by-id only (list forbidden) | existing member, server-enforced 1-hour TTL | |

Overall posture, stated repeatedly in the rules file's own comments: an explicit **pre-launch, "trust the friend group," no-adversarial-threat-model** stance, with the two temporary holes above (`results`, `tournamentState`) both flagged for tightening once real admin tooling exists.

There is exactly **one** composite/field-override index defined in `firestore.indexes.json` — supporting the lobbies' `collectionGroup(members) where uid ==` query. Nothing else is indexed.

### 8.2 Realtime Database

Two paths only (`database.rules.json`): `presence/{uid}` (boolean-only, owner-write) and `typingStatus/{uid}` (owner-write, server-enforced ≥1s write gap). Nothing else lives here.

### 8.3 Storage

Two paths (`storage.rules`): `profile-photos/{uid}-{timestamp}` (signed-in read, owner create/delete, 5MB cap) and `forum-images/{uid}-{timestamp}` (public read, signed-in create, 5MB cap, PNG/JPEG/WebP only). Every upload gets a fresh timestamped path rather than a fixed one per user, specifically so an immutable cache header is always safe to set (a cached URL is either current or an orphan nobody links to, never stale).

---

## 9. Visual &amp; design language

**One fixed dark theme, always** — regardless of the visitor's OS setting. The code is explicit that this was a deliberate rework "to reflect cursor.com/home's dark mode." shadcn's `dark:` class scaffolding is present in vendored components but the `.dark` class is never actually applied anywhere; it's kept only so those components don't accidentally respond to `prefers-color-scheme` on their own.

**Typography: Inter Variable, exclusively.** Every text role — display, heading, body, and even the "mono" role used for numerals — points at the same single variable font file. This replaced an earlier "Martel Sans" and is called out in the CSS as a deliberate, singular choice.

**Color tokens** (`src/styles/colors.css` — the literal single source of truth; even the static favicon SVG and the OG-image generator script are hand-synced to these hex values, since neither can read a CSS variable):

| Token | Hex | Use |
|---|---|---|
| `--color_main` | `#14120B` | Page background |
| `--color_secondary` | `#1B1913` | Elevated panels, every `Frame`, the top nav bar |
| `--color_text` | `#EDECEC` | Primary text everywhere |
| `--color_accent` | `#1F8A65` | The one brand accent (a teal-green) — hover/focus/active states |
| `--color_green` | `#1F8A65` | Identical value to accent today, kept as its own token on purpose — this one specifically means "this prediction is correct," free to diverge later |
| `--color_remove` | `#CF2D56` | Delete/error/destructive actions |
| `--color_gold` | `#FBBF24` | Rank numerals, submitted-checkmarks, quiz-highlight |
| `--color_qualification` | `#F59E0B` | The playoff-band tick in standings |
| `--color_textsecondary` / `border1` / `border2` / `hoverfill` | derived via `color-mix()` off `color_text` | Dimmer text, hairline borders, focus rings, subtle hover fills |

The color system carries a visible naming history: an earlier "press-box" metaphor (`navy`, `silver`, `brass`, `press-white`, `ink`) was fully renamed to the generic `color_*` tokens above; the old names survive only as thin aliases so the untouched shadcn vendor files keep working.

**Motion**: one shared easing curve, nicknamed "cotton" in the code — `cubic-bezier(0.22, 0.61, 0.36, 1)` — used for nearly every enter/exit transition across the whole app (signup beats, predictions intro, dialogs). Fully respects `prefers-reduced-motion` (animations are killed outright, not just shortened). The Home hero's ambient background blobs (`DustHaze`) animate via a single shared, pure-CSS `@keyframes` rather than a per-frame JS loop, specifically so five concurrently-blurred blobs cost the compositor rather than the main thread.

**Layout**: content is capped at 1100px almost everywhere; the Leaderboard page explicitly and deliberately widens to 1400px (flagged in its own comment as a conscious exception, not drift). Desktop is treated as a **fixed-viewport app shell** — `html`/`body`/`#root` get `height:100%; overflow:hidden` above 1024px, and any region that needs to scroll gets its own internal scroll container. Below that width, the document scrolls normally, and the top nav becomes its own horizontally-scrollable strip rather than collapsing into a hamburger menu — live-confirmed at a 390×844 mobile viewport: the layout reflows into a single stacked column cleanly, with the header taking three wrapped rows.

**The `Frame` component** (`src/components/ui/frame.tsx`) is the core visual metaphor for nearly every panel in the app — explicitly *not* shadcn's `Card`, hand-rolled from scratch as a "picture-frame / trophy-case" cell: a two-part mat-plus-banded-header composition, with a southeast-offset drop shadow that was deliberately dialed back from an earlier, harsher first pass per direct designer feedback quoted verbatim in the CSS ("you went too far, drop the opacity and go a bit easier on the hardness").

**"Cursorify"**: the whole app resets to a default cursor at the root (`cursor-default` on `AppShell`'s outer div) and every genuinely interactive element opts back into a pointer cursor individually — a named, deliberate, documented convention, not an accident.

One current, significant, easy-to-miss visual fact: **team crest artwork is currently randomly mismatched against real club identity, everywhere in the app.** The 36-team roster itself is accurate (`src/predictions/teams.ts`), but each team's crest image is chosen by hashing the team's own ID into an *unrelated* pool of 29 "next season" club badge SVGs — meaning, for example, the crest shown for Ajax might actually be Arsenal's badge or Real Madrid's. It's stable (the same team always gets the same wrong badge) and entirely deliberate — the code quotes the reasoning directly: *"just randomly assign them to teams, since the whole team list will be totally replaced anyway"* — but it means no crest anywhere in the current app (team table, ranker, popups) should be taken as accurate.

---

## 10. Testing

Vitest + jsdom + React Testing Library. `test/setup.ts` polyfills exactly what's needed and no more — `ResizeObserver`, `IntersectionObserver` (traced to `motion`'s `whileInView` scroll reveals), `matchMedia` (traced to a `prefers-reduced-motion` check), `scrollIntoView`, and `URL.createObjectURL` (traced to the forum's image preview) — every polyfill beyond the first is tied in a comment to the exact component that needs it.

`src/App.test.tsx` is a genuine integration smoke test, not a stub: it mocks Firebase Auth/Firestore/Database fairly completely and asserts three real behaviors — the logged-out landing page renders, a logged-in user can navigate to and use the real forum, and a disallowed direct route shows the correct blocked message.

Coverage is broad and current: the large majority of feature modules across `predictions/`, `leaderboard/`, `stats/`, `chat/`, `forum/`, `lobbies/`, `signup/`, `home/`, `devpanel/`, and `tournament/` have a parallel `.test.ts(x)` file, and several of those tests are the clearest documentation of *intended* behavior where the implementation itself doesn't spell it out (e.g. the exact scoring boundary, the standings tiebreak order, the nav-matches-access-matrix invariant).

---

## 11. Backend, infra &amp; deployment

**`functions/leaderboard`** — a normal Firebase Function codebase (Node 20, `firebase-admin`/`firebase-functions`), the only one wired into `firebase.json`. **Three** deployed functions, all in `europe-west8`: two Firestore-write triggers (`predictions/{uid}`, `results/{teamId}`) and `recomputeLeaderboardSafetyNet`, a 5-minute scheduled pass. All three route through one full-recompute routine that reads all predictions/profiles/results, scores and ranks everyone, and writes to `leaderboardCache/current`. Its own header comment flags a real, ongoing maintenance risk: the scoring logic here is a **hand-duplicated copy** of `src/leaderboard/scoring.ts`, not an import — this is a separate JS runtime from the TS client app, so the two must be kept in sync manually.

Three things about this codebase are load-bearing and easy to break (all from the 2026-08-07 scaling pass):

- **`leaderboardCache/control`** holds the coalescing state (request token, timestamps, `computeCount`). It sits in `leaderboardCache` deliberately so no `firestore.rules` change is needed — that collection is already `read: true, write: false`, and the Admin SDK bypasses rules.
- **`recomputeGuard.js` holds the concurrency decisions as pure functions**, unit-tested in the normal suite. `shouldCommitRecompute`'s second guard is what makes stored results monotonic in read freshness; without it the staleness ceiling would reintroduce the lost-update race it exists to prevent.
- **The scheduled function's region is pinned explicitly.** Firestore triggers infer their region from the database's location; `onSchedule` does not, and would otherwise deploy to `us-central1` and read cross-region. Also: Firebase treats *every* export of this module as a deployable function, so helpers must stay module-private or the deploy fails.

**`functions/stopbilling`** — **not a Firebase Function.** It's a small Cloud Run service (Node, `@google-cloud/functions-framework`) that acts as a billing killswitch: a Cloud Billing budget-alert → Pub/Sub → Eventarc chain invokes it, and if spend exceeds budget it calls the Cloud Billing API to unlink the project's billing account entirely, killing all billing outright. It's deployed by hand (`gcloud run deploy`, region `europe-west8`), lives completely outside `firebase.json` and any CI, and its own README documents a real past incident: using the Cloud Run console's "deploy new revision" UI instead of the CLI once silently reverted it to a placeholder image with no code actually deployed.

**No CI/CD exists anywhere** (no `.github/workflows`, no other pipeline config found). Every deploy — Firestore/Storage/RTDB rules, the leaderboard function, and the stopbilling service — is a manual, developer-run CLI command today.

**No hosting target is currently configured.** `firebase.json` wires up Firestore, Storage, Database, and Functions — but has **no `hosting` key at all**, and no `vercel.json`/`netlify.toml`/equivalent exists anywhere else in the repo either. `npm run build` produces a working `dist/`, but there is currently no configured destination for it; `firebase deploy` today would not publish the site itself, only the backend pieces. Consistent with the pre-launch status, but worth flagging plainly since it means "how does this actually go live" is presently an open question.

**Scripts** (`scripts/`, all one-off Node tools a developer runs by hand, none part of any build/deploy pipeline):
- `seed-dummy-participants.mjs` / `seed-dummy-surveys.mjs` — seed the 50 synthetic participants, authenticated via `gcloud auth print-access-token` against the real REST API.
- `set-dev-config.mjs` — a CLI mirror of the DevPanel's own Firestore doc, explicitly written to be drivable without touching the browser.
- `import-club-badges.mjs` — processes the raw sourced club-badge SVGs into clean, slugged files and generates `src/predictions/clubBadgeSlugs.ts`.
- `crop-hero-images.mjs` — crops raw player photos to a fixed portrait ratio using a hand-tuned per-photo focal point map.
- `gen-og-image.mjs` — generates the site's Open Graph share image, reading brand colors directly out of `colors.css` rather than hardcoding them a second time.

---

## 12. Assets

Three overlapping-but-distinct club-crest asset sets exist, reflecting an in-progress, half-finished roster swap rather than accidental duplication:
- **`team_logos/`** (36 PNGs, `football-logos.cc`-sourced) — matches the *current* real team roster... and is **entirely unused**. A repo-wide search found zero references to this directory anywhere in `src/`. It appears to be fully dead asset weight.
- **`assets/club_badges/`** (29 raw, messily-named SVGs, Wikipedia-sourced) → **`public/club-badges/`** (the same 29, cleanly slugged by `scripts/import-club-badges.mjs`) — a real source→processed pair, and this *is* the set actually wired into the UI, via the random-but-stable crest-mismatch mechanism described in §9. Per its own generating script's comment, this is deliberately "real badges for next season's confirmed UCL clubs," prepared ahead of a full team-list replacement that hasn't happened yet.

Brand assets follow the same pattern: one raw original with a filename typo (`assets/other/kupatakipiucl_logo_black.svg`) versus three cleanly-named, actually-served variants in `public/brand/`. `public/fonts/` is an empty, untracked, vestigial directory — the real font ships via the `@fontsource-variable/inter` npm package instead, bundled directly into Vite's build output.

---

## 13. Rough edges &amp; known gaps

Ranked roughly by how much they'd surprise someone picking this codebase up cold.

### A. Pervasive references to design docs that no longer exist

The single most widespread issue in this codebase. The commit immediately preceding this document (`05ba98d`, "Remove stale design questionnaires and specs") deleted 72 files and ~17,000 lines: `SPEC.md`, `DESIGN-SPEC.md`, `DESIGN.md`, `PAGEMAP_SPEC.md`, `PRODUCT.md`, `TEAM_POPUP_QUESTIONNAIRE.md`, the entire `onboarding/` tree (`PAGE_BRIEFING.txt`, eight rounds of `pagemap-questionnaires/`, audit/review docs), and `docs/superpowers/{specs,plans}/`. But **over 30 source files still cite specific section numbers from these documents** in comments explaining *why* the code behaves the way it does — `firestore.rules`, `storage.rules`, `src/shell/AppShell.tsx`, most of `src/leaderboard/*`, `src/home/*`, `src/signup/*`, `src/tournament/*`, `src/styles/index.css`, and more. A representative sample:

| File:line | What it still cites |
|---|---|
| `firestore.rules:27,65,67,92,104,113,115,119` | `SPEC.md §3/§4/§6/§7/§7b/§8/§8b/§8d` |
| `src/pages/HomePage.tsx:14,43-44` | `onboarding/pagemap-questionnaires/pagemap-round-01.md`, `onboarding/PAGE_BRIEFING.txt`, `PAGEMAP_SPEC.md §3` |
| `src/profile/ProfileGate.tsx:10` | `PAGEMAP_SPEC.md` |
| `src/pages/ProfilePage.tsx:193,351` | `PAGEMAP_SPEC.md §4`, `§5b` |
| `src/leaderboard/TeamPopup.tsx:453` | `TEAM_POPUP_QUESTIONNAIRE.md`'s "full 20-question spec" |
| `src/predictions/*.ts` (several) | `predictions-page-round-02`/`round-03`, question numbers |
| `src/styles/index.css:171,185,196,205` | `DESIGN-SPEC §55/§53/§39/§34/§43/§50` |
| `src/devpanel/fixtures.ts:1` | `SPEC.md §7`'s "swap in the real list" shortcut |
| `src/pages/StatsPage.tsx:41` | `docs/superpowers/specs/2026-07-23-stats-page-design.md` (also deleted) |

A separate, smaller family of citations — informal "scaling-audit No. X" / "not-started-audit item NN" references scattered through `predictions/`, `leaderboard/`, `chat/`, `lib/` — don't even correspond to a file that ever existed in git history as far as could be determined; they read like references to an external, untracked punch-list rather than a deleted doc.

None of this breaks anything functionally — it's a documentation-debt problem, not a code-correctness one — but anyone trying to understand *why* a rule or a component works a specific way will keep hitting dead ends.

### B. Functional gaps and silent failures

- **DevPanel silently no-ops when not genuinely signed in** — live-reproduced (§6.9). Both reads and writes to `devConfig`/`devMatches` require `request.auth != null`; a session that's never signed in gets console-only errors and a panel that looks fully functional but does nothing.
- **No rank-history mechanism exists for real production data** — the only code that computes historical rank replays the dev-only `devMatches` collection; real results (hand-edited, out-of-band) have no equivalent path (§6.3).
- **A promised feature — a second, knockout-round prediction — doesn't exist anywhere** beyond the sentence promising it (§6.2).
- **Stats' "UCL Takımı" chart is 100% hardcoded**, despite the real survey field existing since the first onboarding write (§6.4).
- **Team crest artwork is randomly mismatched from real club identity**, app-wide (§9) — easy to mistake for a bug if you don't know it's deliberate.

### C. Dead code

- **`src/pages/PlaceholderPage.tsx`** — fully built, fully tested, never routed anywhere in `App.tsx`. Reads like a leftover generic "coming soon" stand-in from before Leaderboard/Forum/Stats got real pages.
- **`src/predictions/SubmissionCounter.tsx`** and **`src/leaderboard/LeaderboardCells.tsx`** (`ParticipantCountCell`, `CurrentLeaderCell`) — fully implemented, styled components with zero callers anywhere in `src/`. The latter has no test file either, despite matching the codebase's otherwise-consistent test coverage.
- **`team_logos/`** — an entire 36-file asset directory with zero references anywhere in the source (§12).
- A handful of unused shadcn-registry exports pulled in wholesale with primitives that *are* used: `DialogTrigger`, `TableFooter`, `TableCaption`, `AvatarBadge`.
- Two components (`TeamPopupTuner.tsx`, `devpanel/StatsPageTuner.tsx`) are referenced by real, live tuning-prop plumbing (`TeamPopup`'s and the stats widgets' `tuning` props) but don't exist anywhere in the repo — every real call site omits the prop, so defaults always apply. Either a tool that was never built, or one that got deleted without removing what it plugged into.

### D. Fabricated/placeholder data still live in production code

Beyond the items already called out above: `HomePage.tsx`'s two literal `[Placeholder]` strings for the "started" states (§6.1), and `src/leaderboard/StatWidget.tsx`'s `STAT_WIDGETS` — an entire fictional set of Turkish player names and stats, explicitly documented as intentional dummy data, still rendered live on the Stats page today.

### E. Explicitly-temporary security holes

`firestore.rules` grants any signed-in user write access to `results` and `tournamentState` — both self-documented in the rules file as scaffolding for the dev panel, to be tightened once real admin tooling exists (§8.1). Not a surprise if you read the comments, but a real, currently-live hole nonetheless.

### F. Operational/infra risk

- `functions/leaderboard`'s scoring logic is a hand-duplicated copy of the client's, with only a comment as the sync mechanism (§11).
- `functions/stopbilling` is entirely out-of-band — no CI, not in `firebase.json`, manual `gcloud` deploys, and a documented history of the Cloud Run console silently reverting it (§11).
- **No hosting target is configured anywhere** — there's currently no path from `npm run build` to a live URL (§11).
- No CI/CD at all, for anything.
- Single Firebase project serves both local development and the eventual real launch — fine while pre-launch and dummy-data-only, worth revisiting once real users exist.
- Google-only sign-in — no fallback for a friend without or unwilling to use a Google account.

### G. Minor code hygiene

- `vite.config.js` / `vite.config.d.ts` regenerate at the repo root on every `npm run build` (a `tsconfig.node.json` missing `noEmit: true` causes `tsc -b` to emit them) — cosmetically confusing on disk, but confirmed **not** a git-hygiene problem: only `vite.config.ts` is actually tracked, the rest are correctly gitignored.
- The "Bu bölüm şu anda kullanılamıyor." gate string is duplicated literally across six files instead of centralized.
- `stats/surveyAggregates.ts`'s `MESSI_OR_RONALDO_LABELS` duplicates `predictions/surveyLabels.ts`'s `MESSI_RONALDO_LABEL` instead of importing it.
- `src/components/ui/table.tsx` carries a leftover, meaningless Next.js `"use client"` directive — harmless in this Vite SPA, just copy-paste residue from the shadcn registry template.
- The two club-badge asset pipelines are inconsistent — one is scripted end-to-end, the other (`team_logos/`, unused anyway) never had a processing step at all.
- `public/fonts/` is an empty, vestigial leftover from an abandoned self-hosted-font approach (§12).
- Small, unexplained discrepancy: the landing page's real participant counter currently reads 52, versus the documented 50 seeded dummy profiles.

### H. Non-product clutter at the repo root

None of this is application code, and none of it needs fixing before anything else — noted only because it's visible clutter a repo-tidy pass could clear: `.superpowers/sdd/` (gitignored scratch state — batch reports and diffs from this project's own AI-assisted build process), an empty, oddly-named directory literally called `C:UsersMertDesktopreposkupatakipucl.superpowerssdd` (almost certainly an accidental artifact from some past tool invocation concatenating a Windows path incorrectly), and a literal `~/.claude-context` directory (the Claude Context MCP tool's local index, apparently written without expanding `~` on this platform).

---

## 14. Evolution — how we got here

This entire codebase was built in **13 days** (2026-07-19 to 2026-08-01), across **182 commits**, entirely on feature branches merged sequentially into what is now `great-reform`: `signup`, `forum`, `frontend-shadcn`, `color-adjustment`, `home-loggedin-notstarted`, `home-loggedout-notstarted`, `initial-league-prediction`, `optimization-sweep` (a dedicated performance/scaling pass — the RTDB presence migration, forum-listener caching, and several Firestore-read-reduction commits all landed here), `participant-popups`, `team-popups`, and finally `scaling` (the Special Lobby feature and its associated Firestore denormalization work). Two branches — `isolated-expansion` and `league-phase-logged-out` — exist but were never merged and have diverged; a `worktree-agent-*` branch is leftover tooling state rather than product work.

The very last commit before this audit, `05ba98d`, deleted the entire planning/spec/questionnaire paper trail that had accumulated over those 13 days (§13-A) — which is the direct reason this document was requested: with that history gone, the source code and the running app are now the only remaining record of *why* things work the way they do, and this document exists to be the replacement single source of truth.
