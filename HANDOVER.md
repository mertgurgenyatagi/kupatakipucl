# HANDOVER

For a fresh session picking this project up cold.

**Read [PROJECT.md](PROJECT.md) first.** It is the single source of truth for what
this project is: stack, architecture, data model, security rules, Cloud
Functions, testing, deploy, and a full sorted list of known problems. This file
only covers *where things stand right now and what to do next*.

Written 2026-08-27, at the end of the pre-launch session. Branch: `launch-prep`.
Stopped deliberately after item 5; items 6 and 7 are for a fresh session.

---

## 1. Current state

**The site has still never launched.** It is intended to go live imminently into
the `notstarted` phase, staying there until the league phase begins
**2026-09-08**, when sign-up and league predictions both close.

Items 1–5 of the previous handover's pre-launch list are **done and committed**.
Items 6 and 7 are **not started**. See §3.

### Production, verified after this session's work

| Thing | State |
|---|---|
| Firestore | **Empty**, apart from `devConfig/state` (dev-panel-only; production never reads it) |
| Firebase Auth | 3 accounts, all Mert's. Left in place — signing in again reuses the same uid |
| Storage | **Empty** |
| Realtime Database | **Empty** |
| Security rules | **Deployed** with this session's lockdown |
| Leaderboard functions | **Deployed** with the `submitters` doc change, all three ACTIVE in `europe-west8` |
| `tournamentState` | Absent, so the app correctly defaults to `notstarted` |
| Frontend hosting | **Still none.** This is item 6 and the biggest remaining gap |

`leaderboardCache/current` and `leaderboardCache/submitters` do not exist yet.
That is correct: the safety net stands down while the control doc is absent, and
all three are created by the first real prediction submission.

**Backups** of the pre-cleanup Firestore and Auth contents are on the Desktop as
`kupatakipucl-prelaunch-backup-2026-08-27.json` and
`kupatakipucl-auth-backup-2026-08-27.json` — deliberately outside the repo,
which is public.

---

## 2. What this session did

Seven commits on `launch-prep`, on top of `a5403f4`. **Not pushed** — the
branch has an upstream from the previous session, so `git push` is all it
needs.

**1. Purged production** (`scripts/purge-dev-data.mjs`, kept, dry-run by
default). 304 documents: 50 dummy participants plus Mert's own 3 test accounts
(he asked for a clean slate and will sign up again), synthetic results, decided
devMatches, the stale leaderboard cache, and all test forum/chat content. Plus 7
orphaned Storage objects and a stale RTDB presence flag.

The audit turned up **four collections no document mentioned, all dead**:
`postLikes` (the pre-2026-07-31 like model), `presence` (Firestore leftovers
from before presence moved to RTDB), `bracketState` (orphaned R16 pairings with
no code reference and no rule at all), and three expired `lobbyInvites` pointing
at lobbies that no longer existed. It also found **two uids belonging to
already-deleted auth accounts** whose data had been left behind — PROJECT.md §11
problem 34, visible in production.

**2. Swapped in the 2026-27 team list and real crests.** Mert confirmed the 36
badge SVGs in `assets/club_badges/` *are* the field, which resolves PROJECT.md
§12 open question 1. Crests are no longer hash-assigned from a 29-badge pool —
each badge is named for its team id, so `teamCrestSrc` is a direct lookup, and
`teams.test.ts` now asserts badges and teams cover each other in both
directions. Real Betis' source SVG was a 6.5 MB wrapper around embedded rasters
(larger than the rest of the site's assets combined, on the page that draws all
36 crests at once); it and Porto are rasterised to WebP at import. Whole badge
set is now 563 KB.

The swap broke 54 tests from one root cause: `devpanel/fixtures.ts` still held
the departed field and the whole leaderboard reads fixtures from there. The
calendar was re-pointed through a **bijection** of old ids onto new, which
preserves every invariant `fixtures.test.ts` asserts for free, and the mapping
was searched for one producing **no same-country ties**. Same treatment for the
knockout Round of 16, which also lost its four impossible all-domestic ties and
gained the guard test it never had.

**3. Fixed the signup lockout** — and it is **not** what the old handover
described. Abandoning signup is harmless. The real trigger is **deleting your
account**: `deleteProfile` could not remove `surveyResponses` (the rules
forbade it), so the survey outlived the profile, `ProfileGate` routed the user
back into `SignupFlow`, and its closing `setDoc` was rejected as an *update* on
the surviving document. Every deleted account was permanently unable to sign up
again. Fixed in the rules and by making account deletion remove every document
keyed by that uid.

**4. Locked down the rules and made predictions private.** `results`,
`tournamentState`, `devMatches` and `devConfig` are admin-only to write, against
an allowlist of Mert's three uids. Predictions are readable only by their owner
until the phase leaves `notstarted`.

Doing that properly exposed a leak **the docs do not record**: every entry in
`leaderboardCache/current` carries that participant's full ranking, and the
collection was public-read — so hiding the predictions collection alone would
have achieved nothing. It is now behind the same gate. The one thing that
legitimately needs to be public during `notstarted` (who has submitted) moved
to a new `leaderboardCache/submitters` doc written by the Cloud Function, which
also removes a ~150 KiB-per-visit download from the most-visited signed-in page.

Added `integration/firestoreRules.itest.ts` — 28 emulator-backed tests. Every
rules defect this project has hit was invisible to the rest of the suite.

**5. Hid the knockout bracket** until `preknockout`, via a new
`KNOCKOUT_PHASES` constant, and gave the page the first-submission-only door
`/predictions` already had. Neither behaviour was covered by any test —
`pageAccess.test.ts` never mentioned `knockoutPredictions`, and the page's own
tests all run in `loggedin_preknockout` — so both changes passed the existing
suite untouched. Both are tested now.

---

## 3. What is left — work these in order

### 6. Set up deployment — the biggest remaining gap
No hosting config, no publish step, no CI. Target is GitHub Pages on
**`kupatakipucl.com`** (registered 2026-08-27, repo public). `base: "./"` and
HashRouter are already correct, so no rewrite rules are needed. Three things
will silently break the site if missed:

1. **`kupatakipucl.com` must be added to Firebase Auth's authorized domains** or
   Google sign-in fails outright. Not yet done.
2. `index.html`'s `og:url` and `og:image` still point at
   `https://kupatakipucl.web.app/`, a host that will not be used.
3. The badge and hero assets are served from absolute `/` paths, which is fine
   at a domain root but would break on a project subpath.

### 7. Smaller launch-week fixes
- Mobile create-lobby button does nothing — the dialog lives only in the desktop
  composition and the mobile tree returns before reaching it.
- Lobby management is desktop-only: invites, rename, kick, leave and delete have
  no mobile entry point at all.
- Profile shows raw team slugs (`bayern-munich`) under copy describing a
  free-text field that no longer exists. `TEAM_BY_ID` gives the real name.
- Deleting a lobby leaves its chat messages behind, though the dialog promises
  otherwise.

**Not now**: everything under "By 2026-09-08" and "Later" in PROJECT.md §11.

---

## 4. Constraints Mert has set

- **Do not touch the league prediction submitting screen.** He is replacing that
  interaction and wants to handle it deliberately, separately. This covers
  `TeamRanker` and the `/predictions` flow.
- **The knockout phase is deprioritised** — months away.
- He has given broad autonomy otherwise: make the change, run the tests, commit.
  Reserve questions for decisions only he can make.

---

## 5. Working notes

- **Admin uids are baked into `firestore.rules`** as `isAdmin()`. If Mert ever
  signs in with a different Google account and needs to drive the dev panel or
  flip the phase, that list is what to update.
- **The phase flip on 2026-09-08** is still a hand edit to
  `tournamentState/current`. It is now admin-only, so it must be done as one of
  those three accounts (or via the console / a gcloud-token script).
- **Tests**: `npm test` — 129 files, 1008 tests, all passing at time of writing;
  `tsc -b` clean. Integration needs JDK 21:
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" PATH="$JAVA_HOME/bin:$PATH" npm run test:integration`
  (30 tests across 2 files).
- **`@firebase/rules-unit-testing` is pinned to v3** on purpose — current
  versions peer-depend on firebase 12 and this project is on 10.
- **Reading and writing production directly**: every script in `scripts/` uses
  the Firestore REST API with `gcloud auth print-access-token`. That is
  IAM-authenticated, so it bypasses security rules — which is how the cleanup
  deleted `surveyResponses` without loosening anything.
- **Do not trust code comments about project state.** Many cite documents that
  no longer exist. The *reasoning* is usually still valuable; the claims about
  what exists are not.
- **Turkish** is the language of every user-facing string, permanently.
- **Mert's conventions**: no I-beam cursors ("cursorify"); pages compose from
  `Frame` cells; ruthlessly favour non-busy layouts.
