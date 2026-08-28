# HANDOVER

For a fresh session picking this project up cold.

**Read [PROJECT.md](PROJECT.md) first** for what the project is, and
**[DEPLOY.md](DEPLOY.md)** for how it ships. This file only covers where things
stand and what to do next.

Written 2026-08-28, following a post-deployment fixes session. Branch: `main`, pushed. All pre-launch checklist items 1–7 are **done**. Additionally, critical adblock-initialization, multi-device presence, and prediction mobile scroll/lag issues were just resolved.

**Updated same day, second session, branch `aesthetic-revamp`** (cut from `main`, pushed, **not merged**): a visual-only reskin — blue palette, ruled grid, Oswald headers. See §3d below.

---

## 1. The site is live (or about to be)

The four steps that only Mert could take — merging to `main`, enabling Pages,
repointing DNS at GitHub, enforcing HTTPS — were his to throw and he has thrown
them. Full detail, if something needs re-checking, in **DEPLOY.md §3**.

1. `launch-prep` merged into `main`.
2. **Settings → Pages → Source: GitHub Actions**, enabled.
3. **Spaceship → kupatakipucl.com → Advanced DNS**: the old parking-page `A`
   records replaced with GitHub's four, plus a `www` CNAME to
   `mertgurgenyatagi.github.io`.
4. **Enforce HTTPS** ticked once DNS settled.

If `https://kupatakipucl.com` is not actually resolving when you read this,
DNS propagation can lag the change by up to 24 hours — check GitHub's Pages
settings page for a stale-DNS warning before assuming something regressed.

---

## 2. Current state

**Still never launched.** Intended to go live into `notstarted` and stay there
until the league phase begins **2026-09-08**.

| Thing | State |
|---|---|
| Firestore | **`devConfig/state` only.** The 5 phantom lobbies and 8 orphaned messages found this session are purged |
| Firebase Auth | 3 accounts, all Mert's. Authorized domains now include `kupatakipucl.com` and `www.` |
| Storage / RTDB | Empty |
| Security rules | **Deployed**, including this session's lobby-message change |
| Leaderboard functions | Deployed, ACTIVE, `europe-west8`. Untouched this session |
| `tournamentState` | Absent, so the app correctly defaults to `notstarted` |
| Frontend hosting | **Live at `kupatakipucl.com`.** See §1 |
| CI | **Green** on GitHub Actions — unit + integration both |
| Tests | 131 files / 1025 unit, 35 integration, `tsc -b` clean |

---

## 3. What this session did (Post-Launch Fixes)

**8a. Adblock initialization block.** Some ad blockers drop requests to `firestore.googleapis.com/.../Listen/channel`, causing `onSnapshot` live listeners to hang infinitely on `loading: true` without errors. We added a 7s timeout fallback (`useLoadingStuck`) that switches to one-shot `getDoc()` / `getDocs()` for core data (`useProfile`, `usePosts`, `useMessages`, `usePlayers`), unblocking initialization.

**8b. Multi-device presence clobbering.** Refactored Realtime Database presence in `usePresenceHeartbeat` to use `push()` connection IDs (`presence/{uid}/{connectionId} = true`). Previously, a second device logging in and out would wipe the user's presence entirely. The rules and hooks now isolate devices.

**8c. Prediction page mobile lag & scrolling.** Fixed severe `@dnd-kit` lag by memoizing `TeamCrest` and swapping `pointerWithin` collision detection for `closestCenter`. Mobile touch dragging was clashing with scrolling, causing drags to cancel/snap back. The definitive fix was separating the two interactions: added a `GripVertical` drag handle to every row on mobile and prediction list slots, attached `touch-none` exclusively to the grip handle, and unified the sensor to use `distance: 5` globally. Now users scroll by touching the row and drag seamlessly by pulling the grip.

**8d. Desktop Navigation Centering.** Fixed a subtle CSS flex layout issue where the desktop navigation links were slightly off-center because the logo/brand (left) was wider than the account slot (right).

**8e. Tournament Timeline Updated.** The About page timeline was updated to reflect the final 7-step schedule (Aug 28 – Jun 5), with "Lig Aşaması" and "Eleme Aşaması" correctly formatted as date intervals ("08 Eyl - 24 Şub") via a new `startDate` parameter in `aboutContent.ts`.

**8f. Firebase Analytics.** Initialized Firebase Analytics in `src/firebase.ts` and added the `measurementId` to the env configuration to begin tracking live user visits and device usage.

## 3d. What this session did (Aesthetic revamp branch)

Mert pointed at a sibling local project, `C:\Users\Mert\Documents\irishtable`
(a Premier League fork of this codebase, built for a since-cancelled pitch;
the directory still exists on disk and was used purely as a design reference
this session, never touched). He liked its layout system as-is but wanted to
try its purple → blue palette swap, its ruled-grid background, and its Oswald
header treatment on this app. Work happened on a new branch,
`aesthetic-revamp`, cut from `main`.

**Palette.** `src/styles/colors.css`: `--color_main` and `--color_secondary`
moved from the original warm near-black olive (`#14120B` / `#1B1913`) to a
deep blue (`#020c1d` / `#081326`) — same hue-rotation technique used on
irishtable's own purple→blue swap (target hue ~217°, saturation and lightness
held from the source color per surface, so nothing lost contrast). Green
accent, gold, magenta and every other non-surface color are untouched.

**Grid.** Ported irishtable's ruled-grid background verbatim: new
`--color_grid` / `--grid_size` tokens, painted onto `body` in
`src/styles/index.css`. This replaced the old `.ground-radiance` radial glow
in the same slot (now deleted, along with its `--color_glow` /
`--color_faintglow` tokens) — and required removing `bg-background` from the
two shell roots (`AppShell.tsx`, `MobileShell.tsx`) so the opaque shell
doesn't hide the grid painted on `body` underneath it. Pages with their own
full-bleed `DustHaze` hero (logged-out Home, About) still paint their own
backdrop and don't show the grid — left alone, not reworked.

**Headers.** Installed `@fontsource-variable/oswald`; `--font-heading` now
points at it while `--font-display` / `--font-sans` / `--font-mono` stay on
Inter. Applied `font-heading` to: `FrameTitle` (the h2 in every page's Frame
cells — one edit, propagates everywhere), dialog titles (already used a
`font-heading` class, just retargeted), welcome-banner greetings and their
countdown/rank/points numerals, and the big centered prompt text on every
signup step (`WelcomeStep`, `ChoiceStep`, `AgeRollerStep`, etc.) plus
`PageUnavailable`. Deliberately **not** touched: nav links, buttons, meta/
eyebrow labels, running body copy — and, per Mert's explicit rollback, the
logged-out/not-started home hero headline (`HomeLandingLoggedOut.tsx`,
`MobileHomeNotStartedLoggedOut.tsx` — "36 takım. `<SlotNumber>` katılımcı. 1
turnuva.") stays on `font-display` (Inter).

**Tried and reverted.** Added an ambient two-stop corner glow on the shell
`<main>` (`.ground-glow`, blue top-right / faint green bottom-left, layered
over the grid) and a faint diagonal sheen on the top nav bar and the
leaderboard's navy `FrameHeader` band (`.band-gradient`). Mert said "nevermind
the gradients" — fully reverted: both utility classes, their `--color_glow` /
`--color_glowaccent` tokens, and every call site are gone again.

`tsc -b` clean and all 1030 unit tests pass after every step above, including
the reverts.

## 3b. What the previous session did

**6. Deployment.** Two workflows: `ci.yml` (every branch — typecheck, unit
suite, build, plus the emulator integration suite on a JDK 21 runner) and
`deploy.yml` (pushes to `main` — tests, builds, publishes `dist/` as a Pages
artifact). Publishing from an artifact rather than a `gh-pages` branch keeps
build output out of the repo.

Fixed both silent sign-in breakers: `kupatakipucl.com` and `www.` added to
Firebase Auth's authorized domains (verified by reading the config back), and
the `og:`/`twitter:` tags repointed off `kupatakipucl.web.app`.

**`.env` is committed on purpose.** PROJECT.md claimed `.env.local`
was committed — it is not, so a CI build would have had no Firebase config,
succeeded, and shipped `apiKey: undefined`. Committing costs nothing: Vite
inlines every `VITE_*` var into the public bundle, so all six values are already
downloaded by every visitor. `deploy.yml` asserts they landed in the bundle
rather than trusting it.

**7a. Lobby chat survived lobby deletion.** Root cause was in the rules, not the
client: `allow delete: if false` on lobby messages made the cascade impossible
to write, while the delete dialog promised the opposite. Two orphan sources, not
one — `leaveLobby`'s last-member-out branch never called `deleteLobby` at all.
The lobby doc is now deleted last, so a half-finished cascade is retryable
instead of stranding the rest. Rules deployed; 5 new emulator tests.

**7b. Lobbies on mobile.** `LoggedInHome` returns early for mobile and both
dialogs lived past that point, so the create button did nothing and there was no
way into lobby management at all. Both are mounted on the mobile branch now, and
the panel is a bottom sheet on a phone.

**7c. Raw team slugs.** `uclTeamLabel()`, applied at three call sites — the
profile page *and both branches of `ParticipantPopup`*, which the previous
handover missed.

**Timezone.** CI's first run failed on two date tests that pass here and fail in
UTC. Not an app bug — the app formats in the viewer's zone — but the suite
assumed a Turkish runner. `test/setup.ts` now pins `Europe/Istanbul`.

---

## 4. Documented "facts" that were wrong

Three sessions running, the docs have contained confident falsehoods. Verify
against production before relying on anything here.

- **`.env.local` is committed** (PROJECT.md §9) — it is not, and building on
  that would have shipped a dead site.
- **"Firestore is empty apart from `devConfig/state`"** (previous HANDOVER) —
  five phantom lobby parents held 8 chat messages. They are invisible to a
  normal listing; `showMissing=true` is what surfaces them.
- **"Profile shows raw team slugs"** — true, but it was three surfaces, not one.

---

## 5. What is left

### Before 2026-09-08
- **No way to enter real match results.** The dev panel is the only writer of
  `results`, with synthetic 1-0/0-0 scorelines. This is the biggest functional
  gap and it has a hard deadline.
- **The phase flip on 2026-09-08** is still a hand edit to
  `tournamentState/current`, now admin-only — so it must be done as one of
  Mert's three uids or via a gcloud-token script.
- **Started-phase mobile home has no lobby UI at all.** Not a wiring fix: there
  is no participants cell to hang the control on, so where it goes is a design
  decision.
- PROJECT.md §11 "By 2026-09-08" — Süper Lig "Tutmuyorum" on Stats, the
  fabricated Stats widgets, the dev-panel dependency in production code.

### Not now
Everything under "Later" in PROJECT.md §11 — the knockout phase is months away.

---

## 6. Constraints Mert has set

- **Do not touch the league prediction submitting screen's core interaction.** `TeamRanker` and the
  `/predictions` flow. He intends to replace the interaction. *(Note: We made performance and scroll fixes to it this session per explicit request, but the design/flow remains unchanged).*
- **Do not point DNS or make the site publicly reachable** without asking. §1 is
  prepared up to exactly that line and stops.
- **Knockout is deprioritised.**
- Broad autonomy otherwise: make the change, run the tests, commit.

---

## 7. Working notes

- **Tests**: `npm test` (131 files / 1025). Integration needs JDK 21:
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" PATH="$JAVA_HOME/bin:$PATH" npm run test:integration`
  (35 tests). CI runs both, so a push is now a second opinion.
- **Verify the production build without publishing anything**: `npm run build &&
  npm run preview`. `localhost` is an authorized Firebase domain, so this
  exercises real sign-in against production.
- **Reading and writing production directly**: every script in `scripts/` uses
  the Firestore REST API with `gcloud auth print-access-token`. IAM-authenticated,
  so it bypasses security rules.
- **Admin uids are baked into `firestore.rules`** as `isAdmin()`.
- **`@firebase/rules-unit-testing` is pinned to v3** on purpose.
- **Do not trust code comments about project state.** The reasoning is usually
  still valuable; the claims about what exists are not.
- **Turkish** is the language of every user-facing string, permanently.
- **Mert's conventions**: no I-beam cursors ("cursorify"); pages compose from
  `Frame` cells; ruthlessly favour non-busy layouts.
