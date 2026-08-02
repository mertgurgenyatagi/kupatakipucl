# Great Leap: Bracket Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full knockout-bracket feature on top of Plan 1's data layer: the one-time 15-matchup submission flow, bracket scoring folded into the existing combined `points` total, the compact Home widget, and the read-only Profile view — everything a participant needs to predict and see the knockout bracket, except wiring the widget/CTA into `HomePage.tsx` itself (Plan 3's job).

**Architecture:** Mirrors the existing league-prediction feature end-to-end: a `PageKey`-gated one-time submission page (`BracketPage.tsx`, same `intro → rank → done` flow as `PredictionsPage.tsx`), pure scoring math duplicated by hand into `functions/leaderboard/index.js` (same convention as `scoring.ts`), and two independent display surfaces (a standalone Home widget + CTA banner, and a block inside `ProfilePage.tsx`) that both read the same `useBracketState`/`useBracketPrediction`/`useLeaderboard` hooks Plan 1 and the existing leaderboard feature already provide. Bracket scoring is computed as a flat per-matchup comparison against `bracketState.winners`, not by walking `stageReached`/`teamsInMatchup` chains — the submission UI's cascade-clearing interaction (Task 5) guarantees `BracketPrediction.picks` is always internally self-consistent, so a flat comparison alone reproduces the spec's stacking behavior for free.

**Tech Stack:** React 18.3 + TypeScript 5.5 (strict), react-router-dom v6 `HashRouter` (`Navigate` for gating), Tailwind v4, shadcn `base-nova`/`@base-ui/react` (`Avatar`/`AvatarImage`/`AvatarFallback`), `motion` (`sharpVariants` from `src/signup/transitions.ts`, `--ease-cotton` CSS var), Firebase v10 client SDK, Vitest 2 + `@testing-library/react`, plain Node.js CommonJS + `firebase-admin` for `functions/leaderboard`.

## Global Constraints

- No admin UI of any kind (GREAT_LEAP_SPEC.md §1.2) — bracket data stays hand-edited via Plan 1's `bracketState/current` doc; this plan adds no admin surface.
- Do not tighten the existing temporary `allow write: if request.auth != null` rules on `results/{teamId}` or `tournamentState/{docId}` (§1.2) — untouched by this plan.
- No real results-data integration, no Stats redesign, no security/optimization pass, no automatic calendar-driven phase timer, no hosting/mobile work, no real crests — all out of scope (§1.2). `TeamCrest.tsx` (placeholder crests) is reused as-is.
- Real UEFA play-off round is explicitly not modeled — bracket is RO16 → QF → SF → Final only, no legs/aggregate/penalties, single tie-winner-only pick per matchup (§5.1).
- Bracket submission is one-time only, whole 15-matchup tree filled at once (§5.2) — enforced both by Plan 1's `firestore.rules` (`allow update, delete: if false` on `bracketPredictions/{uid}`) and by this plan's `BracketPage.tsx` gating (already-submitted users are redirected away, same two-tier pattern as `PredictionsPage.tsx`).
- Bracket scoring table is fixed: QF=3, SF=4, Final=5, Champion=6, stacking (§5.3) — see Task 2's `BRACKET_POINTS` note for why the *implementation* keys this one round earlier than the spec's stage names (a team reaches a stage by winning the match immediately before it).
- One combined number (league + bracket) shown everywhere — no separate bracket-only leaderboard (§6). Targets the existing `LeaderboardEntry.points` field.
- A participant with only a bracket submission or only a league submission must not crash scoring/ranking (§7.3).
- Every new logic file (hooks, derivation helpers, scoring functions) gets its own co-located `.test.ts`/`.test.tsx` file, matching this repo's one-test-file-per-source-file convention. Pure type-only files do not get a test file.
- `functions/leaderboard` is plain CommonJS JS, not TypeScript — mirror changes there use `require`/`module.exports`, matching Plan 1's Task 7/8 additions.
- Do not modify `src/pages/HomePage.tsx` in this plan — `BracketCtaBanner.tsx` and `BracketWidget.tsx` are built standalone for Plan 3 to wire in.

---

## File Structure

**New files:**
- `src/leaderboard/bracketScoring.ts` — `BRACKET_POINTS` table + `computeBracketScore`, pure.
- `src/leaderboard/bracketScoring.test.ts`
- `src/bracket/bracketIntroCopy.ts` — intro-beat copy for the submission flow, mirrors `predictionIntroCopy.ts`'s shape.
- `src/bracket/bracketSubmission.ts` — client-side pick/cascade derivation helpers for the in-progress submission UI.
- `src/bracket/bracketSubmission.test.ts`
- `src/bracket/BracketBoard.tsx` — the two-column converging click UI.
- `src/bracket/BracketBoard.test.tsx`
- `src/pages/BracketPage.tsx` — the gated one-time submission page (`intro → rank → done`).
- `src/pages/BracketPage.test.tsx`
- `src/bracket/BracketCtaBanner.tsx` — standalone Home CTA banner (link-pill only, no countdown).
- `src/bracket/BracketCtaBanner.test.tsx`
- `src/bracket/BracketWidget.tsx` — standalone compact Home bracket-tree widget.
- `src/bracket/BracketWidget.test.tsx`
- `src/bracket/BracketProfileView.tsx` — read-only bracket view with group-consensus annotation, for `ProfilePage.tsx`.
- `src/bracket/BracketProfileView.test.tsx`
- `src/bracket/bracketConsensus.ts` — `computeBracketConsensus`, pure, analogous to `computeAveragePositions`.
- `src/bracket/bracketConsensus.test.ts`
- `src/bracket/useAllBracketPredictions.ts` — one-time fetch of every submitted bracket prediction, for `BracketProfileView`'s consensus annotation. `src/leaderboard/useLeaderboard.ts`'s `leaderboardCache/current` entries only carry each participant's league `ranking`, never their bracket `picks` (confirmed: Task 3's `buildLeaderboardEntries` never puts `picks` on an entry), so there is no existing data source this can piggyback on — it needs its own one-time collection read, modeled on the confirmed `getDocs(collection(db, "results"))` pattern in `src/leaderboard/useResults.ts`.
- `src/bracket/useAllBracketPredictions.test.ts`

**Modified files:**
- `src/state/pageAccess.ts` — add `"bracket"` to `PageKey`, add `PAGE_ACCESS.bracket`.
- `src/state/pageAccess.test.ts` — add coverage for the new `"bracket"` page key.
- `src/leaderboard/scoring.ts` — no change (bracket scoring lives in the new `bracketScoring.ts` to keep league and bracket math independently testable, per the file-structure "one clear responsibility" rule).
- `functions/leaderboard/index.js` — add `BRACKET_POINTS` + `computeBracketScore` (mirrors `bracketScoring.ts`), extend `recomputeLeaderboard()` to fetch `bracketPredictions`/`bracketState` and fold bracket points into each entry's combined `points`, add a new `recomputeLeaderboardOnBracketPrediction` trigger on `bracketPredictions/{uid}` (mirrors the existing `recomputeLeaderboardOnResult`/`recomputeLeaderboardOnPrediction` pattern).
- `functions/leaderboard/index.test.js` — add coverage for `computeBracketScore` and the combined-points folding logic.
- `src/App.tsx:24` — register the `/bracket` route alongside `/predictions`.
- `src/pages/ProfilePage.tsx:427` — insert a new "Eleme Turu Tahmininiz" block (mirrors the existing "Lig Tahmininiz" `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` block) below `MAIN_ROW`'s closing tags, before the `ParticipantPopup`/`TeamPopup` calls.

---

### Task 1: `PageKey` bracket gate

**Files:**
- Modify: `src/state/pageAccess.ts`
- Modify: `src/state/pageAccess.test.ts`

**Interfaces:**
- Consumes: `VisibilityState`, `getVisibilityState` from `./visibilityState`; `TournamentPhase`, `STARTED_PHASES` from `../tournament/tournamentPhase` (all already imported in this file).
- Produces: `PageKey` now includes `"bracket"`. `isPageAllowed("bracket", state)` returns `true` for every `loggedin_*` state (`loggedin_notstarted`, `loggedin_leaguephase`, `loggedin_preknockout`, `loggedin_knockout`) and `false` for every `loggedout_*` state. Task 6 (`BracketPage.tsx`) uses `isPageAllowed("bracket", ...)` for its outer gate, then layers the tighter `preknockout`-only + not-already-submitted check inside the page itself (mirroring how `PredictionsPage.tsx` layers its own additional checks on top of the coarser `PAGE_ACCESS` gate).

- [ ] **Step 1: Write the failing test**

Add this new `describe` block to the end of `src/state/pageAccess.test.ts` (before the final closing nothing — the file currently ends with the `profile` block's closing `});` at line 55):

```ts
describe("isPageAllowed for bracket", () => {
  it("allows bracket for every logged-in state, in every phase", () => {
    for (const state of [
      "loggedin_notstarted",
      "loggedin_leaguephase",
      "loggedin_preknockout",
      "loggedin_knockout",
    ] as const) {
      expect(isPageAllowed("bracket", state)).toBe(true);
    }
  });

  it("blocks bracket for every logged-out state", () => {
    for (const state of [
      "loggedout_notstarted",
      "loggedout_leaguephase",
      "loggedout_preknockout",
      "loggedout_knockout",
    ] as const) {
      expect(isPageAllowed("bracket", state)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pageAccess`
Expected: FAIL with a TypeScript error / runtime error — `"bracket"` is not assignable to `PageKey`, or `PAGE_ACCESS.bracket` is `undefined` and `.includes` throws.

- [ ] **Step 3: Write the minimal implementation**

In `src/state/pageAccess.ts`, change line 4:

```ts
export type PageKey = "predictions" | "leaderboard" | "forum" | "stats" | "profile" | "bracket";
```

And add a new entry to `PAGE_ACCESS` (after `profile:` on line 20):

```ts
const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: statesFor(ALL_PHASES, [true]),
  leaderboard: statesFor(STARTED_PHASES, [true, false]),
  forum: statesFor(ALL_PHASES, [true]),
  stats: statesFor(STARTED_PHASES, [true]),
  profile: statesFor(ALL_PHASES, [true]),
  bracket: statesFor(ALL_PHASES, [true]),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pageAccess`
Expected: PASS, all tests green including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/state/pageAccess.ts src/state/pageAccess.test.ts
git commit -m "feat: add bracket page-access gate"
```

---

### Task 2: Bracket scoring

**Files:**
- Create: `src/leaderboard/bracketScoring.ts`
- Test: `src/leaderboard/bracketScoring.test.ts`

**Interfaces:**
- Consumes: `MatchupId`, `Round`, `BRACKET_MATCHUPS` from `../bracket/bracketStructure` (Plan 1 Task 1); `BracketState` from `../bracket/bracketState` (Plan 1 Task 2).
- Produces: `BRACKET_POINTS: Record<Round, number>` = `{ro16: 3, qf: 4, sf: 5, final: 6}`, `computeBracketScore(picks: Record<MatchupId, string> | undefined, bracketState: BracketState): number`. **Important:** `BRACKET_POINTS` is keyed one round *earlier* than GREAT_LEAP_SPEC.md §5.3's stage-reached table (QF=3/SF=4/Final=5/Champion=6) — a team "reaches" a stage by *winning the match immediately before it* (winning an RO16 matchup is what gets a team into the QF, winning a QF matchup gets it into the SF, etc.), so a correct RO16-matchup pick is what earns the spec's "3 points for reaching QF", a correct QF-matchup pick earns the "4 points for reaching SF", and so on. Winning the Final matchup itself is simultaneously "reached Champion", so there is no separate champion-bonus constant or branch — `BRACKET_POINTS.final` (6) covers it directly via the same flat per-matchup loop. Task 3 (`functions/leaderboard/index.js`) mirrors this by hand. Task 7's `BracketProfileView.tsx` does not consume this (it uses `bracketConsensus.ts` instead) — this is purely the points calculator used by the leaderboard.

- [ ] **Step 1: Write the failing test**

```ts
// src/leaderboard/bracketScoring.test.ts
import { describe, it, expect } from "vitest";
import { computeBracketScore, BRACKET_POINTS } from "./bracketScoring";
import { BracketState } from "../bracket/bracketState";

describe("BRACKET_POINTS", () => {
  it("is keyed one round earlier than the spec's stage-reached table, since winning a matchup of round R is what makes a team reach the next stage", () => {
    // GREAT_LEAP_SPEC.md §5.3: reaching QF=3pts is earned by a correct RO16
    // pick, reaching SF=4pts by a correct QF pick, reaching Final=5pts by a
    // correct SF pick, and Champion=6pts by a correct Final pick.
    expect(BRACKET_POINTS.ro16).toBe(3);
    expect(BRACKET_POINTS.qf).toBe(4);
    expect(BRACKET_POINTS.sf).toBe(5);
    expect(BRACKET_POINTS.final).toBe(6);
  });
});

describe("computeBracketScore", () => {
  it("returns 0 when picks is undefined (no submission)", () => {
    const state: BracketState = { ro16Teams: {}, winners: {} };
    expect(computeBracketScore(undefined, state)).toBe(0);
  });

  it("returns 0 when no real winners are decided yet", () => {
    const picks = { "ro16-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: {} };
    expect(computeBracketScore(picks as any, state)).toBe(0);
  });

  it("awards 3 points for a correctly predicted RO16 winner (team reaches QF)", () => {
    const picks = { "ro16-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(3);
  });

  it("awards 0 for an incorrect RO16 pick", () => {
    const picks = { "ro16-1": "Napoli" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(0);
  });

  it("awards 4 points for a correctly predicted QF winner (team reaches SF)", () => {
    const picks = { "qf-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "qf-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(4);
  });

  it("stacks points across correctly-picked rounds for the same team (RO16 + QF = 7)", () => {
    const picks = { "ro16-1": "Arsenal", "qf-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal" },
    };
    expect(computeBracketScore(picks as any, state)).toBe(3 + 4);
  });

  it("awards the full 18 points for a team correctly predicted to win it all (RO16+QF+SF+Final)", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "qf-1": "Arsenal",
      "sf-1": "Arsenal",
      final: "Arsenal",
    } as Record<string, string>;
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" },
    };
    expect(computeBracketScore(picks as any, state)).toBe(3 + 4 + 5 + 6);
  });

  it("awards 6 points for a correctly predicted Final winner (Champion)", () => {
    const picks = { final: "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { final: "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(6);
  });

  it("stops awarding once a team's predicted run diverges from reality, even if earlier rounds were right (RO16+QF correct, SF wrong = 7)", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "qf-1": "Arsenal",
      "sf-1": "Arsenal",
    } as Record<string, string>;
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Bayern" },
    };
    expect(computeBracketScore(picks as any, state)).toBe(3 + 4);
  });

  it("ignores matchups the user didn't pick", () => {
    const picks = { "qf-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bracketScoring`
Expected: FAIL with "Cannot find module './bracketScoring'".

- [ ] **Step 3: Write the implementation**

```ts
// src/leaderboard/bracketScoring.ts
import { MatchupId, Round, BRACKET_MATCHUPS } from "../bracket/bracketStructure";
import { BracketState } from "../bracket/bracketState";

// GREAT_LEAP_SPEC.md §5.3 lists points by the STAGE a team reaches (QF=3,
// SF=4, Final=5, Champion=6). A team "reaches" a stage by WINNING the match
// immediately before it — winning an RO16 matchup is what gets a team into
// the QF, winning a QF matchup gets it into the SF, and so on. So this table
// is intentionally keyed one round earlier than the spec's stage names:
// a correct RO16-matchup pick earns the "reached QF" points, a correct
// QF-matchup pick earns the "reached SF" points, etc. Winning the Final
// matchup itself is simultaneously "reached Champion" — there is no
// separate champion-bonus step, BRACKET_POINTS.final covers it directly.
export const BRACKET_POINTS: Record<Round, number> = {
  ro16: 3,
  qf: 4,
  sf: 5,
  final: 6,
};

/**
 * Flat per-matchup comparison against the real winners, not a
 * stageReached()-style chain walk: the submission UI (bracketSubmission.ts)
 * guarantees `picks` is always internally self-consistent (picking a team
 * cascades to clear any now-invalid downstream picks), so comparing each
 * matchup in isolation already reproduces the spec's stacking behavior.
 */
export function computeBracketScore(
  picks: Record<MatchupId, string> | undefined,
  bracketState: BracketState
): number {
  if (!picks) return 0;

  let total = 0;
  for (const matchup of BRACKET_MATCHUPS) {
    const pickedTeam = picks[matchup.id];
    const actualWinner = bracketState.winners[matchup.id];
    if (!pickedTeam || !actualWinner || pickedTeam !== actualWinner) continue;
    total += BRACKET_POINTS[matchup.round];
  }

  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bracketScoring`
Expected: PASS, all 11 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/bracketScoring.ts src/leaderboard/bracketScoring.test.ts
git commit -m "feat: add bracket scoring with QF/SF/Final/champion stacking"
```

---

### Task 3: Mirror bracket scoring into `functions/leaderboard` and fold into combined points

**Files:**
- Modify: `functions/leaderboard/index.js`
- Modify: `functions/leaderboard/index.test.js`

**Interfaces:**
- Consumes: nothing new from other tasks (this is the server-side hand-duplication of Task 2's `bracketScoring.ts`, matching this repo's existing `scoring.ts`/`index.js` duplication convention). Reads Plan 1's `bracketPredictions/{uid}` and `bracketState/current` collections directly via the Admin SDK.
- Produces: `BRACKET_POINTS`, `computeBracketScore(picks, bracketState)` (same signature/behavior as Task 2, plain-JS — see Task 2's note on why `BRACKET_POINTS` is keyed one round earlier than GREAT_LEAP_SPEC.md §5.3's stage-reached table), exported. `recomputeLeaderboard()` now folds `computeBracketScore(...)` into each entry's `points`, and a new `recomputeLeaderboardOnBracketPrediction` Cloud Function trigger fires on `bracketPredictions/{uid}` writes. Per §7.3, a participant with only a bracket prediction (no league `predictions` doc) or only a league prediction (no bracket submission) must appear in the leaderboard with a correct combined score, not crash the pass.

- [ ] **Step 1: Write the failing test**

Append to `functions/leaderboard/index.test.js` (after the existing `rankSnapshotDocId` describe block):

```js
describe("computeBracketScore", () => {
  it("returns 0 when there is no bracket submission", () => {
    expect(computeBracketScore(undefined, { ro16Teams: {}, winners: {} })).toBe(0);
  });

  it("stacks RO16+QF+SF+Final for a fully correct bracket run", () => {
    const picks = { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" };
    const bracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" },
    };
    expect(computeBracketScore(picks, bracketState)).toBe(3 + 4 + 5 + 6);
  });

  it("awards 0 for an incorrect pick", () => {
    const picks = { "ro16-1": "Napoli" };
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(computeBracketScore(picks, bracketState)).toBe(0);
  });
});

describe("recomputeLeaderboard combined scoring (via buildLeaderboardEntries)", () => {
  it("gives a participant with only a bracket prediction their bracket points and 0 league points", () => {
    const profilesById = new Map([["uid1", { firstName: "A", lastName: "B", photoURL: "" }]]);
    const predictionsById = new Map();
    const bracketPredictionsById = new Map([["uid1", { picks: { "ro16-1": "Arsenal" }, submittedAt: 1 }]]);
    const results = {};
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries).toEqual([
      {
        uid: "uid1",
        firstName: "A",
        lastName: "B",
        photoURL: "",
        points: 3,
        ranking: undefined,
        submittedAt: undefined,
      },
    ]);
  });

  it("gives a participant with only a league prediction their league points and 0 bracket points", () => {
    const profilesById = new Map([["uid1", { firstName: "A", lastName: "B", photoURL: "" }]]);
    const predictionsById = new Map([["uid1", { ranking: ["a"], submittedAt: 1 }]]);
    const bracketPredictionsById = new Map();
    const results = { a: { position: 1 } };
    const bracketState = { ro16Teams: {}, winners: {} };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries).toEqual([
      {
        uid: "uid1",
        firstName: "A",
        lastName: "B",
        photoURL: "",
        points: 3,
        ranking: ["a"],
        submittedAt: 1,
      },
    ]);
  });

  it("combines league and bracket points for a participant with both", () => {
    const profilesById = new Map([["uid1", { firstName: "A", lastName: "B", photoURL: "" }]]);
    const predictionsById = new Map([["uid1", { ranking: ["a"], submittedAt: 1 }]]);
    const bracketPredictionsById = new Map([["uid1", { picks: { "ro16-1": "Arsenal" }, submittedAt: 2 }]]);
    const results = { a: { position: 1 } };
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries[0].points).toBe(3 + 3);
  });

  it("skips a uid with no profile even if they have a bracket prediction", () => {
    const profilesById = new Map();
    const predictionsById = new Map();
    const bracketPredictionsById = new Map([["uid1", { picks: { "ro16-1": "Arsenal" }, submittedAt: 1 }]]);
    const results = {};
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries).toEqual([]);
  });
});
```

Add `computeBracketScore` and `buildLeaderboardEntries` to the `require` line at the top of the test file:

```js
const {
  isPickCorrect,
  computeScore,
  assignRanks,
  buildRankSnapshotEntries,
  rankSnapshotDocId,
  computeBracketScore,
  buildLeaderboardEntries,
} = require("./index");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions/leaderboard && npm test`
Expected: FAIL — `computeBracketScore` and `buildLeaderboardEntries` are undefined.

- [ ] **Step 3: Add `BRACKET_POINTS`/`computeBracketScore` and extract `buildLeaderboardEntries`**

In `functions/leaderboard/index.js`, add the bracket scoring constants and function immediately after the existing `computeScore` function (right before the `assignRanks` function added by Plan 1 Task 7):

```js
// Mirrors src/leaderboard/bracketScoring.ts exactly (GREAT_LEAP_SPEC.md
// §5.3). The spec's table lists points by the STAGE a team reaches (QF=3,
// SF=4, Final=5, Champion=6) — a team reaches a stage by WINNING the match
// immediately before it, so this table is keyed one round earlier than the
// spec's stage names: a correct RO16 pick earns "reached QF" points, a
// correct QF pick earns "reached SF" points, and so on. Winning the Final
// matchup itself is simultaneously "reached Champion", so there is no
// separate champion-bonus step.
const BRACKET_POINTS = { ro16: 3, qf: 4, sf: 5, final: 6 };

const BRACKET_MATCHUP_ROUNDS = {
  "ro16-1": "ro16", "ro16-2": "ro16", "ro16-3": "ro16", "ro16-4": "ro16",
  "ro16-5": "ro16", "ro16-6": "ro16", "ro16-7": "ro16", "ro16-8": "ro16",
  "qf-1": "qf", "qf-2": "qf", "qf-3": "qf", "qf-4": "qf",
  "sf-1": "sf", "sf-2": "sf",
  final: "final",
};

function computeBracketScore(picks, bracketState) {
  if (!picks) return 0;

  let total = 0;
  for (const matchupId of Object.keys(BRACKET_MATCHUP_ROUNDS)) {
    const pickedTeam = picks[matchupId];
    const actualWinner = bracketState.winners[matchupId];
    if (!pickedTeam || !actualWinner || pickedTeam !== actualWinner) continue;
    total += BRACKET_POINTS[BRACKET_MATCHUP_ROUNDS[matchupId]];
  }

  return total;
}
```

Now extract entry-building into a standalone `buildLeaderboardEntries` function, placed immediately before `recomputeLeaderboard`. This is a pure refactor of the loop body that already exists inside `recomputeLeaderboard` (confirmed at `functions/leaderboard/index.js:40-71` per Plan 1 Task 8's final version), extended to also fold in bracket points and to include bracket-only participants:

```js
// Extracted from recomputeLeaderboard so the combined-scoring logic (§6,
// §7.3) is independently testable without the Admin SDK. Iterates the union
// of predictionsById and bracketPredictionsById keys so a participant with
// only one of the two submissions still gets a correct combined entry.
function buildLeaderboardEntries({
  profilesById,
  predictionsById,
  bracketPredictionsById,
  results,
  bracketState,
}) {
  const uids = new Set([...predictionsById.keys(), ...bracketPredictionsById.keys()]);
  const entries = [];

  for (const uid of uids) {
    const profile = profilesById.get(uid);
    if (!profile) continue;

    const prediction = predictionsById.get(uid);
    const bracketPrediction = bracketPredictionsById.get(uid);

    const leaguePoints = prediction ? computeScore(prediction.ranking, results) : 0;
    const bracketPoints = computeBracketScore(bracketPrediction ? bracketPrediction.picks : undefined, bracketState);

    entries.push({
      uid,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoURL: profile.photoURL,
      points: leaguePoints + bracketPoints,
      ranking: prediction ? prediction.ranking : undefined,
      submittedAt: prediction ? prediction.submittedAt : undefined,
    });
  }

  return entries;
}
```

- [ ] **Step 4: Rewrite `recomputeLeaderboard` to use `buildLeaderboardEntries` and fetch bracket collections**

Replace the whole `recomputeLeaderboard` function (the version left by Plan 1 Task 8, which fetches `predictions`/`profiles`/`results`/`tournamentState`) with:

```js
async function recomputeLeaderboard() {
  const [predictionsSnap, profilesSnap, resultsSnap, tournamentStateSnap, bracketPredictionsSnap, bracketStateSnap] =
    await Promise.all([
      db.collection("predictions").get(),
      db.collection("profiles").get(),
      db.collection("results").get(),
      db.doc("tournamentState/current").get(),
      db.collection("bracketPredictions").get(),
      db.doc("bracketState/current").get(),
    ]);

  const profilesById = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const predictionsById = new Map(predictionsSnap.docs.map((doc) => [doc.id, doc.data()]));
  const bracketPredictionsById = new Map(bracketPredictionsSnap.docs.map((doc) => [doc.id, doc.data()]));

  const results = {};
  resultsSnap.docs.forEach((doc) => {
    results[doc.id] = doc.data();
  });

  const bracketState = bracketStateSnap.exists
    ? bracketStateSnap.data()
    : { ro16Teams: {}, winners: {} };

  const entries = buildLeaderboardEntries({
    profilesById,
    predictionsById,
    bracketPredictionsById,
    results,
    bracketState,
  });
  entries.sort((a, b) => b.points - a.points);

  await db.doc("leaderboardCache/current").set({ entries, computedAt: Date.now() });

  const currentMatchday = tournamentStateSnap.exists ? tournamentStateSnap.data().currentMatchday : undefined;
  const snapshotDocId = rankSnapshotDocId(currentMatchday);
  if (snapshotDocId) {
    await db.doc(`rankSnapshots/${snapshotDocId}`).set({
      matchday: currentMatchday,
      entries: buildRankSnapshotEntries(entries),
      computedAt: Date.now(),
    });
  }
}
```

- [ ] **Step 5: Add the `bracketPredictions` trigger**

The existing file (`functions/leaderboard/index.js:1-79`, current baseline before this plan's changes) imports `onDocumentWritten` from `firebase-functions/v2/firestore` at the top and uses it for both existing triggers — `exports.recomputeLeaderboardOnPrediction = onDocumentWritten("predictions/{uid}", async () => {...})` and `exports.recomputeLeaderboardOnResult = onDocumentWritten("results/{teamId}", async () => {...})`. Add a new trigger immediately after `recomputeLeaderboardOnResult`, using the exact same v2-style construction (this codebase does not use the `functions.firestore.document(...).onWrite(...)` v1 API anywhere):

```js
exports.recomputeLeaderboardOnBracketPrediction = onDocumentWritten("bracketPredictions/{uid}", async () => {
  await recomputeLeaderboard();
});
```

- [ ] **Step 6: Export the new pure functions**

At the end of the file, add to the existing `exports.*` block:

```js
exports.computeBracketScore = computeBracketScore;
exports.buildLeaderboardEntries = buildLeaderboardEntries;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd functions/leaderboard && npm test`
Expected: PASS, all tests green (13 from Plan 1 + 7 new).

- [ ] **Step 8: Commit**

```bash
git add functions/leaderboard/index.js functions/leaderboard/index.test.js
git commit -m "feat: fold bracket scoring into combined leaderboard points"
```

---

### Task 4: Bracket intro copy

**Files:**
- Create: `src/bracket/bracketIntroCopy.ts`

**Interfaces:**
- Consumes: `PredictionIntroBeat` type from `../predictions/predictionIntroCopy` (reused directly, not redefined — same `{text: string; boldTerms?: string[]}[]` shape).
- Produces: `BRACKET_INTRO_BEATS: PredictionIntroBeat[]`. Task 6 (`BracketPage.tsx`) passes this to the reused `IntroBeat` component exactly as `PredictionsPage.tsx` passes `PREDICTION_INTRO_BEATS`.

This file has no logic (pure data, same precedent as `predictionIntroCopy.ts`), so per the Global Constraints it gets no test file.

- [ ] **Step 1: Write the copy file**

```ts
// src/bracket/bracketIntroCopy.ts
import { PredictionIntroBeat } from "../predictions/predictionIntroCopy";

export const BRACKET_INTRO_BEATS: PredictionIntroBeat[] = [
  {
    text: "Şimdi eleme turu. 16 takım, tek maç, tek kazanan.",
    boldTerms: ["eleme turu"],
  },
  {
    text: "Çeyrek finalden şampiyona kadar tüm ağacı tek seferde dolduruyorsun.",
    boldTerms: ["tek seferde"],
  },
  {
    text: "Bir kere gönderdikten sonra değiştiremezsin, o yüzden emin ol.",
    boldTerms: ["değiştiremezsin"],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/bracket/bracketIntroCopy.ts
git commit -m "feat: add bracket submission intro copy"
```

---

### Task 5: Bracket submission derivation helpers

**Files:**
- Create: `src/bracket/bracketSubmission.ts`
- Test: `src/bracket/bracketSubmission.test.ts`

**Interfaces:**
- Consumes: `MatchupId`, `matchupById`, `childrenOf`, `BRACKET_MATCHUPS` from `./bracketStructure` (Plan 1 Task 1).
- Produces: `teamsInMatchupForPicks(matchupId: MatchupId, ro16Teams: Partial<Record<MatchupId, [string, string]>>, picks: Partial<Record<MatchupId, string>>): [string | null, string | null]`, `pickWinner(picks: Partial<Record<MatchupId, string>>, matchupId: MatchupId, teamId: string): Partial<Record<MatchupId, string>>` (pure — returns a new object, does not mutate), `isSubmissionComplete(picks: Partial<Record<MatchupId, string>>): boolean`. Task 6 (`BracketBoard.tsx`) consumes all three to drive click handling and the submit-button's enabled state.

- [ ] **Step 1: Write the failing test**

```ts
// src/bracket/bracketSubmission.test.ts
import { describe, it, expect } from "vitest";
import { teamsInMatchupForPicks, pickWinner, isSubmissionComplete } from "./bracketSubmission";
import { MatchupId } from "./bracketStructure";

describe("teamsInMatchupForPicks", () => {
  it("returns the drawn teams for an RO16 matchup regardless of picks", () => {
    const ro16Teams = { "ro16-1": ["Arsenal", "Napoli"] as [string, string] };
    expect(teamsInMatchupForPicks("ro16-1", ro16Teams, {})).toEqual(["Arsenal", "Napoli"]);
  });

  it("returns [null, null] for an undrawn RO16 matchup", () => {
    expect(teamsInMatchupForPicks("ro16-1", {}, {})).toEqual([null, null]);
  });

  it("derives a QF matchup's teams from the user's own RO16 picks", () => {
    const picks = { "ro16-1": "Arsenal", "ro16-2": "Real Madrid" };
    expect(teamsInMatchupForPicks("qf-1", {}, picks)).toEqual(["Arsenal", "Real Madrid"]);
  });

  it("returns a partial pair when only one feeder has been picked", () => {
    const picks = { "ro16-1": "Arsenal" };
    expect(teamsInMatchupForPicks("qf-1", {}, picks)).toEqual(["Arsenal", null]);
  });

  it("returns [null, null] for a QF matchup with no feeder picks yet", () => {
    expect(teamsInMatchupForPicks("qf-1", {}, {})).toEqual([null, null]);
  });

  it("derives the Final's teams from the user's own SF picks", () => {
    const picks = { "sf-1": "Arsenal", "sf-2": "Bayern" };
    expect(teamsInMatchupForPicks("final", {}, picks)).toEqual(["Arsenal", "Bayern"]);
  });
});

describe("pickWinner", () => {
  it("sets the pick for the given matchup", () => {
    const result = pickWinner({}, "ro16-1", "Arsenal");
    expect(result["ro16-1"]).toBe("Arsenal");
  });

  it("does not mutate the input object", () => {
    const original = { "ro16-1": "Napoli" };
    pickWinner(original, "ro16-1", "Arsenal");
    expect(original["ro16-1"]).toBe("Napoli");
  });

  it("clears the downstream QF pick when an RO16 pick changes", () => {
    const picks = { "ro16-1": "Arsenal", "qf-1": "Arsenal" };
    const result = pickWinner(picks, "ro16-1", "Napoli");
    expect(result["ro16-1"]).toBe("Napoli");
    expect(result["qf-1"]).toBeUndefined();
  });

  it("cascades the clear through QF, SF, and Final when an RO16 pick changes", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "qf-1": "Arsenal",
      "sf-1": "Arsenal",
      final: "Arsenal",
    };
    const result = pickWinner(picks, "ro16-1", "Napoli");
    expect(result["qf-1"]).toBeUndefined();
    expect(result["sf-1"]).toBeUndefined();
    expect(result.final).toBeUndefined();
  });

  it("does not clear sibling branches untouched by the cascade", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "ro16-3": "Napoli",
      "qf-1": "Arsenal",
      "qf-2": "Napoli",
    };
    const result = pickWinner(picks, "ro16-1", "Real Madrid");
    expect(result["qf-1"]).toBeUndefined();
    expect(result["qf-2"]).toBe("Napoli");
    expect(result["ro16-3"]).toBe("Napoli");
  });

  it("clears a downstream pick when re-picking the Final itself (no cascade needed, but overwrite still works)", () => {
    const picks = { final: "Arsenal" };
    const result = pickWinner(picks, "final", "Bayern");
    expect(result.final).toBe("Bayern");
  });
});

describe("isSubmissionComplete", () => {
  it("returns false when no picks have been made", () => {
    expect(isSubmissionComplete({})).toBe(false);
  });

  it("returns false when only some picks have been made", () => {
    const picks: Partial<Record<MatchupId, string>> = { "ro16-1": "Arsenal", "ro16-2": "Napoli" };
    expect(isSubmissionComplete(picks)).toBe(false);
  });

  it("returns true when all 15 matchups have a pick", () => {
    const picks: Partial<Record<MatchupId, string>> = {
      "ro16-1": "A", "ro16-2": "B", "ro16-3": "C", "ro16-4": "D",
      "ro16-5": "E", "ro16-6": "F", "ro16-7": "G", "ro16-8": "H",
      "qf-1": "A", "qf-2": "C", "qf-3": "E", "qf-4": "G",
      "sf-1": "A", "sf-2": "E",
      final: "A",
    };
    expect(isSubmissionComplete(picks)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bracketSubmission`
Expected: FAIL with "Cannot find module './bracketSubmission'".

- [ ] **Step 3: Write the implementation**

```ts
// src/bracket/bracketSubmission.ts
import { MatchupId, BRACKET_MATCHUPS, matchupById, childrenOf } from "./bracketStructure";

type PicksMap = Partial<Record<MatchupId, string>>;
type Ro16TeamsMap = Partial<Record<MatchupId, [string, string]>>;

/**
 * Same shape as bracketState.ts's teamsInMatchup, but derives deeper rounds
 * from the user's in-progress picks instead of real bracketState winners —
 * this is what the submission UI needs while the bracket is still open.
 */
export function teamsInMatchupForPicks(
  matchupId: MatchupId,
  ro16Teams: Ro16TeamsMap,
  picks: PicksMap
): [string | null, string | null] {
  const matchup = matchupById(matchupId);
  if (matchup.round === "ro16") {
    const teams = ro16Teams[matchupId];
    return teams ? [teams[0], teams[1]] : [null, null];
  }
  const children = childrenOf(matchupId);
  if (!children) return [null, null];
  const [childA, childB] = children;
  return [picks[childA] ?? null, picks[childB] ?? null];
}

function feedsInto(matchupId: MatchupId): MatchupId | null {
  return matchupById(matchupId).feedsInto;
}

/**
 * Pure, immutable. Setting a pick invalidates any downstream pick that was
 * derived from the old value, so this walks the feedsInto chain clearing
 * every matchup from here to the Final. This is what keeps `picks` always
 * internally self-consistent, which bracketScoring.ts's flat comparison
 * relies on.
 */
export function pickWinner(picks: PicksMap, matchupId: MatchupId, teamId: string): PicksMap {
  const next: PicksMap = { ...picks, [matchupId]: teamId };
  let cursor = feedsInto(matchupId);
  while (cursor) {
    delete next[cursor];
    cursor = feedsInto(cursor);
  }
  return next;
}

export function isSubmissionComplete(picks: PicksMap): boolean {
  return BRACKET_MATCHUPS.every((matchup) => picks[matchup.id] !== undefined);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bracketSubmission`
Expected: PASS, all 16 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/bracketSubmission.ts src/bracket/bracketSubmission.test.ts
git commit -m "feat: add bracket submission pick/cascade derivation helpers"
```

---

### Task 6: `BracketBoard` submission UI

**Files:**
- Create: `src/bracket/BracketBoard.tsx`
- Test: `src/bracket/BracketBoard.test.tsx`

**Interfaces:**
- Consumes: `MatchupId`, `Round`, `matchupById` from `./bracketStructure` (Plan 1 Task 1); `teamsInMatchupForPicks`, `pickWinner`, `isSubmissionComplete` from `./bracketSubmission` (Task 5); `TeamCrest` from `../leaderboard/TeamCrest` (`TeamCrest({teamId, className, style})`).
- Produces: `BracketBoard({ro16Teams, onSubmit}: {ro16Teams: Partial<Record<MatchupId, [string, string]>>; onSubmit: (picks: Record<MatchupId, string>) => void})`. Task 7 (`BracketPage.tsx`) renders this in its `"rank"` step. **Layout note:** GREAT_LEAP_SPEC.md §5.2 specifically requires the full submission page to render as "two columns of 8 teams each (left and right), each user click on a team advances it into the next slot inward, cascading toward a final matchup in the middle" — this is a real bracket-tree layout (RO16 on the outer edges, converging through QF/SF toward a centered Final), not a flat stack of round-by-round rows. The confirmed feedsInto chain from `BRACKET_MATCHUPS` (Plan 1 Task 1) is: `ro16-1`/`ro16-2` → `qf-1`, `ro16-3`/`ro16-4` → `qf-2`, `qf-1`/`qf-2` → `sf-1` (the left half); `ro16-5`/`ro16-6` → `qf-3`, `ro16-7`/`ro16-8` → `qf-4`, `qf-3`/`qf-4` → `sf-2` (the right half); `sf-1`/`sf-2` → `final` (center). The implementation below lays out 7 columns left-to-right (RO16-left, QF-left, SF-left, Final, SF-right, QF-right, RO16-right) with each column's matchup boxes vertically distributed (`justify-around`) so each round visually nests between the two matchups that feed it.

- [ ] **Step 1: Write the failing test**

```tsx
// src/bracket/BracketBoard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BracketBoard } from "./BracketBoard";

const RO16_TEAMS = {
  "ro16-1": ["Arsenal", "Napoli"] as [string, string],
  "ro16-2": ["Real Madrid", "Bayern"] as [string, string],
  "ro16-3": ["Man City", "Inter"] as [string, string],
  "ro16-4": ["PSG", "Liverpool"] as [string, string],
  "ro16-5": ["Barcelona", "Juventus"] as [string, string],
  "ro16-6": ["Atletico Madrid", "Chelsea"] as [string, string],
  "ro16-7": ["Dortmund", "Milan"] as [string, string],
  "ro16-8": ["Porto", "Benfica"] as [string, string],
};

describe("BracketBoard", () => {
  it("renders all 8 RO16 matchups with both team names", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Napoli")).toBeInTheDocument();
    expect(screen.getByText("Porto")).toBeInTheDocument();
    expect(screen.getByText("Benfica")).toBeInTheDocument();
  });

  it("disables the submit button until all 15 picks are made", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /gönder/i })).toBeDisabled();
  });

  it("does not render a QF matchup's teams until both RO16 feeders are picked", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId("matchup-qf-1")).toHaveTextContent("");
  });

  it("reveals a QF matchup's teams once both RO16 picks are made, and clears it on re-pick", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pick-ro16-1-Arsenal"));
    fireEvent.click(screen.getByTestId("pick-ro16-2-Real Madrid"));
    expect(screen.getByTestId("matchup-qf-1")).toHaveTextContent("Arsenal");
    expect(screen.getByTestId("matchup-qf-1")).toHaveTextContent("Real Madrid");

    fireEvent.click(screen.getByTestId("pick-ro16-1-Napoli"));
    expect(screen.getByTestId("matchup-qf-1")).not.toHaveTextContent("Arsenal");
  });

  it("enables submit once all 15 matchups are picked, and calls onSubmit with the full picks map", () => {
    const onSubmit = vi.fn();
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={onSubmit} />);

    const ro16Winners: [string, string][] = [
      ["ro16-1", "Arsenal"], ["ro16-2", "Real Madrid"], ["ro16-3", "Man City"], ["ro16-4", "PSG"],
      ["ro16-5", "Barcelona"], ["ro16-6", "Atletico Madrid"], ["ro16-7", "Dortmund"], ["ro16-8", "Porto"],
    ];
    ro16Winners.forEach(([matchupId, team]) => {
      fireEvent.click(screen.getByTestId(`pick-${matchupId}-${team}`));
    });

    fireEvent.click(screen.getByTestId("pick-qf-1-Arsenal"));
    fireEvent.click(screen.getByTestId("pick-qf-2-Man City"));
    fireEvent.click(screen.getByTestId("pick-qf-3-Barcelona"));
    fireEvent.click(screen.getByTestId("pick-qf-4-Dortmund"));

    fireEvent.click(screen.getByTestId("pick-sf-1-Arsenal"));
    fireEvent.click(screen.getByTestId("pick-sf-2-Barcelona"));

    fireEvent.click(screen.getByTestId("pick-final-Arsenal"));

    const submitButton = screen.getByRole("button", { name: /gönder/i });
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        "ro16-1": "Arsenal",
        "qf-1": "Arsenal",
        "sf-1": "Arsenal",
        final: "Arsenal",
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- BracketBoard`
Expected: FAIL with "Cannot find module './BracketBoard'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/bracket/BracketBoard.tsx
import { useState } from "react";
import { MatchupId, Round, matchupById } from "./bracketStructure";
import { teamsInMatchupForPicks, pickWinner, isSubmissionComplete } from "./bracketSubmission";
import { TeamCrest } from "../leaderboard/TeamCrest";

interface BracketBoardProps {
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  onSubmit: (picks: Record<MatchupId, string>) => void;
}

const ROUND_LABEL: Record<Round, string> = {
  ro16: "Son 16",
  qf: "Çeyrek Final",
  sf: "Yarı Final",
  final: "Final",
};

// The real bracket structure (BRACKET_MATCHUPS' feedsInto chain, Plan 1
// Task 1): ro16-1/2 -> qf-1, ro16-3/4 -> qf-2, qf-1/2 -> sf-1 (left half);
// ro16-5/6 -> qf-3, ro16-7/8 -> qf-4, qf-3/4 -> sf-2 (right half);
// sf-1/sf-2 -> final (center). Laid out as two columns of matchups
// converging inward toward the Final in the middle (GREAT_LEAP_SPEC.md
// §5.2's "8 left / 8 right" interaction model) rather than a flat list of
// round-rows.
const LEFT_COLUMNS: MatchupId[][] = [
  ["ro16-1", "ro16-2", "ro16-3", "ro16-4"],
  ["qf-1", "qf-2"],
  ["sf-1"],
];
const RIGHT_COLUMNS: MatchupId[][] = [
  ["sf-2"],
  ["qf-3", "qf-4"],
  ["ro16-5", "ro16-6", "ro16-7", "ro16-8"],
];

function MatchupBox({
  matchupId,
  ro16Teams,
  picks,
  onPick,
}: {
  matchupId: MatchupId;
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  picks: Partial<Record<MatchupId, string>>;
  onPick: (matchupId: MatchupId, teamId: string) => void;
}) {
  const [teamA, teamB] = teamsInMatchupForPicks(matchupId, ro16Teams, picks);
  return (
    <div
      data-testid={`matchup-${matchupId}`}
      className="flex flex-col gap-1 rounded-lg border border-color_border p-3"
    >
      {[teamA, teamB].map((team) =>
        team ? (
          <button
            key={team}
            type="button"
            data-testid={`pick-${matchupId}-${team}`}
            onClick={() => onPick(matchupId, team)}
            className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors duration-150 ease-[var(--ease-cotton)] ${
              picks[matchupId] === team ? "bg-color_text text-background" : "hover:bg-color_hover"
            }`}
          >
            <TeamCrest teamId={team} className="size-5" />
            {team}
          </button>
        ) : null
      )}
    </div>
  );
}

function BracketColumn({
  matchupIds,
  ro16Teams,
  picks,
  onPick,
}: {
  matchupIds: MatchupId[];
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  picks: Partial<Record<MatchupId, string>>;
  onPick: (matchupId: MatchupId, teamId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-around gap-4">
      <h3 className="text-center text-sm font-semibold text-color_muted">
        {ROUND_LABEL[matchupById(matchupIds[0]).round]}
      </h3>
      {matchupIds.map((matchupId) => (
        <MatchupBox key={matchupId} matchupId={matchupId} ro16Teams={ro16Teams} picks={picks} onPick={onPick} />
      ))}
    </div>
  );
}

export function BracketBoard({ ro16Teams, onSubmit }: BracketBoardProps) {
  const [picks, setPicks] = useState<Partial<Record<MatchupId, string>>>({});

  function handlePick(matchupId: MatchupId, teamId: string) {
    setPicks((current) => pickWinner(current, matchupId, teamId));
  }

  const complete = isSubmissionComplete(picks);

  return (
    <div className="flex flex-col gap-8">
      {/* Two columns of matchups converging inward toward the Final in the
          center — GREAT_LEAP_SPEC.md §5.2's "8 left / 8 right" model. */}
      <div className="flex items-stretch gap-4 overflow-x-auto">
        {LEFT_COLUMNS.map((matchupIds, index) => (
          <BracketColumn
            key={`left-${index}`}
            matchupIds={matchupIds}
            ro16Teams={ro16Teams}
            picks={picks}
            onPick={handlePick}
          />
        ))}
        <BracketColumn matchupIds={["final"]} ro16Teams={ro16Teams} picks={picks} onPick={handlePick} />
        {RIGHT_COLUMNS.map((matchupIds, index) => (
          <BracketColumn
            key={`right-${index}`}
            matchupIds={matchupIds}
            ro16Teams={ro16Teams}
            picks={picks}
            onPick={handlePick}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={!complete}
        onClick={() => complete && onSubmit(picks as Record<MatchupId, string>)}
        className="self-start rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
      >
        Tahminini Gönder
      </button>
    </div>
  );
}
```

Note: the `data-testid` conventions (`matchup-{id}`, `pick-{matchupId}-{team}`) and the submit button's role/label are unchanged from the layout this replaces, so the Step 1 test file above passes against this implementation without modification.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- BracketBoard`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/BracketBoard.tsx src/bracket/BracketBoard.test.tsx
git commit -m "feat: add BracketBoard submission UI with click-to-cascade picks"
```

---

### Task 7: `BracketPage`

**Files:**
- Create: `src/pages/BracketPage.tsx`
- Test: `src/pages/BracketPage.test.tsx`

**Interfaces:**
- Consumes: `isPageAllowed` from `../state/pageAccess` (Task 1); `getVisibilityState` from `../state/visibilityState`; `useAuth` from `../auth/AuthProvider` (confirmed real path — same import `PredictionsPage.tsx:4` uses, there is no separate `auth/useAuth.ts` file); `useBracketState` from `../bracket/useBracketState` (Plan 1 Task 3); `useBracketPrediction`, `saveBracketPrediction` from `../bracket/useBracketPrediction` (Plan 1 Task 4); `BRACKET_INTRO_BEATS` from `../bracket/bracketIntroCopy` (Task 4); `IntroBeat` from `../predictions/IntroBeat`; `BracketBoard` from `../bracket/BracketBoard` (Task 6); `MatchupId` from `../bracket/bracketStructure`.
- Produces: `BracketPage()` — a **named** export (every page component in `src/pages/` uses `export function XPage()` / named imports in `App.tsx`, confirmed with no exceptions — `BracketPage` follows the same convention rather than a default export), mounted at `/bracket` (Task 8). Redirects to `/` when `!isPageAllowed("bracket", state)`, and additionally redirects to `/` when the phase isn't exactly `"preknockout"` or the user already has a submitted prediction (mirrors `PredictionsPage.tsx`'s two-tier gating exactly, using its own tighter rule: per §5.2, the bracket submission window "is open during preknockout and closed once knockout begins" — it does **not** stay open through `knockout`).

- [ ] **Step 1: Write the failing test**

Model this test file directly on the confirmed structure of `src/pages/PredictionsPage.test.tsx` (196 lines) — same mock scaffolding for `useAuth`, `react-router-dom`'s `Navigate`, and the relevant hooks, adapted to bracket's hooks and gating rule:

```tsx
// src/pages/BracketPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUseAuth = vi.fn();
const mockUseBracketState = vi.fn();
const mockUseBracketPrediction = vi.fn();
const mockSaveBracketPrediction = vi.fn();

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../bracket/useBracketState", () => ({ useBracketState: () => mockUseBracketState() }));
vi.mock("../bracket/useBracketPrediction", () => ({
  useBracketPrediction: (uid: string | null) => mockUseBracketPrediction(uid),
  saveBracketPrediction: (...args: unknown[]) => mockSaveBracketPrediction(...args),
}));
vi.mock("../tournament/useTournamentPhase", () => ({ useTournamentPhase: () => "preknockout" }));

import { BracketPage } from "./BracketPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <BracketPage />
    </MemoryRouter>
  );
}

describe("BracketPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseBracketState.mockReset();
    mockUseBracketPrediction.mockReset();
    mockSaveBracketPrediction.mockReset();

    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockUseBracketState.mockReturnValue({
      bracketState: { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} },
      loading: false,
    });
    mockUseBracketPrediction.mockReturnValue({ prediction: null, loading: false });
  });

  it("redirects away when the user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { container } = renderPage();
    expect(container).not.toHaveTextContent("Tahminini Gönder");
  });

  it("redirects away when the user has already submitted a bracket prediction", () => {
    mockUseBracketPrediction.mockReturnValue({
      prediction: { picks: { "ro16-1": "Arsenal" }, submittedAt: 1 },
      loading: false,
    });
    const { container } = renderPage();
    expect(container).not.toHaveTextContent("Son 16");
  });

  it("shows the intro step first", () => {
    renderPage();
    expect(screen.getByText(/Şimdi eleme turu/)).toBeInTheDocument();
  });

  it("moves to the board after continuing from the intro", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /devam/i }));
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
  });

  it("calls saveBracketPrediction and shows the done step on successful submit", async () => {
    mockSaveBracketPrediction.mockResolvedValue({ picks: {}, submittedAt: 1 });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /devam/i }));
    expect(await screen.findByText("Arsenal")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- BracketPage`
Expected: FAIL with "Cannot find module './BracketPage'".

- [ ] **Step 3: Write the implementation**

Model this directly on the confirmed structure of `src/pages/PredictionsPage.tsx` (132 lines, `FlowStep = "intro"|"rank"|"done"`):

```tsx
// src/pages/BracketPage.tsx
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getVisibilityState } from "../state/visibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { useBracketPrediction, saveBracketPrediction } from "../bracket/useBracketPrediction";
import { BRACKET_INTRO_BEATS } from "../bracket/bracketIntroCopy";
import { IntroBeat } from "../predictions/IntroBeat";
import { BracketBoard } from "../bracket/BracketBoard";
import { MatchupId } from "../bracket/bracketStructure";

type FlowStep = "intro" | "rank" | "done";

export function BracketPage() {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  const { bracketState } = useBracketState();
  const { prediction, loading: predictionLoading } = useBracketPrediction(user?.uid ?? null);
  const [step, setStep] = useState<FlowStep>("intro");
  const [submitting, setSubmitting] = useState(false);

  const visibilityState = getVisibilityState(!!user, phase);
  if (!isPageAllowed("bracket", visibilityState)) {
    return <Navigate to="/" replace />;
  }

  // Bracket submission is open only during preknockout and closes the
  // moment knockout begins (GREAT_LEAP_SPEC.md §5.2: "the window is open
  // during preknockout and closed once knockout begins") — tighter than the
  // coarse PAGE_ACCESS gate above, which only knows about logged-in vs
  // logged-out.
  if (phase !== "preknockout") {
    return <Navigate to="/" replace />;
  }

  if (!predictionLoading && prediction) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(picks: Record<MatchupId, string>) {
    if (!user) return;
    setSubmitting(true);
    try {
      await saveBracketPrediction(user.uid, picks);
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "intro") {
    return (
      <IntroBeat
        beats={BRACKET_INTRO_BEATS}
        onContinue={() => setStep("rank")}
        continueLabel="Devam Et"
      />
    );
  }

  if (step === "rank") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <BracketBoard ro16Teams={bracketState.ro16Teams} onSubmit={handleSubmit} />
        {submitting && <p className="mt-4 text-sm text-color_muted">Gönderiliyor…</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="text-xl font-semibold">Tahminin kaydedildi.</h2>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- BracketPage`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BracketPage.tsx src/pages/BracketPage.test.tsx
git commit -m "feat: add BracketPage one-time submission flow"
```

---

### Task 8: Register `/bracket` route

**Files:**
- Modify: `src/App.tsx:24`

**Interfaces:**
- Consumes: `BracketPage` named export from `./pages/BracketPage` (Task 7).
- Produces: `/bracket` reachable via `HashRouter`. No other file consumes this — it's the final wiring step for the submission flow.

- [ ] **Step 1: Add the route**

In `src/App.tsx`, add an import alongside the existing `PredictionsPage` import (confirmed at `src/App.tsx:7`: `import { PredictionsPage } from "./pages/PredictionsPage";` — every page import in this file is a named import, no exceptions), and a `<Route>` alongside the existing `/predictions` route at line 24:

```tsx
import { BracketPage } from "./pages/BracketPage";
```

```tsx
<Route path="/bracket" element={<BracketPage />} />
```

- [ ] **Step 2: Manually verify the route mounts**

Run: `npm run dev`, sign in, navigate to `#/bracket` during the `preknockout` phase (adjust `tournamentState/current.phase` by hand if needed, per the existing dev convention).
Expected: the bracket intro renders; navigating there while `notstarted`/`leaguephase`/`knockout`-with-a-submission redirects to `/`.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /bracket route"
```

---

### Task 9: `BracketCtaBanner`

**Files:**
- Create: `src/bracket/BracketCtaBanner.tsx`
- Test: `src/bracket/BracketCtaBanner.test.tsx`

**Interfaces:**
- Consumes: nothing from other new-in-this-plan files — purely presentational, takes an `onClick`/`to` prop like a normal link. Mirrors the link-pill half of `HomeLandingLoggedIn.tsx`'s "Tahminini Yap" CTA banner (confirmed classes: `inline-flex shrink-0 items-center gap-2 rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent`). No countdown, since GREAT_LEAP_SPEC.md §1.2 forbids calendar-driven timers and the bracket window is phase-boundary-driven, not date-driven.
- Produces: `BracketCtaBanner()` — a self-contained `<Link to="/bracket">` pill reading "Eleme Turu Tahminini Yap". Not consumed by any file in this plan (Plan 3 wires it into `HomePage.tsx`'s started-phase branch).

- [ ] **Step 1: Write the failing test**

```tsx
// src/bracket/BracketCtaBanner.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BracketCtaBanner } from "./BracketCtaBanner";

describe("BracketCtaBanner", () => {
  it("renders a link to /bracket with the CTA copy", () => {
    render(
      <MemoryRouter>
        <BracketCtaBanner />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /eleme turu tahminini yap/i });
    expect(link).toHaveAttribute("href", "/bracket");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- BracketCtaBanner`
Expected: FAIL with "Cannot find module './BracketCtaBanner'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/bracket/BracketCtaBanner.tsx
import { Link } from "react-router-dom";

export function BracketCtaBanner() {
  return (
    <Link
      to="/bracket"
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
    >
      Eleme Turu Tahminini Yap
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- BracketCtaBanner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/BracketCtaBanner.tsx src/bracket/BracketCtaBanner.test.tsx
git commit -m "feat: add standalone bracket CTA banner for Home"
```

---

### Task 10: `BracketWidget`

**Files:**
- Create: `src/bracket/BracketWidget.tsx`
- Test: `src/bracket/BracketWidget.test.tsx`

**Interfaces:**
- Consumes: `MatchupId`, `Round`, `ROUND_ORDER`, `matchupsForRound`, `nextRound`, `previousRound` from `./bracketStructure` (Plan 1 Task 1); `BracketState`, `teamsInMatchup` from `./bracketState` (Plan 1 Task 2); `TeamCrest` from `../leaderboard/TeamCrest`.
- Produces: `BracketWidget({bracketState, currentRound, onSelectTeam}: {bracketState: BracketState; currentRound: Round; onSelectTeam: (teamId: string) => void})` — renders `currentRound` at full strength, `previousRound(currentRound)`/`nextRound(currentRound)` faded, all other rounds not rendered at all (§5.4). Team crests are clickable and call `onSelectTeam`; matchup slots themselves are not. **This widget does not render `TeamPopup` itself** — confirmed against `src/leaderboard/TeamPopup.tsx`'s real prop contract, `TeamPopup` requires `teamId`, `entries`, `results`, `onOpenChange`, `onSelectParticipant`, `onSelectTeam`, and `tournamentStarted` (all required, not optional — `entries`/`results` are needed to compute "who predicted this team", and `onSelectParticipant` lets the popup cross-link into a participant popup), none of which a standalone widget has reason to own. Instead, exactly like `LeaderboardPage.tsx` and `ProfilePage.tsx` — which each own exactly one `TeamPopup` instance shared across every clickable crest on the page — the parent owns the single `TeamPopup` instance and passes its `teamId`-setter down as `onSelectTeam`. Not consumed by any file in this plan (Plan 3 wires it into `HomePage.tsx`, passing whatever round it derives as "current" plus `HomePage.tsx`'s own `TeamPopup`-owning `onSelectTeam` handler — the same handler §2.4's league-table widget already needs for its own `TeamTable`/`TeamPopup` wiring, so `HomePage.tsx` ends up with exactly one shared `TeamPopup`, matching §5.4's "no new popup" requirement).

- [ ] **Step 1: Write the failing test**

```tsx
// src/bracket/BracketWidget.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BracketWidget } from "./BracketWidget";
import { BracketState } from "./bracketState";

const STATE: BracketState = {
  ro16Teams: {
    "ro16-1": ["Arsenal", "Napoli"],
    "ro16-2": ["Real Madrid", "Bayern"],
  },
  winners: { "ro16-1": "Arsenal" },
};

describe("BracketWidget", () => {
  it("renders the current round's matchups at full strength", () => {
    render(<BracketWidget bracketState={STATE} currentRound="ro16" onSelectTeam={vi.fn()} />);
    const currentSection = screen.getByTestId("bracket-widget-round-ro16");
    expect(currentSection).not.toHaveClass("opacity-40");
  });

  it("renders the adjacent round faded and does not render rounds further away", () => {
    render(<BracketWidget bracketState={STATE} currentRound="qf" onSelectTeam={vi.fn()} />);
    expect(screen.getByTestId("bracket-widget-round-ro16")).toHaveClass("opacity-40");
    expect(screen.getByTestId("bracket-widget-round-qf")).not.toHaveClass("opacity-40");
    expect(screen.getByTestId("bracket-widget-round-sf")).toHaveClass("opacity-40");
    expect(screen.queryByTestId("bracket-widget-round-final")).not.toBeInTheDocument();
  });

  it("calls onSelectTeam with the clicked team's id", () => {
    const onSelectTeam = vi.fn();
    render(<BracketWidget bracketState={STATE} currentRound="ro16" onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByTestId("bracket-widget-crest-Arsenal"));
    expect(onSelectTeam).toHaveBeenCalledWith("Arsenal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- BracketWidget`
Expected: FAIL with "Cannot find module './BracketWidget'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/bracket/BracketWidget.tsx
import { Round, ROUND_ORDER, matchupsForRound, nextRound, previousRound } from "./bracketStructure";
import { BracketState, teamsInMatchup } from "./bracketState";
import { TeamCrest } from "../leaderboard/TeamCrest";

interface BracketWidgetProps {
  bracketState: BracketState;
  currentRound: Round;
  onSelectTeam: (teamId: string) => void;
}

function RoundColumn({
  round,
  bracketState,
  faded,
  onSelectTeam,
}: {
  round: Round;
  bracketState: BracketState;
  faded: boolean;
  onSelectTeam: (teamId: string) => void;
}) {
  return (
    <div
      data-testid={`bracket-widget-round-${round}`}
      className={`flex flex-col gap-2 ${faded ? "opacity-40" : ""}`}
    >
      {matchupsForRound(round).map((matchup) => {
        const [teamA, teamB] = teamsInMatchup(matchup.id, bracketState);
        return (
          <div key={matchup.id} className="flex flex-col gap-1">
            {[teamA, teamB].map((team, index) =>
              team ? (
                <button
                  key={team}
                  type="button"
                  data-testid={`bracket-widget-crest-${team}`}
                  onClick={() => onSelectTeam(team)}
                  className="flex items-center gap-1"
                >
                  <TeamCrest teamId={team} className="size-5" />
                </button>
              ) : (
                <div key={index} className="size-5" />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BracketWidget({ bracketState, currentRound, onSelectTeam }: BracketWidgetProps) {
  const prev = previousRound(currentRound);
  const next = nextRound(currentRound);
  const visibleRounds = ROUND_ORDER.filter((round) => round === currentRound || round === prev || round === next);

  return (
    <div className="flex gap-4">
      {visibleRounds.map((round) => (
        <RoundColumn
          key={round}
          round={round}
          bracketState={bracketState}
          faded={round !== currentRound}
          onSelectTeam={onSelectTeam}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- BracketWidget`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/BracketWidget.tsx src/bracket/BracketWidget.test.tsx
git commit -m "feat: add compact Home bracket widget"
```

---

### Task 11: Bracket consensus + `BracketProfileView` + `ProfilePage` integration

**Files:**
- Create: `src/bracket/bracketConsensus.ts`
- Test: `src/bracket/bracketConsensus.test.ts`
- Create: `src/bracket/BracketProfileView.tsx`
- Test: `src/bracket/BracketProfileView.test.tsx`
- Create: `src/bracket/useAllBracketPredictions.ts`
- Test: `src/bracket/useAllBracketPredictions.test.ts`
- Modify: `src/pages/ProfilePage.tsx:427` (insert new block)

**Interfaces:**
- Consumes (`bracketConsensus.ts`): `MatchupId`, `BRACKET_MATCHUPS` from `../bracket/bracketStructure`; `BracketPrediction` from `./bracketPredictionTypes`.
- Produces (`bracketConsensus.ts`): `MatchupConsensus {matchupId: MatchupId; teamPercentages: Record<string, number>}`, `computeBracketConsensus(predictions: BracketPrediction[]): MatchupConsensus[]`. Rhymes with `computeAveragePositions` per §5.5's "should rhyme with" note — same "aggregate everyone's submissions into one derived summary" shape, adapted to bracket's pick-a-winner format instead of league's rank-a-team format.
- Consumes (`BracketProfileView.tsx`): `MatchupId`, `Round`, `ROUND_ORDER`, `matchupsForRound` from `../bracket/bracketStructure`; `BracketPrediction` from `../bracket/bracketPredictionTypes`; `computeBracketConsensus`, `MatchupConsensus` from `./bracketConsensus`; `TeamCrest` from `../leaderboard/TeamCrest`.
- Produces (`BracketProfileView.tsx`): `BracketProfileView({prediction, allPredictions}: {prediction: BracketPrediction; allPredictions: BracketPrediction[]})` — read-only display of the user's own picks per round, each annotated with the group consensus percentage for that pick. Directly integrated into `ProfilePage.tsx`.
- Consumes (`useAllBracketPredictions.ts`): `BracketPrediction` from `./bracketPredictionTypes`; `db` from `../firebase`; `getCached`/`setCached` from `../lib/sessionCache` (same caching layer `useResults.ts` already uses).
- Produces (`useAllBracketPredictions.ts`): `useAllBracketPredictions(): {predictions: BracketPrediction[]; loading: boolean}` — a one-time `getDocs(collection(db, "bracketPredictions"))` read, modeled directly on the confirmed structure of `src/leaderboard/useResults.ts` (same cached-`useState`/`useEffect`/ignore-flag/error-swallowing shape, adapted from a doc-id-keyed map to a flat array since nothing here needs to be keyed by uid). `ProfilePage.tsx`'s integration step below consumes this for `BracketProfileView`'s `allPredictions` prop.

- [ ] **Step 1: Write the failing consensus test**

```ts
// src/bracket/bracketConsensus.test.ts
import { describe, it, expect } from "vitest";
import { computeBracketConsensus } from "./bracketConsensus";
import { BracketPrediction } from "./bracketPredictionTypes";

function prediction(picks: Record<string, string>): BracketPrediction {
  return { picks: picks as BracketPrediction["picks"], submittedAt: 1 };
}

describe("computeBracketConsensus", () => {
  it("returns an empty consensus list for no predictions", () => {
    expect(computeBracketConsensus([])).toEqual([]);
  });

  it("gives 100% for a unanimous pick", () => {
    const predictions = [prediction({ "ro16-1": "Arsenal" }), prediction({ "ro16-1": "Arsenal" })];
    const consensus = computeBracketConsensus(predictions);
    const ro16_1 = consensus.find((c) => c.matchupId === "ro16-1");
    expect(ro16_1?.teamPercentages).toEqual({ Arsenal: 100 });
  });

  it("splits percentages across a divided matchup", () => {
    const predictions = [
      prediction({ "ro16-1": "Arsenal" }),
      prediction({ "ro16-1": "Arsenal" }),
      prediction({ "ro16-1": "Napoli" }),
      prediction({ "ro16-1": "Napoli" }),
    ];
    const consensus = computeBracketConsensus(predictions);
    const ro16_1 = consensus.find((c) => c.matchupId === "ro16-1");
    expect(ro16_1?.teamPercentages).toEqual({ Arsenal: 50, Napoli: 50 });
  });

  it("ignores predictions that didn't pick a given matchup", () => {
    const predictions = [prediction({ "ro16-1": "Arsenal" }), prediction({ "ro16-2": "Bayern" })];
    const consensus = computeBracketConsensus(predictions);
    const ro16_1 = consensus.find((c) => c.matchupId === "ro16-1");
    expect(ro16_1?.teamPercentages).toEqual({ Arsenal: 100 });
  });

  it("covers all 15 matchup ids even with zero picks for some", () => {
    const predictions = [prediction({ "ro16-1": "Arsenal" })];
    const consensus = computeBracketConsensus(predictions);
    expect(consensus).toHaveLength(15);
    const final = consensus.find((c) => c.matchupId === "final");
    expect(final?.teamPercentages).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bracketConsensus`
Expected: FAIL with "Cannot find module './bracketConsensus'".

- [ ] **Step 3: Write the consensus implementation**

```ts
// src/bracket/bracketConsensus.ts
import { MatchupId, BRACKET_MATCHUPS } from "./bracketStructure";
import { BracketPrediction } from "./bracketPredictionTypes";

export interface MatchupConsensus {
  matchupId: MatchupId;
  teamPercentages: Record<string, number>;
}

/**
 * Rhymes with computeAveragePositions (RankingList.tsx): aggregates every
 * submitted prediction into one derived per-matchup summary. Unlike league's
 * numeric average, bracket picks are categorical, so this reports each
 * picked team's share of submissions instead of a mean (GREAT_LEAP_SPEC.md
 * §5.5).
 */
export function computeBracketConsensus(predictions: BracketPrediction[]): MatchupConsensus[] {
  return BRACKET_MATCHUPS.map((matchup) => {
    const picksForMatchup = predictions
      .map((prediction) => prediction.picks[matchup.id])
      .filter((pick): pick is string => pick !== undefined);

    const counts: Record<string, number> = {};
    picksForMatchup.forEach((team) => {
      counts[team] = (counts[team] ?? 0) + 1;
    });

    const teamPercentages: Record<string, number> = {};
    const total = picksForMatchup.length;
    Object.entries(counts).forEach(([team, count]) => {
      teamPercentages[team] = Math.round((count / total) * 100);
    });

    return { matchupId: matchup.id, teamPercentages };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bracketConsensus`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/bracketConsensus.ts src/bracket/bracketConsensus.test.ts
git commit -m "feat: add bracket group-consensus aggregation"
```

- [ ] **Step 6: Write the failing `BracketProfileView` test**

```tsx
// src/bracket/BracketProfileView.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BracketProfileView } from "./BracketProfileView";
import { BracketPrediction } from "./bracketPredictionTypes";

const OWN_PREDICTION: BracketPrediction = {
  picks: { "ro16-1": "Arsenal" } as BracketPrediction["picks"],
  submittedAt: 1,
};

const ALL_PREDICTIONS: BracketPrediction[] = [
  OWN_PREDICTION,
  { picks: { "ro16-1": "Napoli" } as BracketPrediction["picks"], submittedAt: 2 },
];

describe("BracketProfileView", () => {
  it("renders the user's own pick for a matchup", () => {
    render(<BracketProfileView prediction={OWN_PREDICTION} allPredictions={ALL_PREDICTIONS} />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
  });

  it("annotates the pick with the group consensus percentage", () => {
    render(<BracketProfileView prediction={OWN_PREDICTION} allPredictions={ALL_PREDICTIONS} />);
    expect(screen.getByText("%50")).toBeInTheDocument();
  });

  it("renders nothing for matchups the user didn't pick", () => {
    render(<BracketProfileView prediction={OWN_PREDICTION} allPredictions={ALL_PREDICTIONS} />);
    expect(screen.queryByTestId("bracket-profile-pick-final")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- BracketProfileView`
Expected: FAIL with "Cannot find module './BracketProfileView'".

- [ ] **Step 8: Write the `BracketProfileView` implementation**

```tsx
// src/bracket/BracketProfileView.tsx
import { Round, ROUND_ORDER, matchupsForRound } from "./bracketStructure";
import { BracketPrediction } from "./bracketPredictionTypes";
import { computeBracketConsensus } from "./bracketConsensus";
import { TeamCrest } from "../leaderboard/TeamCrest";

interface BracketProfileViewProps {
  prediction: BracketPrediction;
  allPredictions: BracketPrediction[];
}

const ROUND_LABEL: Record<Round, string> = {
  ro16: "Son 16",
  qf: "Çeyrek Final",
  sf: "Yarı Final",
  final: "Final",
};

export function BracketProfileView({ prediction, allPredictions }: BracketProfileViewProps) {
  const consensus = computeBracketConsensus(allPredictions);

  return (
    <div className="flex flex-col gap-6">
      {ROUND_ORDER.map((round) => (
        <div key={round} className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-color_muted">{ROUND_LABEL[round]}</h4>
          <div className="flex flex-wrap gap-3">
            {matchupsForRound(round).map((matchup) => {
              const ownPick = prediction.picks[matchup.id];
              if (!ownPick) return null;
              const matchupConsensus = consensus.find((c) => c.matchupId === matchup.id);
              const percentage = matchupConsensus?.teamPercentages[ownPick] ?? 0;
              return (
                <div
                  key={matchup.id}
                  data-testid={`bracket-profile-pick-${matchup.id}`}
                  className="flex items-center gap-2 rounded-lg border border-color_border px-3 py-2 text-sm"
                >
                  <TeamCrest teamId={ownPick} className="size-5" />
                  <span>{ownPick}</span>
                  <span className="text-color_muted">%{percentage}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- BracketProfileView`
Expected: PASS, all 3 tests green.

- [ ] **Step 10: Commit**

```bash
git add src/bracket/BracketProfileView.tsx src/bracket/BracketProfileView.test.tsx
git commit -m "feat: add read-only bracket profile view with consensus annotation"
```

- [ ] **Step 11: Write the failing `useAllBracketPredictions` test**

`src/leaderboard/useLeaderboard.ts`'s `leaderboardCache/current` entries (confirmed via Task 3's `buildLeaderboardEntries`, which builds `{uid, firstName, lastName, photoURL, points, ranking, submittedAt}` — no `picks` field anywhere) never carry bracket picks, so `BracketProfileView`'s `allPredictions` prop needs its own data source. Model this test directly on the confirmed structure of `src/leaderboard/useResults.test.ts`:

```ts
// src/bracket/useAllBracketPredictions.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useAllBracketPredictions } from "./useAllBracketPredictions";

describe("useAllBracketPredictions", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    clearSessionCache();
  });

  it("returns an empty array before any bracket predictions exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useAllBracketPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual([]);
  });

  it("returns every submitted bracket prediction's data", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "uid1", data: () => ({ picks: { "ro16-1": "Arsenal" }, submittedAt: 1 }) },
        { id: "uid2", data: () => ({ picks: { "ro16-1": "Napoli" }, submittedAt: 2 }) },
      ],
    });
    const { result } = renderHook(() => useAllBracketPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toHaveLength(2);
    expect(result.current.predictions[0].picks["ro16-1"]).toBe("Arsenal");
  });

  it("stops loading and leaves predictions empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useAllBracketPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load bracket predictions", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `npm test -- useAllBracketPredictions`
Expected: FAIL with "Cannot find module './useAllBracketPredictions'".

- [ ] **Step 13: Write the implementation**

```ts
// src/bracket/useAllBracketPredictions.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { BracketPrediction } from "./bracketPredictionTypes";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "allBracketPredictions";

export function useAllBracketPredictions() {
  const cached = getCached<BracketPrediction[]>(CACHE_KEY);
  const [predictions, setPredictions] = useState<BracketPrediction[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "bracketPredictions"))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.docs.map((docSnap: { data: () => unknown }) => docSnap.data() as BracketPrediction);
        setCached(CACHE_KEY, next);
        setPredictions(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load bracket predictions", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { predictions, loading };
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `npm test -- useAllBracketPredictions`
Expected: PASS, all 3 tests green.

- [ ] **Step 15: Commit**

```bash
git add src/bracket/useAllBracketPredictions.ts src/bracket/useAllBracketPredictions.test.ts
git commit -m "feat: add one-time all-bracket-predictions reader for the profile consensus view"
```

- [ ] **Step 16: Integrate into `ProfilePage.tsx`**

In `src/pages/ProfilePage.tsx`, add imports alongside the existing ones (confirmed against the current file — it already imports `useLeaderboard`/`useResults` at lines 17-18):

```tsx
import { useBracketPrediction } from "../bracket/useBracketPrediction";
import { useAllBracketPredictions } from "../bracket/useAllBracketPredictions";
import { BracketProfileView } from "../bracket/BracketProfileView";
```

Inside the `ProfilePage` component body, alongside the existing hooks (confirmed at line 92, `const uid = user?.uid ?? null;` — this is the variable every other profile-scoped hook in this file already keys off of, e.g. `useProfile(uid)`/`usePrediction(uid)` at lines 94-95), add:

```tsx
const { prediction: bracketPrediction } = useBracketPrediction(uid);
const { predictions: allBracketPredictions } = useAllBracketPredictions();
```

Immediately after the closing `</div></div>` of `MAIN_ROW` (confirmed at line 427) and before the `ParticipantPopup`/`TeamPopup` calls (lines 429-445), insert a new sibling block following the same `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` composition already used by the "Lig Tahmininiz" block (lines 355-411):

```tsx
{bracketPrediction && (
  <Frame>
    <FrameHeader>
      <FrameTitle>Eleme Turu Tahmininiz</FrameTitle>
    </FrameHeader>
    <FrameBody>
      <BracketProfileView prediction={bracketPrediction} allPredictions={allBracketPredictions} />
    </FrameBody>
  </Frame>
)}
```

- [ ] **Step 17: Manually verify in the browser**

Run: `npm run dev`, sign in as a user with a submitted bracket prediction during `preknockout`/`knockout`, navigate to `/profile`.
Expected: the new "Eleme Turu Tahmininiz" block renders below the existing league prediction block, showing each of the user's picks with a consensus percentage; the block does not render at all for a user with no bracket submission.

- [ ] **Step 18: Commit**

```bash
git add src/pages/ProfilePage.tsx
git commit -m "feat: integrate bracket profile view into ProfilePage"
```

---

## Plan Complete

At the end of this plan: a signed-in user can submit a one-time, whole-tree knockout bracket prediction during `preknockout`/`knockout` via `/bracket`; bracket points (QF=3, SF=4, Final=5, Champion=6, stacking) fold into the same combined `points` field the league leaderboard already reads, with §7.3's edge cases (bracket-only or league-only participants) handled; a standalone `BracketCtaBanner` and `BracketWidget` exist for Plan 3 to wire into `HomePage.tsx`'s started-phase branch; `ProfilePage.tsx` shows a read-only, consensus-annotated bracket view. Nothing in this plan touches `HomePage.tsx` itself, registration-closing logic, or the Stats page — that's Plan 3.
