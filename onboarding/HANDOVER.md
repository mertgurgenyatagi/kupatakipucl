# Kupatakip UCL — Handover

**Written:** 2026-07-21, at the boundary between "backend/data plumbing is done" and "frontend design begins." If you're picking this up cold — new session, new agent, whatever — read this whole file before touching anything. It's written to be self-contained; you shouldn't need to re-derive any of this from git archaeology.

---

## 1. What this project is

Kupatakip UCL (`#kupatakipucl`) is a Turkish-language website where ~30-50 participants submit predictions for the UEFA Champions League league-phase rankings (and later the knockout bracket), then get scored against actual results. It's a from-scratch sequel to a prior "#kupatakip" edition — no code reuse, only feature concepts carried over. Mert is both the operator and a participant.

The canonical spec is **`SPEC.md`** at the repo root (32KB, supersedes `BRIEFING.txt`, which is the original braindump chapter and now mostly historical). Read `SPEC.md` for exact rules, copy, and UX-state definitions — this handover summarizes but doesn't replace it.

**Hard real-world dates** (from `SPEC.md`, all real, not placeholders):
- Aug 26, 2026: league-phase teams determined / sign-up cutoff.
- Sept 8, 2026: league phase starts, round-1 submissions close. **Site must be ready by Aug 26.**
- Jan 27, 2027: league phase concludes.
- Feb 26, 2027: RO16 draw, round-2 submissions open.
- Mar 9, 2027: RO16 begins, round-2 submissions close.

**Scoring:** Round 1 — per team, 3 points if `|predicted position − actual position| < 3`. Round 2 (knockout) — 3/4/5/6 points for correctly predicting a team reaches QF/SF/final/is champion.

**Visibility model:** 4 states = tournament (not-started/started) × user (logged-in/not), each seeing a different nav/page set. This is `src/state/visibilityState.ts` + `src/state/pageAccess.ts` — read those directly, they're short and exact.

---

## 2. Tech stack

- **React 18 + TypeScript + Vite**, `HashRouter` (react-router-dom) — hash routing because this will eventually be hosted as a **subfolder** of Mert's existing `mertgurgenyatagi.github.io` GitHub Pages repo (that migration happens **late and deliberately** — don't do it preemptively).
- **Firebase**: Auth (Google sign-in only), Firestore (all app data), Storage (profile photos + forum images). Real project id: **`kupatakipucl`**. `.env.local` holds the real config (gitignored; `.env.example` shows the shape — all `VITE_FIREBASE_*` keys).
- **Vitest + React Testing Library** for all tests. Convention: module-level `vi.mock("firebase/firestore", ...)` per test file, mocking only the functions that file's imports actually use. `act()`-wrap any manually-invoked async/snapshot callback.
- **No CSS framework, no design system, zero `className` usage anywhere in `src/`.** Every screen right now is bare, unstyled, browser-default HTML. This is the literal starting point for frontend work — green field, not a redesign.
- `@dnd-kit/*` is already a dependency (used by `TeamRanker.tsx` for the drag-to-rank prediction UI) — don't reach for a different DnD library.
- One Cloud Function exists: `functions/stopbilling/` — a billing killswitch, unrelated to the main app, already fixed and working (see `functions/stopbilling/README.md` if you ever need to touch it; there's also a `[[project_stopbilling_function]]`-style memory entry in Claude's memory system — see §8).

---

## 3. Build status — what's actually done

SPEC.md §9b defines a 7-unit, section-by-section build order. **6 of 7 are built, tested, reviewed, and merged to `main`.** The 7th was explicitly decided against. Nothing is mid-flight; `main` is in a clean, fully-tested state (231 tests passing, `tsc -b` clean, `npm run build` succeeds) as of this writing.

| Unit | Status | Key files |
|---|---|---|
| 1. Auth + 4-state shell | ✅ merged | `src/auth/`, `src/shell/AppShell.tsx`, `src/state/` |
| 2. Prediction flow (survey + drag-rank) | ✅ merged | `src/predictions/` |
| 3. Leaderboard / team table | ✅ merged | `src/leaderboard/` |
| 4. Chat | ✅ merged | `src/chat/`, `src/pages/ChatPage.tsx` |
| 5. Forum | ✅ merged | `src/forum/`, `src/pages/ForumPage.tsx` |
| 6. Stats | ✅ merged | `src/stats/`, `src/pages/StatsPage.tsx` |
| 7. Results automation | ❌ **explicitly skipped** — Mert's call: "not the best time for it right now." Logged as DECIDED (skipped) in `SPEC.md`, not left open. Don't re-propose building this unless Mert brings it up. | — |

Each unit has a design doc + implementation plan under `docs/superpowers/specs/` and `docs/superpowers/plans/` respectively, dated `2026-07-19`/`2026-07-20`, if you want the original reasoning behind any specific component.

**Team/match data currently in the codebase is REAL, not placeholder:** `src/predictions/teams.ts` has the actual 36-team 2026-27 UCL league-phase list. Results (`results/{teamId}` in Firestore) are manually maintained — no admin UI, no automation (consistent with skipping unit 7).

---

## 4. The dev-panel (built in lieu of unit 7)

Since results automation was skipped but real match dates are still ~2 months out, Mert asked for tooling to simulate tournament state without waiting on the calendar. Built as its own branch (`dev-panel`, 8 commits), reviewed by an independent opus-model agent (came back clean, two low-severity non-blocking notes — see §7), merged to `main`. Two more commits (the `set-dev-config.mjs` script and the login-state override, §6 points 7-8) landed directly on `main` afterward as follow-up polish, not on a separate branch.

**What it is:** a `/dev`-gated route (`src/devpanel/DevPanel.tsx`, mounted in `App.tsx` behind `import.meta.env.DEV` — literally cannot execute in a production build) with three original sections plus one added later:

1. **Tournament Durumu** — force tournament started/not-started/auto. Overrides `useTournamentPhase()`'s real-date computation. `devConfig/state.tournamentActive: boolean | null`.
2. **Giriş Durumu** (added 2026-07-21, see §6) — force logged-in/logged-out/auto, independent of the real Firebase Auth session. `devConfig/state.loggedInOverride: boolean | null`.
3. **Güncel Tarih** — a readout (custom override or auto-derived from the latest decided match's date). **Known gap: this is currently display-only.** Nothing else in the codebase reads a "current date" besides tournament phase, which already has its own separate override above. Wiring this to something would be new scope, not a bug fix — don't "fix" it without Mert asking.
4. **Maçlar** — all 144 real league-phase fixtures (`src/devpanel/fixtures.ts`), grouped by matchday, each with a `notplayed/homewin/draw/awaywin` selector. Sequential-unlock rule: you can't set a real outcome on fixture N until every fixture with a lower `order` (1-144) is already decided; reverting any fixture *back* to `notplayed` is always allowed regardless of what's later. Synthetic scorelines only (homewin=1-0, draw=0-0, awaywin=0-1) — Mert's explicit choice over real historical scores. Standings recompute (`src/devpanel/standings.ts`) and write straight into the real `results/{teamId}` docs on every change.

**Why it writes into the real `profiles`/`predictions`/`results` collections instead of separate `dev`-prefixed ones:** deliberate call, justified only because there are zero real users pre-launch. Revisit this decision if the site ever goes semi-public before dev tooling is torn down.

**Reachability:** `http://localhost:5173/#/dev` (note: `HashRouter`, so it's `/#/dev` not `/dev`). No nav link — intentionally only reachable by typing the URL.

### Remote-controlling the dev panel without a browser

`scripts/set-dev-config.mjs` writes straight to `devConfig/state` via the Firestore REST API, authenticated with `gcloud auth print-access-token` (the currently-active gcloud account, `thisisfootballstuff@gmail.com`, already has project-owner-equivalent access — no service account key needed, no `firebase-admin` dependency). `useDevConfig`'s `onSnapshot` picks changes up **live** — if the site is open in a browser while this runs, it updates with no refresh needed.

```bash
node scripts/set-dev-config.mjs tournament post   # force ST (tournament started)
node scripts/set-dev-config.mjs tournament pre    # force NST (not started)
node scripts/set-dev-config.mjs tournament auto   # clear override, back to real-date/?debugDate= logic
node scripts/set-dev-config.mjs login in          # force signed-in, as dummy-001 (see below)
node scripts/set-dev-config.mjs login out         # force signed-out
node scripts/set-dev-config.mjs login auto        # clear override, back to the real Firebase Auth session
node scripts/set-dev-config.mjs date 2026-11-05   # custom current-date readout (display-only, see gap above)
node scripts/set-dev-config.mjs date auto         # clear override
```

**Important caveat on `login in`:** this fakes what the React tree renders (via `AuthProvider`), it does **not** create a real Firebase Auth session. Firestore security rules still evaluate against whatever the *real* session is underneath. So `login in` is great for viewing all four nav/visibility states quickly, but anything that requires real auth to write (posting to chat, posting to forum, saving a prediction) will still fail with a permissions error unless you're also genuinely signed in in that browser. If you need to test an authenticated write flow, sign in for real; use `login`/`tournament` overrides only for the "what does this look like" viewing case.

There is no remote-control script yet for setting individual match outcomes (only tournament/login/date) — that would need to replicate `useDevMatches.ts`'s sequential-order validation. Not built because it wasn't asked for; straightforward to add the same way if needed (same REST+gcloud-token pattern, POST/PATCH to `devMatches/{fixtureId}` plus a batch of 36 `results/{teamId}` writes computed via `computeStandings`).

### Seeded test data

`scripts/seed-dummy-participants.mjs` — **already run once** against the live project. Created 50 synthetic participants, `dummy-001` through `dummy-050`, each with a real `profiles/{uid}` doc (Turkish first/last name, `https://i.pravatar.cc/150?u={uid}` avatar) and a real `predictions/{uid}` doc (seeded-random-shuffled 36-team ranking). Idempotent — re-running overwrites the same 50 docs via `PATCH`, doesn't duplicate. `dummy-001` specifically is also the fixed uid the `login in` override fakes as signed-in, so it has a "real" profile+prediction to render against instead of hitting the empty-profile create form.

---

## 5. Firestore rules — current state (`firestore.rules`, already deployed)

- `profiles/{uid}`: public read, owner-only write.
- `surveyResponses/{uid}`: owner-only read/create, no update/delete (one-time).
- `predictions/{uid}`: public read, owner-only write.
- `results/{teamId}`: public read. Write is **`if request.auth != null`** — **loosened from `if false` specifically so the dev panel's browser-based writes work.** Commented in the rules file as temporary/pre-launch; intended to be tightened back once real results-automation/admin tooling exists. **Since §7 (results automation) is now explicitly skipped, "once that lands" may never happen** — worth a conscious decision at some point about whether this stays open permanently or gets tightened by some other means (e.g. restrict to a specific admin uid) before the site is ever exposed beyond Mert's own testing.
- `devConfig/{docId}`, `devMatches/{fixtureId}`: both `if request.auth != null` for read and write. New collections, added alongside the dev panel.
- `messages/{messageId}` (chat): logged-in-only read, owner-attributed create, no update/delete ever.
- `forumPosts/{postId}`: public read, owner-attributed create, no update/delete ever.

Deployed via `npx firebase deploy --only firestore:rules` — this worked cleanly last time (no IPv6 flakiness this session, though that has happened before; if it recurs, the fallback is pasting the rules manually into the Firebase console).

`storage.rules` (profile photos, forum images) — unchanged this session, see file directly, straightforward size/type-gated rules.

---

## 6. This session's actual work (2026-07-20 → 2026-07-21)

In order:
1. Replaced the placeholder 36-team list with the real 2026-27 UCL team list, and added the real 144-match league-phase schedule (`src/devpanel/fixtures.ts`), converted to Turkish local time (fixed UTC+3, no DST) from the source's CEST/CET listing (verified the CEST→CET switch lands correctly around real EU DST end, Oct 25 2026).
2. Built the full dev-panel feature (standings engine, `devConfig`/`devMatches` hooks, the `DevPanel` UI, the `/dev` route) — see §4.
3. Loosened/added Firestore rules for the above, deployed them.
4. Seeded 50 dummy participants.
5. Independent whole-branch review (opus agent) — clean, two low-severity notes (current-date is display-only; a minor self-correcting race if you click through outcomes faster than the UI's `refetch()` lands — both judged not worth fixing for a single-user dev tool).
6. Merged `dev-panel` branch to `main`, deleted the branch.
7. **Follow-up, same day:** Mert asked whether I could personally operate the dev panel to make frontend iteration easier. Answer: partially — I can't see anything (no browser tool), but I *can* write directly to the same Firestore docs the panel writes to. Built `scripts/set-dev-config.mjs` for the tournament-phase axis. Mert then asked about the login/logout axis too — added `loggedInOverride` to `devConfig` (same tri-state pattern as `tournamentActive`), wired into `AuthProvider.tsx`, `DevPanel.tsx`, and the script (§4 above has full detail). All tests updated and passing (231 total), `tsc -b` clean.
8. Added the **Playwright MCP server** (`@playwright/mcp`, Microsoft's official browser-automation MCP) at **user scope** (`claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest`) — confirmed `✓ Connected` via `claude mcp list`. This is what actually closes the loop: dev-panel state control + Playwright browser control together mean a fresh session can flip to any visibility state *and* visually inspect the result, without Mert needing to click anything.
9. **Nothing has been pushed to `origin` this entire session.** Everything above is committed to local `main` only. Ask before pushing, per standing git-safety defaults — this hasn't been explicitly pre-authorized.

**If you're a fresh session reading this because Playwright's tools weren't available in a previous session:** that's expected — MCP servers load at session start, not mid-conversation. You should have Playwright's tools now. Recommended first move: run `npm run dev`, then use Playwright to hit `http://localhost:5173/#/dev`, confirm the panel renders and a `tournament`/`login` toggle via `set-dev-config.mjs` actually reflects live in the page (proves the whole loop works end to end) before starting real design work.

---

## 7. Known gaps / things not to "fix" without asking

- **`currentDateOverride` is display-only** (§4, point 3). Not a bug — there's nothing else in the app that consumes a simulated "now" besides tournament phase, which is already covered separately.
- **Stale-outcomes race in `useDevMatches`**: `DevPanel.handleOutcomeChange` doesn't await its own `refetch()` before allowing another edit — a very fast double-edit could compute standings off a stale `outcomes` map. Self-correcting on the next edit. Single-user dev tool, judged not worth the complexity of fixing.
- **The `results` write-rule loosening has no expiry mechanism** — see §5. It's fine for solo pre-launch use; revisit before this is ever shared with real participants.
- **No `manualChunks`/code-splitting** — `npm run build` warns about a 700KB main chunk. Pre-existing, unrelated to this session's work, out of scope unless it becomes an actual problem.
- **`DevPanel` and its 144-fixture data are bundled into the production JS** even though the route never renders in prod (the import in `App.tsx` is static/unconditional, only the `<Route>` itself is gated). Doesn't break anything, just isn't tree-shaken. Fine for now; dynamic `import()` would fix it if bundle size ever actually matters.

---

## 8. Where to find more context

- `SPEC.md` (repo root) — canonical, comprehensive spec. Read this for exact copy/rules/UX-state definitions.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — per-unit design docs and implementation plans, one pair per unit in §3's table.
- Claude's persistent memory system (outside this repo, survives across sessions/machines-for-this-user): `project_kupatakip_ucl.md` has the same project narrative as this handover but written for Claude's own future recall, cross-linked with `feedback_autonomy_gating.md` (Mert's standing delegation of architectural judgment to Claude — the reason units 3-6 and this dev-panel work happened largely without per-step check-ins), `feedback_verification_standards.md` (Mert spot-checks output himself; wants root-cause fixes not patched symptoms), and `reference_gcloud_cli_local.md` (gcloud is installed/authed locally, prefer it over the Cloud Run/Firebase console for anything scriptable).
- Git history on `main` is linear and descriptive — every commit message explains *why*, not just *what*. `git log --oneline` is a legitimate way to reconstruct sequence if this file ever goes stale.

---

## 9. What's next (per this conversation, not yet started)

Frontend visual design. Currently zero styling exists anywhere. No design system, palette, typography, or layout decisions have been made yet — this is the very next open question, not something already decided that this handover is summarizing. Suggested (not yet agreed) first step: a live Playwright smoke-test pass across all four visibility states using the dev-panel overrides, to catch any functional bugs on bare HTML before they get harder to spot under real CSS.
