# HANDOVER

For a fresh session picking this project up cold.

**Read [PROJECT.md](PROJECT.md) first** for what the project is, and
**[DEPLOY.md](DEPLOY.md)** for how it ships. This file only covers where things
stand and what to do next.

Written 2026-08-28, at the end of the deployment session. Branch: `launch-prep`,
pushed. Items 1–7 of the pre-launch list are **done**.

---

## 1. The only thing standing between this and a live site

Two switches, both deliberately left for Mert, because throwing them is what
puts the site on the internet. Full detail in **DEPLOY.md §3**.

1. Merge `launch-prep` into `main`.
2. **Settings → Pages → Source: GitHub Actions.**
3. **Spaceship → kupatakipucl.com → Advanced DNS.** Delete the existing root
   `A` records — they point at Spaceship's parking page — and add:

   | Type | Host | Value |
   |------|------|-------|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `mertgurgenyatagi.github.io` |

   All four A records verified live from this machine — each answers
   `Server: GitHub.com`.
4. Once GitHub stops warning about DNS, tick **Enforce HTTPS**.

Nothing else is required. `public/CNAME`, the workflows, the authorized domains
and the `og:` tags are all in place.

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
| Frontend hosting | **Prepared, not reachable.** See §1 |
| CI | **Green** on GitHub Actions — unit + integration both |
| Tests | 131 files / 1025 unit, 35 integration, `tsc -b` clean |

---

## 3. What this session did

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

- **Do not touch the league prediction submitting screen.** `TeamRanker` and the
  `/predictions` flow. He is replacing that interaction deliberately and
  separately. Untouched this session.
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
