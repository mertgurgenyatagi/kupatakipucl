# HANDOVER

For a fresh session picking this project up cold.

**Read [PROJECT.md](PROJECT.md) first.** It is the single source of truth for
what this project is: stack, architecture, data model, security rules, Cloud
Functions, testing, deploy, and a full sorted list of known problems. This file
only covers *where things stand right now and what to do next*.

---

## 1. What happened in the session that wrote this (2026-08-27)

The repository had been stripped of all its documentation — `SPEC.md`,
`PAGEMAP_SPEC.md`, `DESIGN-SPEC`, `PROJECT_STATE.md`, the old `HANDOVER.md`, and
the whole `docs/superpowers/` tree were deleted. A blank-slate audit was run
over the entire codebase (204 source files, 127 test files, both Cloud Functions
codebases, all security rules, scripts and tools), deliberately ignoring git
history and any prior context.

That audit produced 55 open questions, which Mert answered across two rounds.
Several of his answers were then checked against the live Firebase/GCP project
and **three turned out to be wrong** — see §3. The result is `PROJECT.md`.

No application code was changed. The only additions were `PROJECT.md`, this
file, and 7 club-badge SVGs Mert dropped into `assets/club_badges/`.

---

## 2. Current state

**The project has never launched.** Mert intends to go live imminently, into the
`notstarted` phase only, staying there until the league phase begins
**2026-09-08**. Sign-up and league predictions both close at that moment.

- Frontend is **not deployed anywhere**. Target is GitHub Pages on
  **`kupatakipucl.com`** (domain registered 2026-08-27, repo is public).
- Leaderboard Cloud Functions **are** deployed and active in `europe-west8`.
- `stopbilling` Cloud Run service is deployed.
- `tournamentState` is empty, so the live app correctly defaults to
  `notstarted`.
- The production database is **full of development seed data** — see §3.

Mert is the sole developer. He has stated plainly that the project has outgrown
his skill level and that he wants as much of the work taken off him as possible.
Act accordingly: prefer doing the work over asking whether to do it, and reserve
questions for decisions only he can make.

---

## 3. Facts verified against production, not inferred from code

These were checked directly with the `gcloud`/Firestore REST API on 2026-08-27
and **contradict both the code comments and Mert's own recollection**. Do not
re-derive them from source.

1. **The production database is not clean.** `profiles` and `publicProfiles`
   each hold 53 docs, of which **50 are seeded dummies** (`dummy-001` …
   `dummy-050`); only 3 are real accounts. Also present: 52 `predictions`, 54
   `surveyResponses`, 36 synthetic `results`, 16 decided `devMatches` (all of
   Matchday 1), a `leaderboardCache` with 52 entries computed 2026-08-07, 11
   `forumPosts`, 18 `messages`, 1 `knockoutPredictions`, 1 `devConfig`. Home
   reads `profiles`/`publicProfiles` directly, so a real visitor today would see
   53 participants, 50 of them fictional.

2. **The leaderboard functions are deployed.** Mert believed they were not. All
   three (`recomputeLeaderboardOnPrediction`, `recomputeLeaderboardOnResult`,
   `recomputeLeaderboardSafetyNet`) are `ACTIVE` in `europe-west8` as of
   2026-08-07. The safety net runs every 5 minutes and has been billing since.

3. **The team-list swap has not happened.** Mert said he'd done it. He had not:
   `src/predictions/teams.ts` was last modified 2026-07-23 and still holds the
   2025-26 field. He added 7 badge SVGs to `assets/club_badges/`, but
   `public/club-badges/` still has 29 files and `clubBadgeSlugs.ts` is
   unchanged — `scripts/import-club-badges.mjs` has not been run.

**Credentials**: `gcloud` and `firebase` CLIs are authenticated on this machine
as `thisisfootballstuff@gmail.com`. Production Firestore can be read and written
directly via the REST API using `gcloud auth print-access-token` — this is the
pattern every script in `scripts/` already uses. Prefer the CLI over the console.

---

## 4. Immediate task list

This is `PROJECT.md` §11's "before launch" table, ordered so that earlier items
unblock later ones. Mert's disposition on each is recorded there.

1. **Clean the production database.** Remove the 50 dummy participants and their
   predictions and surveys, the synthetic `results`, the decided `devMatches`,
   the stale `leaderboardCache`, and test forum/chat content. Nothing else
   matters if launch shows 50 fake people. Note `surveyResponses` currently
   forbids delete in the rules — the Admin SDK bypasses rules, so do it
   server-side rather than loosening them.

2. **Swap the team list and import the real crests.** Must land before anyone
   signs up: a prediction stores 36 team-id strings, and `computeScore` silently
   skips ids with no matching result, so rankings made against the old list
   would score as zero rather than error. Run
   `scripts/import-club-badges.mjs` after adding the 7 new badges to its MAP,
   then update `teams.ts`. **Confirm the 7 inferred teams with Mert first** —
   see §5.

3. **Fix the signup lockout.** `SignupFlow` writes the survey with a plain
   `setDoc`, but `firestore.rules` sets `allow update, delete: if false` on
   `surveyResponses`, and `ProfileGate` always restarts the flow from step 0.
   Anyone who abandons signup after the final quiz step is permanently locked
   out of the whole app. Fix in the rules or make the write idempotent.

4. **Tighten security rules.** `results`, `tournamentState`, `devConfig` and
   `devMatches` are all writable by any signed-in user — a participant could
   rewrite the standings or push the site into a phase that is not ready. Also:
   other people's `predictions` are world-readable, and Mert wants them hidden
   until the league phase starts. Careful — some production popups still *read*
   `devMatches`, so it cannot simply be closed without checking what breaks.

5. **Hide the knockout entry point** until `preknockout`. `/knockout-predictions`
   is currently allowed in every logged-in phase and has no already-submitted
   redirect, so brackets can be submitted against fake pairings. It is not
   linked from the nav, so this is URL-only exposure.

6. **Set up deployment.** No hosting config and no publish step exist.
   `base: "./"` and HashRouter are already correct for GitHub Pages, so no
   rewrite rules are needed. Two things will silently break sign-in if missed:
   **`kupatakipucl.com` must be added to Firebase Auth's authorized domains**,
   and `index.html`'s `og:url`/`og:image` still point at
   `https://kupatakipucl.web.app/`.

7. **Smaller launch-week fixes**: mobile create-lobby button does nothing;
   lobby management has no mobile entry point at all; the profile page shows raw
   team slugs (`bayern-munich`) under copy describing a deleted free-text field;
   deleting a lobby leaves its chat messages behind despite the dialog promising
   otherwise.

**Not now**: everything under "By 2026-09-08" and "Later" in `PROJECT.md` §11.
The knockout phase in particular is months away and Mert has explicitly
deprioritised it.

---

## 5. Things to confirm with Mert before acting

- **The 7 remaining teams.** He supplied 29 confirmed by league position. The
  other 7 are *inferred* from badge files he added — AEK Athens, Fenerbahçe,
  Bodø/Glimt, LASK, Sabah FK, Slovan Bratislava, Viking FK. Plausible, and they
  complete the 36 exactly, but unconfirmed. Do not edit `teams.ts` on this
  inference alone.
- **The prediction ranker is being replaced.** He flagged that the 36-team
  drag-and-drop interaction will change. Do not invest in polishing it until the
  replacement is decided.

---

## 6. Working notes

- **Do not trust code comments about project state.** Roughly 38 files cite
  documents that no longer exist (`SPEC.md`, `PAGEMAP_SPEC.md`,
  `PROJECT_STATE.md`, `docs/superpowers/…`) and several describe components that
  were deleted (`SurveyForm.tsx`, `devpanel/StatsPageTuner.tsx`,
  `TeamPopupTuner.tsx`). The *reasoning* in those comments is usually still
  valuable and worth preserving; the *claims about what exists* are not.
- **Tests**: `npm test` (127 test files). `node_modules` was not installed when
  this was written, so the suite was not run — install before claiming anything
  passes. Integration tests need JDK 21:
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" PATH="$JAVA_HOME/bin:$PATH" npm run test:integration`
- **The tests are frequently the clearest statement of intended behaviour** —
  use them as a second source of truth wherever the implementation is ambiguous.
- **Turkish** is the language of every user-facing string, permanently.
- **Mert's conventions**: no I-beam cursors anywhere ("cursorify"); pages
  compose from `Frame` cells; ruthlessly favour non-busy layouts.

---

## 7. Git operations performed in this session

Working tree at the time: `memory-reset` was level with `main` (no commits
ahead), with the documentation deletions and the new badge SVGs uncommitted.

```
# 1. Commit the audit output and the pending working-tree changes
git add -A
git commit          # "docs: blank-slate audit — PROJECT.md and HANDOVER.md"

# 2. Push the working branch
git push origin memory-reset

# 3. Fast-forward main and publish it
git checkout main
git merge memory-reset
git push origin main

# 4. Branch for the pre-launch work
git checkout -b launch-prep
git push -u origin launch-prep
```

That commit also records the deletion of the old documentation tree
(`HANDOVER.md`, `PROJECT_STATE.md`, `docs/superpowers/**`), which had already
been removed from the working tree before this session began.

**The active branch for the next session is `launch-prep`, cut from `main`.**
Work the §4 list there.
