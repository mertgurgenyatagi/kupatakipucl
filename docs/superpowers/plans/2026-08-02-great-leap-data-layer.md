# Great Leap: Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the schema, Firestore security rules, client hooks, and server-side rank-snapshot mechanism that the bracket feature (Plan 2) and started-phase Home (Plan 3) will both depend on — no UI, no scoring math, no submission flow.

**Architecture:** Two independent new data domains, both following this repo's existing "hand-edited state + Cloud-Function-derived cache" convention (see `results`/`tournamentState` and `leaderboardCache`):
1. **Bracket data** — a static, hardcoded 15-matchup tournament tree (`bracketStructure.ts`), a hand-edited `bracketState/current` doc holding the real RO16 draw and real winners so far (mirrors `results`/`tournamentState`'s manual-edit convention — no admin UI per GREAT_LEAP_SPEC.md §1.2), and a one-time-only `bracketPredictions/{uid}` collection for user submissions (mirrors `predictions/{uid}` but locked to create-only, no revisions, per §5.2).
2. **Rank snapshots** — a new `currentMatchday` number field on `tournamentState/current` (hand-edited, same convention), and a `rankSnapshots/{matchday}` collection written exclusively by `functions/leaderboard`'s existing Cloud Function on every `recomputeLeaderboard()` pass, giving Plan 3 real per-matchday rank history instead of the dev-only `devMatches` replay in `rankHistory.ts` (§7.1).

The rank-snapshot mechanism is deliberately scoring-agnostic: it snapshots whatever `points` value each leaderboard entry already has at the moment of computation. When Plan 2 later adds bracket points into that same `points` field, snapshots automatically reflect combined scoring — this plan does not need any bracket-scoring awareness.

**Tech Stack:** React 18.3 + TypeScript 5.5 (strict) for client hooks, Firebase v10 client SDK (Firestore `onSnapshot`/`getDoc`/`setDoc`), Vitest 2 + `@testing-library/react` for client tests, plain Node.js CommonJS + `firebase-admin` ^12.6.0 for the Cloud Function, a new standalone Vitest setup for `functions/leaderboard` (currently has zero tests and no test framework).

## Global Constraints

- No admin UI of any kind (GREAT_LEAP_SPEC.md §1.2) — `bracketState/current` and `tournamentState/current.currentMatchday` are hand-edited directly via the Firebase console, exactly like `results` and the existing `tournamentState.phase` field today.
- Do not tighten the existing temporary `allow write: if request.auth != null` rules on `results/{teamId}` or `tournamentState/{docId}` — they stay open pre-launch (§1.2).
- No real results-data-fetching or live integration, no Stats redesign, no security/optimization pass, no bracket scoring math, no submission-flow UI, no eligibility/window logic — all explicitly out of scope for this plan (deferred to Plan 2 or Plan 3, or entirely out of scope per §1.2).
- Every new logic file (hooks, derivation helpers, the Cloud Function's pure functions) gets its own co-located `.test.ts`/`.test.js` file, matching this repo's existing one-test-file-per-source-file convention. Pure type-only files (no logic) do not get a test file, matching `predictionTypes.ts`/`leaderboardTypes.ts`'s existing precedent.
- No Firestore rules unit tests — no such infrastructure exists anywhere in this repo for any existing collection; stay consistent with that precedent. Verify new rules manually.
- New Firestore rule blocks must follow the file's existing per-block comment convention: cite the GREAT_LEAP_SPEC.md section driving the shape, and cite the exact client type/file the validation mirrors.
- `functions/leaderboard` is plain CommonJS JS, not TypeScript, and is not built by Vite — its new `vitest.config.js` and test file must use `require`/`module.exports`, not `import`/`export`.

---

## File Structure

**New files:**
- `src/bracket/bracketStructure.ts` — static 15-matchup bracket topology (RO16→QF→SF→Final), pure, no Firestore.
- `src/bracket/bracketStructure.test.ts`
- `src/bracket/bracketState.ts` — `BracketState` type (real draw + real winners) and pure derivation helpers.
- `src/bracket/bracketState.test.ts`
- `src/bracket/useBracketState.ts` — hook reading `bracketState/current` live.
- `src/bracket/useBracketState.test.ts`
- `src/bracket/bracketPredictionTypes.ts` — `BracketPrediction` type.
- `src/bracket/useBracketPrediction.ts` — hook + one-time `saveBracketPrediction`.
- `src/bracket/useBracketPrediction.test.ts`
- `src/tournament/useCurrentMatchday.ts` — hook reading `tournamentState/current.currentMatchday`.
- `src/tournament/useCurrentMatchday.test.ts`
- `src/leaderboard/rankSnapshotTypes.ts` — `RankSnapshotEntry`/`RankSnapshot` types.
- `src/leaderboard/useRankSnapshots.ts` — hook reading the whole `rankSnapshots` collection, ordered by matchday.
- `src/leaderboard/useRankSnapshots.test.ts`
- `functions/leaderboard/vitest.config.js` — standalone Node-environment Vitest config for this subpackage.
- `functions/leaderboard/index.test.js` — tests for `index.js`'s pure functions.

**Modified files:**
- `vite.config.ts` — exclude `functions/**` from the root Vitest run (its own separate config/deps live there).
- `functions/leaderboard/package.json` — add `vitest` devDependency + `test` script.
- `functions/leaderboard/index.js` — add server-side `assignRanks` (currently client-only), add `buildRankSnapshotEntries` and `rankSnapshotDocId` helpers, extend `recomputeLeaderboard()` to upsert `rankSnapshots/{matchday}`, export the new pure functions.
- `firestore.rules` — three new match blocks: `bracketState/{docId}`, `bracketPredictions/{uid}`, `rankSnapshots/{docId}`.

---

### Task 1: Bracket tree topology

**Files:**
- Create: `src/bracket/bracketStructure.ts`
- Test: `src/bracket/bracketStructure.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no dependencies on other new files).
- Produces: `Round` type (`"ro16"|"qf"|"sf"|"final"`), `MatchupId` union (`"ro16-1"`..`"ro16-8"`, `"qf-1"`..`"qf-4"`, `"sf-1"|"sf-2"`, `"final"`), `MatchupDef {id: MatchupId; round: Round; feedsInto: MatchupId | null}`, `BRACKET_MATCHUPS: readonly MatchupDef[]`, `ROUND_ORDER: readonly Round[]`, `matchupById(id: MatchupId): MatchupDef`, `matchupsForRound(round: Round): MatchupDef[]`, `childrenOf(id: MatchupId): [MatchupId, MatchupId] | null`, `nextRound(round: Round): Round | null`, `previousRound(round: Round): Round | null`. Task 2 (`bracketState.ts`) and Task 7/8 (server-side, duplicated in JS) depend on this shape.

- [ ] **Step 1: Write the failing test**

```ts
// src/bracket/bracketStructure.test.ts
import { describe, it, expect } from "vitest";
import {
  BRACKET_MATCHUPS,
  ROUND_ORDER,
  matchupById,
  matchupsForRound,
  childrenOf,
  nextRound,
  previousRound,
  MatchupId,
} from "./bracketStructure";

describe("BRACKET_MATCHUPS", () => {
  it("has 15 matchups total (8 RO16 + 4 QF + 2 SF + 1 Final)", () => {
    expect(BRACKET_MATCHUPS.length).toBe(15);
  });
});

describe("matchupsForRound", () => {
  it("returns the 8 RO16 matchups", () => {
    expect(matchupsForRound("ro16").map((m) => m.id)).toEqual([
      "ro16-1", "ro16-2", "ro16-3", "ro16-4", "ro16-5", "ro16-6", "ro16-7", "ro16-8",
    ]);
  });
  it("returns the 4 QF matchups", () => {
    expect(matchupsForRound("qf").map((m) => m.id)).toEqual(["qf-1", "qf-2", "qf-3", "qf-4"]);
  });
  it("returns the 2 SF matchups", () => {
    expect(matchupsForRound("sf").map((m) => m.id)).toEqual(["sf-1", "sf-2"]);
  });
  it("returns the 1 Final matchup", () => {
    expect(matchupsForRound("final").map((m) => m.id)).toEqual(["final"]);
  });
});

describe("matchupById", () => {
  it("returns the matchup definition for a known id", () => {
    expect(matchupById("qf-1")).toEqual({ id: "qf-1", round: "qf", feedsInto: "sf-1" });
  });
  it("throws for an unknown id", () => {
    expect(() => matchupById("not-real" as MatchupId)).toThrow("Unknown matchup id: not-real");
  });
});

describe("childrenOf", () => {
  it("returns the two RO16 matchups that feed a QF matchup", () => {
    expect(childrenOf("qf-1")).toEqual(["ro16-1", "ro16-2"]);
  });
  it("returns the two QF matchups that feed an SF matchup", () => {
    expect(childrenOf("sf-2")).toEqual(["qf-3", "qf-4"]);
  });
  it("returns the two SF matchups that feed the Final", () => {
    expect(childrenOf("final")).toEqual(["sf-1", "sf-2"]);
  });
  it("returns null for an RO16 matchup (nothing feeds it)", () => {
    expect(childrenOf("ro16-1")).toBeNull();
  });
});

describe("nextRound / previousRound", () => {
  it("walks ro16 -> qf -> sf -> final", () => {
    expect(nextRound("ro16")).toBe("qf");
    expect(nextRound("qf")).toBe("sf");
    expect(nextRound("sf")).toBe("final");
    expect(nextRound("final")).toBeNull();
  });
  it("walks final -> sf -> qf -> ro16", () => {
    expect(previousRound("final")).toBe("sf");
    expect(previousRound("sf")).toBe("qf");
    expect(previousRound("qf")).toBe("ro16");
    expect(previousRound("ro16")).toBeNull();
  });
  it("ROUND_ORDER lists all four rounds in bracket order", () => {
    expect(ROUND_ORDER).toEqual(["ro16", "qf", "sf", "final"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bracketStructure`
Expected: FAIL with "Cannot find module './bracketStructure'" (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/bracket/bracketStructure.ts
export type Round = "ro16" | "qf" | "sf" | "final";

export type MatchupId =
  | "ro16-1" | "ro16-2" | "ro16-3" | "ro16-4"
  | "ro16-5" | "ro16-6" | "ro16-7" | "ro16-8"
  | "qf-1" | "qf-2" | "qf-3" | "qf-4"
  | "sf-1" | "sf-2"
  | "final";

export interface MatchupDef {
  id: MatchupId;
  round: Round;
  feedsInto: MatchupId | null;
}

export const ROUND_ORDER: readonly Round[] = ["ro16", "qf", "sf", "final"];

export const BRACKET_MATCHUPS: readonly MatchupDef[] = [
  { id: "ro16-1", round: "ro16", feedsInto: "qf-1" },
  { id: "ro16-2", round: "ro16", feedsInto: "qf-1" },
  { id: "ro16-3", round: "ro16", feedsInto: "qf-2" },
  { id: "ro16-4", round: "ro16", feedsInto: "qf-2" },
  { id: "ro16-5", round: "ro16", feedsInto: "qf-3" },
  { id: "ro16-6", round: "ro16", feedsInto: "qf-3" },
  { id: "ro16-7", round: "ro16", feedsInto: "qf-4" },
  { id: "ro16-8", round: "ro16", feedsInto: "qf-4" },
  { id: "qf-1", round: "qf", feedsInto: "sf-1" },
  { id: "qf-2", round: "qf", feedsInto: "sf-1" },
  { id: "qf-3", round: "qf", feedsInto: "sf-2" },
  { id: "qf-4", round: "qf", feedsInto: "sf-2" },
  { id: "sf-1", round: "sf", feedsInto: "final" },
  { id: "sf-2", round: "sf", feedsInto: "final" },
  { id: "final", round: "final", feedsInto: null },
];

const MATCHUP_BY_ID: ReadonlyMap<MatchupId, MatchupDef> = new Map(
  BRACKET_MATCHUPS.map((matchup) => [matchup.id, matchup])
);

export function matchupById(id: MatchupId): MatchupDef {
  const matchup = MATCHUP_BY_ID.get(id);
  if (!matchup) throw new Error(`Unknown matchup id: ${id}`);
  return matchup;
}

export function matchupsForRound(round: Round): MatchupDef[] {
  return BRACKET_MATCHUPS.filter((matchup) => matchup.round === round);
}

export function childrenOf(id: MatchupId): [MatchupId, MatchupId] | null {
  const children = BRACKET_MATCHUPS.filter((matchup) => matchup.feedsInto === id).map((matchup) => matchup.id);
  if (children.length === 0) return null;
  return [children[0], children[1]];
}

export function nextRound(round: Round): Round | null {
  const index = ROUND_ORDER.indexOf(round);
  return index === ROUND_ORDER.length - 1 ? null : ROUND_ORDER[index + 1];
}

export function previousRound(round: Round): Round | null {
  const index = ROUND_ORDER.indexOf(round);
  return index <= 0 ? null : ROUND_ORDER[index - 1];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bracketStructure`
Expected: PASS, all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/bracketStructure.ts src/bracket/bracketStructure.test.ts
git commit -m "feat: add static bracket tree topology"
```

---

### Task 2: Bracket state schema and derivation helpers

**Files:**
- Create: `src/bracket/bracketState.ts`
- Test: `src/bracket/bracketState.test.ts`

**Interfaces:**
- Consumes: `MatchupId`, `Round`, `ROUND_ORDER`, `matchupById`, `childrenOf` from `./bracketStructure` (Task 1).
- Produces: `BracketState {ro16Teams: Partial<Record<MatchupId, [string, string]>>; winners: Partial<Record<MatchupId, string>>}`, `Stage` type (`"qf"|"sf"|"final"|"champion"`), `teamsInMatchup(matchupId: MatchupId, state: BracketState): [string | null, string | null]`, `stageReached(teamId: string, state: BracketState): Stage | null`. Task 3's `useBracketState.ts` returns this `BracketState` shape; Plan 2's scoring and UI will consume `teamsInMatchup`/`stageReached`.

- [ ] **Step 1: Write the failing test**

```ts
// src/bracket/bracketState.test.ts
import { describe, it, expect } from "vitest";
import { BracketState, teamsInMatchup, stageReached } from "./bracketState";

function emptyState(): BracketState {
  return { ro16Teams: {}, winners: {} };
}

describe("teamsInMatchup", () => {
  it("returns the drawn teams for a populated RO16 matchup", () => {
    const state: BracketState = { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} };
    expect(teamsInMatchup("ro16-1", state)).toEqual(["Arsenal", "Napoli"]);
  });

  it("returns [null, null] for an undrawn RO16 matchup", () => {
    expect(teamsInMatchup("ro16-1", emptyState())).toEqual([null, null]);
  });

  it("derives a QF matchup's teams from its two RO16 winners", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "ro16-2": "Real Madrid" },
    };
    expect(teamsInMatchup("qf-1", state)).toEqual(["Arsenal", "Real Madrid"]);
  });

  it("returns [null, null] for a QF matchup whose feeder RO16 games aren't decided yet", () => {
    expect(teamsInMatchup("qf-1", emptyState())).toEqual([null, null]);
  });

  it("returns a partial pair when only one feeder is decided", () => {
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(teamsInMatchup("qf-1", state)).toEqual(["Arsenal", null]);
  });

  it("derives the Final's teams from the two SF winners", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "sf-1": "Arsenal", "sf-2": "Bayern" },
    };
    expect(teamsInMatchup("final", state)).toEqual(["Arsenal", "Bayern"]);
  });
});

describe("stageReached", () => {
  it("returns null for a team that hasn't won anything", () => {
    expect(stageReached("Arsenal", emptyState())).toBeNull();
  });

  it("returns 'qf' for a team that won only its RO16 matchup", () => {
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(stageReached("Arsenal", state)).toBe("qf");
  });

  it("returns 'sf' for a team that also won its QF matchup", () => {
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal" } };
    expect(stageReached("Arsenal", state)).toBe("sf");
  });

  it("returns 'final' for a team that also won its SF matchup", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal" },
    };
    expect(stageReached("Arsenal", state)).toBe("final");
  });

  it("returns 'champion' for a team that won the Final", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" },
    };
    expect(stageReached("Arsenal", state)).toBe("champion");
  });

  it("takes the furthest stage regardless of object key order", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { final: "Arsenal", "ro16-1": "Arsenal", "sf-1": "Arsenal", "qf-1": "Arsenal" },
    };
    expect(stageReached("Arsenal", state)).toBe("champion");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bracketState`
Expected: FAIL with "Cannot find module './bracketState'".

- [ ] **Step 3: Write the implementation**

```ts
// src/bracket/bracketState.ts
import { MatchupId, Round, ROUND_ORDER, matchupById, childrenOf } from "./bracketStructure";

export interface BracketState {
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  winners: Partial<Record<MatchupId, string>>;
}

export type Stage = "qf" | "sf" | "final" | "champion";

const STAGE_FOR_ROUND: Record<Round, Stage> = {
  ro16: "qf",
  qf: "sf",
  sf: "final",
  final: "champion",
};

export function teamsInMatchup(matchupId: MatchupId, state: BracketState): [string | null, string | null] {
  const matchup = matchupById(matchupId);
  if (matchup.round === "ro16") {
    const teams = state.ro16Teams[matchupId];
    return teams ? [teams[0], teams[1]] : [null, null];
  }
  const children = childrenOf(matchupId);
  if (!children) return [null, null];
  const [childA, childB] = children;
  return [state.winners[childA] ?? null, state.winners[childB] ?? null];
}

/**
 * The furthest stage a team has actually reached, per GREAT_LEAP_SPEC.md
 * §5.3's stage table — winning an ro16/qf/sf/final matchup means the team
 * *reached* qf/sf/final/champion respectively. null if they haven't won
 * any real matchup yet.
 */
export function stageReached(teamId: string, state: BracketState): Stage | null {
  let furthestRoundIndex = -1;
  for (const [matchupId, winnerId] of Object.entries(state.winners)) {
    if (winnerId !== teamId) continue;
    const round = matchupById(matchupId as MatchupId).round;
    furthestRoundIndex = Math.max(furthestRoundIndex, ROUND_ORDER.indexOf(round));
  }
  if (furthestRoundIndex === -1) return null;
  return STAGE_FOR_ROUND[ROUND_ORDER[furthestRoundIndex]];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bracketState`
Expected: PASS, all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/bracketState.ts src/bracket/bracketState.test.ts
git commit -m "feat: add bracket state schema and derivation helpers"
```

---

### Task 3: Bracket state Firestore access (rules + hook)

**Files:**
- Modify: `firestore.rules:98` (insert new block right after the `tournamentState/{docId}` block ends, before the `devConfig/{docId}` comment at line 100)
- Create: `src/bracket/useBracketState.ts`
- Test: `src/bracket/useBracketState.test.ts`

**Interfaces:**
- Consumes: `BracketState` from `./bracketState` (Task 2); `db` from `../firebase`.
- Produces: `useBracketState(): { bracketState: BracketState; loading: boolean }`. Plan 2's submission flow, home widget, and profile view all read the live draw/winners through this hook.

- [ ] **Step 1: Add the `bracketState` Firestore rule block**

In `firestore.rules`, insert this new block immediately after line 98 (the closing `}` of the `tournamentState/{docId}` match block) and before the `// Dev-only tooling` comment on line 100:

```
    // Bracket state (src/bracket/useBracketState.ts): the real-world RO16
    // draw (which two teams play each of the 8 first-round matchups) and
    // each real matchup's winner as the knockout rounds actually conclude
    // (GREAT_LEAP_SPEC.md §5.1, §7.2). Hand-edited directly, exactly like
    // `results`/`tournamentState` — no admin UI (§1.2). Public read (same
    // visibility as results/tournamentState). Write left open to any
    // signed-in user for now, same temporary trust-the-friend-group
    // convention as results/tournamentState — not to be tightened per
    // §1.2.
    match /bracketState/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

```

- [ ] **Step 2: Write the failing hook test**

```ts
// src/bracket/useBracketState.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useBracketState } from "./useBracketState";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useBracketState", () => {
  let callback: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("starts with an empty bracket state and loading=true", () => {
    const { result } = renderHook(() => useBracketState());
    expect(result.current.bracketState).toEqual({ ro16Teams: {}, winners: {} });
    expect(result.current.loading).toBe(true);
  });

  it("reflects the real doc once it loads", () => {
    const { result } = renderHook(() => useBracketState());
    const data = { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} };
    act(() => {
      callback({ exists: () => true, data: () => data });
    });
    expect(result.current.bracketState).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("falls back to an empty bracket state when the doc doesn't exist", () => {
    const { result } = renderHook(() => useBracketState());
    act(() => {
      callback({ exists: () => false, data: () => ({}) });
    });
    expect(result.current.bracketState).toEqual({ ro16Teams: {}, winners: {} });
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- useBracketState`
Expected: FAIL with "Cannot find module './useBracketState'".

- [ ] **Step 4: Write the implementation**

```ts
// src/bracket/useBracketState.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { BracketState } from "./bracketState";

const EMPTY_STATE: BracketState = { ro16Teams: {}, winners: {} };

export function useBracketState(): { bracketState: BracketState; loading: boolean } {
  const [bracketState, setBracketState] = useState<BracketState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "bracketState", "current"),
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as BracketState) : null;
        setBracketState(data ?? EMPTY_STATE);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load bracket state", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { bracketState, loading };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- useBracketState`
Expected: PASS, all 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules src/bracket/useBracketState.ts src/bracket/useBracketState.test.ts
git commit -m "feat: add bracketState Firestore rule and live-read hook"
```

---

### Task 4: Bracket predictions (types, rules, hook)

**Files:**
- Create: `src/bracket/bracketPredictionTypes.ts`
- Modify: `firestore.rules` (insert new block right after the `bracketState/{docId}` block added in Task 3)
- Create: `src/bracket/useBracketPrediction.ts`
- Test: `src/bracket/useBracketPrediction.test.ts`

**Interfaces:**
- Consumes: `MatchupId` from `./bracketStructure` (Task 1); `db` from `../firebase`.
- Produces: `BracketPrediction {picks: Record<MatchupId, string>; submittedAt: number}`, `useBracketPrediction(uid: string | null): {prediction: BracketPrediction | null; loading: boolean}`, `saveBracketPrediction(uid: string, picks: Record<MatchupId, string>): Promise<BracketPrediction>`. Plan 2's submission flow, home CTA, and profile view all consume these.

- [ ] **Step 1: Write the prediction type**

```ts
// src/bracket/bracketPredictionTypes.ts
import { MatchupId } from "./bracketStructure";

export interface BracketPrediction {
  picks: Record<MatchupId, string>;
  submittedAt: number;
}
```

- [ ] **Step 2: Add the `bracketPredictions` Firestore rule block**

In `firestore.rules`, insert this block immediately after the `bracketState/{docId}` block added in Task 3:

```
    // Bracket predictions (src/bracket/bracketPredictionTypes.ts): each
    // user's one-time knockout-bracket submission (GREAT_LEAP_SPEC.md
    // §5.2 — "one submission, one time, no revisions", unlike
    // predictions/{uid} which can be resubmitted). Read is public, same
    // stance as predictions/{uid}. Only the owner can create their own
    // doc, exactly once — there is no update or delete path at all, which
    // is what actually enforces "no revisions" (the client's one-time-door
    // UI alone is not a security boundary).
    match /bracketPredictions/{uid} {
      allow read: if true;
      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.picks is map
        && request.resource.data.picks.size() == 15;
      allow update, delete: if false;
    }

```

- [ ] **Step 3: Write the failing hook test**

```ts
// src/bracket/useBracketPrediction.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useBracketPrediction, saveBracketPrediction } from "./useBracketPrediction";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useBracketPrediction", () => {
  let callback: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("returns prediction=null and loading=false when uid is null", async () => {
    const { result } = renderHook(() => useBracketPrediction(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns the prediction once the doc loads", () => {
    const { result } = renderHook(() => useBracketPrediction("uid1"));
    const data = { picks: { "ro16-1": "Arsenal" }, submittedAt: 100 };
    callback({ exists: () => true, data: () => data });
    expect(result.current.prediction).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("returns null when no prediction doc exists yet", () => {
    const { result } = renderHook(() => useBracketPrediction("uid1"));
    callback({ exists: () => false, data: () => ({}) });
    expect(result.current.prediction).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe("saveBracketPrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("saves a new prediction with the current timestamp", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await saveBracketPrediction("uid1", { "ro16-1": "Arsenal" });

    expect(result.picks).toEqual({ "ro16-1": "Arsenal" });
    expect(typeof result.submittedAt).toBe("number");
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), result);
  });

  it("throws if a prediction already exists, and does not call setDoc", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ picks: {}, submittedAt: 1 }) });

    await expect(saveBracketPrediction("uid1", { "ro16-1": "Arsenal" })).rejects.toThrow(
      "Bracket prediction already submitted"
    );
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- useBracketPrediction`
Expected: FAIL with "Cannot find module './useBracketPrediction'".

- [ ] **Step 5: Write the implementation**

```ts
// src/bracket/useBracketPrediction.ts
import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MatchupId } from "./bracketStructure";
import { BracketPrediction } from "./bracketPredictionTypes";

export function useBracketPrediction(uid: string | null): { prediction: BracketPrediction | null; loading: boolean } {
  const [prediction, setPrediction] = useState<BracketPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPrediction(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "bracketPredictions", uid),
      (snapshot) => {
        setPrediction(snapshot.exists() ? (snapshot.data() as BracketPrediction) : null);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load bracket prediction", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [uid]);

  return { prediction, loading };
}

/**
 * One-time-only save (GREAT_LEAP_SPEC.md §5.2 — "no revisions"): unlike
 * usePrediction.ts's savePrediction, this throws if a submission already
 * exists rather than overwriting it. firestore.rules' `allow update: if
 * false` is the real enforcement; this is a fast client-side guard.
 */
export async function saveBracketPrediction(
  uid: string,
  picks: Record<MatchupId, string>
): Promise<BracketPrediction> {
  const existing = await getDoc(doc(db, "bracketPredictions", uid));
  if (existing.exists()) {
    throw new Error("Bracket prediction already submitted");
  }
  const prediction: BracketPrediction = { picks, submittedAt: Date.now() };
  await setDoc(doc(db, "bracketPredictions", uid), prediction);
  return prediction;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- useBracketPrediction`
Expected: PASS, all 5 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/bracket/bracketPredictionTypes.ts src/bracket/useBracketPrediction.ts src/bracket/useBracketPrediction.test.ts firestore.rules
git commit -m "feat: add one-time bracket predictions schema, rules, and hook"
```

---

### Task 5: Current matchday hook

**Files:**
- Create: `src/tournament/useCurrentMatchday.ts`
- Test: `src/tournament/useCurrentMatchday.test.ts`

**Interfaces:**
- Consumes: `db` from `../firebase`. No rule change needed — `tournamentState/{docId}` already allows `write: if request.auth != null` with no field-level validation, so adding a new field requires no rules edit.
- Produces: `useCurrentMatchday(): number | null`. Task 6's rank-snapshot UI (Plan 3) and any Home-widget "which matchday are we on" display consume this.

- [ ] **Step 1: Write the failing test**

```ts
// src/tournament/useCurrentMatchday.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useCurrentMatchday } from "./useCurrentMatchday";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useCurrentMatchday", () => {
  let callback: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("defaults to null before the doc arrives", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    expect(result.current).toBeNull();
  });

  it("defaults to null when the doc doesn't exist", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    act(() => callback({ exists: () => false, data: () => ({}) }));
    expect(result.current).toBeNull();
  });

  it("defaults to null when currentMatchday isn't a number yet", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    act(() => callback({ exists: () => true, data: () => ({ phase: "leaguephase" }) }));
    expect(result.current).toBeNull();
  });

  it("reflects the real currentMatchday once the doc loads", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    act(() => callback({ exists: () => true, data: () => ({ currentMatchday: 4 }) }));
    expect(result.current).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useCurrentMatchday`
Expected: FAIL with "Cannot find module './useCurrentMatchday'".

- [ ] **Step 3: Write the implementation**

```ts
// src/tournament/useCurrentMatchday.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useCurrentMatchday(): number | null {
  const [matchday, setMatchday] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "tournamentState", "current"), (snapshot) => {
      const data = snapshot.exists() ? (snapshot.data() as { currentMatchday?: number }) : null;
      setMatchday(typeof data?.currentMatchday === "number" ? data.currentMatchday : null);
    });
    return unsubscribe;
  }, []);

  return matchday;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useCurrentMatchday`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/tournament/useCurrentMatchday.ts src/tournament/useCurrentMatchday.test.ts
git commit -m "feat: add useCurrentMatchday hook"
```

---

### Task 6: Rank snapshots (types, rules, hook)

**Files:**
- Create: `src/leaderboard/rankSnapshotTypes.ts`
- Modify: `firestore.rules:86` (insert new block right after the `leaderboardCache/{docId}` block ends, before the `tournamentState/{docId}` comment at line 88)
- Create: `src/leaderboard/useRankSnapshots.ts`
- Test: `src/leaderboard/useRankSnapshots.test.ts`

**Interfaces:**
- Consumes: `db` from `../firebase`.
- Produces: `RankSnapshotEntry {uid: string; points: number; rank: number}`, `RankSnapshot {matchday: number; entries: RankSnapshotEntry[]; computedAt: number}`, `useRankSnapshots(): {snapshots: RankSnapshot[]; loading: boolean}`. Task 8's server-side `buildRankSnapshotEntries` in `functions/leaderboard/index.js` writes docs matching this exact shape (kept in sync by hand, same convention as `scoring.ts`/`index.js`'s existing duplication). Plan 3's rank-history chart consumes this hook.

- [ ] **Step 1: Write the rank snapshot types**

```ts
// src/leaderboard/rankSnapshotTypes.ts
export interface RankSnapshotEntry {
  uid: string;
  points: number;
  rank: number;
}

export interface RankSnapshot {
  matchday: number;
  entries: RankSnapshotEntry[];
  computedAt: number;
}
```

- [ ] **Step 2: Add the `rankSnapshots` Firestore rule block**

In `firestore.rules`, insert this block immediately after line 86 (the closing `}` of the `leaderboardCache/{docId}` match block) and before the `// Tournament phase` comment on line 88:

```
    // Per-matchday rank snapshots (src/leaderboard/rankSnapshotTypes.ts):
    // one doc per matchday recording each participant's rank at that point
    // in the season, so a real rank-history chart can be drawn later
    // (GREAT_LEAP_SPEC.md §7.1 — src/leaderboard/rankHistory.ts's existing
    // computeRankHistory only replays dev-only devMatches, not usable in
    // production). Written only by functions/leaderboard's Cloud Function
    // inside the same recomputeLeaderboard() pass that writes
    // leaderboardCache/current — same Cloud-Function-only convention as
    // that collection.
    match /rankSnapshots/{docId} {
      allow read: if true;
      allow write: if false;
    }

```

- [ ] **Step 3: Write the failing hook test**

```ts
// src/leaderboard/useRankSnapshots.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  query: (ref: unknown, ...constraints: unknown[]) => ({ ref, constraints }),
  orderBy: (field: string) => ({ field }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useRankSnapshots } from "./useRankSnapshots";

type QueryCallback = (snapshot: { docs: { data: () => unknown }[] }) => void;

describe("useRankSnapshots", () => {
  let callback: QueryCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_q: unknown, onNext: QueryCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("starts with an empty list and loading=true", () => {
    const { result } = renderHook(() => useRankSnapshots());
    expect(result.current.snapshots).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("populates snapshots from the query results and stops loading", () => {
    const { result } = renderHook(() => useRankSnapshots());
    const data = [
      { matchday: 1, entries: [{ uid: "a", points: 3, rank: 1 }], computedAt: 100 },
      { matchday: 2, entries: [{ uid: "a", points: 6, rank: 1 }], computedAt: 200 },
    ];
    act(() => {
      callback({ docs: data.map((d) => ({ data: () => d })) });
    });
    expect(result.current.snapshots).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("stops loading without populating snapshots when the listener errors", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockOnSnapshot.mockImplementation((_q: unknown, _onNext: QueryCallback, onError: (err: Error) => void) => {
      onError(new Error("permission-denied"));
      return mockUnsubscribe;
    });
    const { result } = renderHook(() => useRankSnapshots());
    expect(result.current.snapshots).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load rank snapshots", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- useRankSnapshots`
Expected: FAIL with "Cannot find module './useRankSnapshots'".

- [ ] **Step 5: Write the implementation**

```ts
// src/leaderboard/useRankSnapshots.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { RankSnapshot } from "./rankSnapshotTypes";

export function useRankSnapshots(): { snapshots: RankSnapshot[]; loading: boolean } {
  const [snapshots, setSnapshots] = useState<RankSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const snapshotsQuery = query(collection(db, "rankSnapshots"), orderBy("matchday"));
    const unsubscribe = onSnapshot(
      snapshotsQuery,
      (snapshot) => {
        setSnapshots(snapshot.docs.map((d) => d.data() as RankSnapshot));
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load rank snapshots", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { snapshots, loading };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- useRankSnapshots`
Expected: PASS, all 3 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/leaderboard/rankSnapshotTypes.ts src/leaderboard/useRankSnapshots.ts src/leaderboard/useRankSnapshots.test.ts firestore.rules
git commit -m "feat: add rank snapshot types, Firestore rule, and read hook"
```

---

### Task 7: `functions/leaderboard` test infrastructure + server-side `assignRanks`

**Files:**
- Modify: `vite.config.ts` (exclude `functions/**` from the root Vitest run)
- Modify: `functions/leaderboard/package.json` (add `vitest` devDependency + `test` script)
- Create: `functions/leaderboard/vitest.config.js`
- Modify: `functions/leaderboard/index.js:1-28` (add `assignRanks`, `buildRankSnapshotEntries`, `rankSnapshotDocId`; export the pure functions)
- Create: `functions/leaderboard/index.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces (from `functions/leaderboard/index.js`, all newly exported): `isPickCorrect(predictedPosition, actualPosition)`, `computeScore(ranking, results)`, `assignRanks(entries)` (mirrors `src/leaderboard/ranking.ts`'s `assignRanks` exactly — server currently has no equivalent), `buildRankSnapshotEntries(entries)`, `rankSnapshotDocId(currentMatchday)`. Task 8 wires these into `recomputeLeaderboard()`.

`functions/leaderboard` currently has zero tests and no test framework — this task must run `npm install` inside that subpackage before tests can execute.

- [ ] **Step 1: Exclude `functions/**` from the root Vitest run**

`functions/leaderboard` will get its own separate Vitest config and its own `node_modules` (with `firebase-admin`, not present in the root's `node_modules`). Without excluding it, the root's default `npm test` would pick up `functions/leaderboard/index.test.js` under jsdom and fail with "Cannot find module 'firebase-admin/app'".

Modify `vite.config.ts`:

```ts
/// <reference types="vitest" />
import path from "node:path";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    exclude: [...configDefaults.exclude, "functions/**"],
  },
});
```

- [ ] **Step 2: Add `vitest` to `functions/leaderboard/package.json`**

```json
{
  "name": "leaderboard",
  "version": "1.0.0",
  "main": "index.js",
  "engines": {
    "node": "20"
  },
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^5.1.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Add the standalone Vitest config**

```js
// functions/leaderboard/vitest.config.js
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Install dependencies**

Run: `cd functions/leaderboard && npm install`
Expected: `vitest` installed alongside the existing `firebase-admin`/`firebase-functions` deps.

- [ ] **Step 5: Write the failing test**

```js
// functions/leaderboard/index.test.js
const { describe, it, expect } = require("vitest");
const { isPickCorrect, computeScore, assignRanks, buildRankSnapshotEntries, rankSnapshotDocId } = require("./index");

describe("isPickCorrect", () => {
  it("is correct within 2 positions", () => {
    expect(isPickCorrect(5, 6)).toBe(true);
    expect(isPickCorrect(5, 7)).toBe(true);
    expect(isPickCorrect(5, 3)).toBe(true);
  });
  it("is incorrect at 3 or more positions off", () => {
    expect(isPickCorrect(5, 8)).toBe(false);
    expect(isPickCorrect(5, 2)).toBe(false);
  });
});

describe("computeScore", () => {
  it("awards 3 points per correct pick and skips incorrect/missing ones", () => {
    const ranking = ["a", "b", "c"];
    const results = { a: { position: 1 }, b: { position: 5 }, c: { position: 3 } };
    // a: predicted 1, actual 1 -> correct (+3)
    // b: predicted 2, actual 5 -> incorrect
    // c: predicted 3, actual 3 -> correct (+3)
    expect(computeScore(ranking, results)).toBe(6);
  });
  it("returns 0 when no results exist yet", () => {
    expect(computeScore(["a"], {})).toBe(0);
  });
});

describe("assignRanks", () => {
  it("assigns sequential ranks when there are no ties", () => {
    const ranked = assignRanks([{ uid: "a", points: 10 }, { uid: "b", points: 5 }]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("uses standard competition ranking: ties share a rank and the next skips", () => {
    const entries = [
      { uid: "a", points: 10 },
      { uid: "b", points: 5 },
      { uid: "c", points: 5 },
      { uid: "d", points: 5 },
      { uid: "e", points: 1 },
    ];
    expect(assignRanks(entries).map((r) => r.rank)).toEqual([1, 2, 2, 2, 5]);
  });

  it("preserves input order", () => {
    const entries = [{ uid: "a", points: 5 }, { uid: "b", points: 5 }];
    expect(assignRanks(entries).map((r) => r.entry.uid)).toEqual(["a", "b"]);
  });

  it("returns an empty array for no entries", () => {
    expect(assignRanks([])).toEqual([]);
  });
});

describe("buildRankSnapshotEntries", () => {
  it("produces uid/points/rank triples in ranked order", () => {
    const entries = [{ uid: "a", points: 10 }, { uid: "b", points: 5 }];
    expect(buildRankSnapshotEntries(entries)).toEqual([
      { uid: "a", points: 10, rank: 1 },
      { uid: "b", points: 5, rank: 2 },
    ]);
  });
});

describe("rankSnapshotDocId", () => {
  it("returns the stringified matchday when it's a number", () => {
    expect(rankSnapshotDocId(4)).toBe("4");
    expect(rankSnapshotDocId(0)).toBe("0");
  });
  it("returns null when matchday is missing or not a number", () => {
    expect(rankSnapshotDocId(undefined)).toBeNull();
    expect(rankSnapshotDocId(null)).toBeNull();
    expect(rankSnapshotDocId("4")).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd functions/leaderboard && npm test`
Expected: FAIL — `assignRanks`, `buildRankSnapshotEntries`, and `rankSnapshotDocId` are undefined (not yet added or exported).

- [ ] **Step 7: Add the pure functions to `index.js` and export them**

In `functions/leaderboard/index.js`, add these three functions immediately after the existing `computeScore` function (after line 28), and add the export lines at the very end of the file:

```js
// Mirrors src/leaderboard/ranking.ts's assignRanks exactly — the client had
// this already (used to render the live leaderboard); the server didn't,
// and rank snapshots (GREAT_LEAP_SPEC.md §7.1) need a real rank number per
// entry, not just a sorted list.
function assignRanks(entries) {
  let lastPoints = null;
  let lastRank = 0;
  return entries.map((entry, index) => {
    if (lastPoints === null || entry.points !== lastPoints) {
      lastRank = index + 1;
      lastPoints = entry.points;
    }
    return { entry, rank: lastRank };
  });
}

function buildRankSnapshotEntries(entries) {
  return assignRanks(entries).map(({ entry, rank }) => ({
    uid: entry.uid,
    points: entry.points,
    rank,
  }));
}

function rankSnapshotDocId(currentMatchday) {
  if (typeof currentMatchday !== "number") return null;
  return String(currentMatchday);
}
```

At the end of the file, add:

```js
exports.isPickCorrect = isPickCorrect;
exports.computeScore = computeScore;
exports.assignRanks = assignRanks;
exports.buildRankSnapshotEntries = buildRankSnapshotEntries;
exports.rankSnapshotDocId = rankSnapshotDocId;
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd functions/leaderboard && npm test`
Expected: PASS, all 13 tests green.

- [ ] **Step 9: Verify the root test run still passes and doesn't pick up the new file**

Run: `npm test`
Expected: PASS — the root Vitest run's output should not mention `functions/leaderboard/index.test.js` at all.

- [ ] **Step 10: Commit**

```bash
git add vite.config.ts functions/leaderboard/package.json functions/leaderboard/package-lock.json functions/leaderboard/vitest.config.js functions/leaderboard/index.js functions/leaderboard/index.test.js
git commit -m "feat: add functions/leaderboard test infra and server-side assignRanks"
```

---

### Task 8: Wire rank-snapshot upsert into `recomputeLeaderboard`

**Files:**
- Modify: `functions/leaderboard/index.js:40-71` (the `recomputeLeaderboard` function)

**Interfaces:**
- Consumes: `buildRankSnapshotEntries`, `rankSnapshotDocId` from the same file (Task 7).
- Produces: `recomputeLeaderboard()` now also upserts `rankSnapshots/{matchday}` whenever `tournamentState/current.currentMatchday` is a number, skipping entirely when it isn't. No new exported interface — this is the integration point Task 7's helpers were built for.

This task does not add an integration test for `recomputeLeaderboard`'s Firestore orchestration itself — it never had one before this plan either (it reads/writes multiple collections via the Admin SDK, which would require an emulator to test meaningfully, and no such infrastructure exists in this repo). The pure decision logic (`rankSnapshotDocId`, `buildRankSnapshotEntries`) is already covered by Task 7's tests. Verify this task manually after deploy, per Step 4 below.

- [ ] **Step 1: Read the current `recomputeLeaderboard` function**

Confirm the current shape at `functions/leaderboard/index.js:40-71` matches:

```js
async function recomputeLeaderboard() {
  const [predictionsSnap, profilesSnap, resultsSnap] = await Promise.all([
    db.collection("predictions").get(),
    db.collection("profiles").get(),
    db.collection("results").get(),
  ]);

  const profilesById = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const results = {};
  resultsSnap.docs.forEach((doc) => {
    results[doc.id] = doc.data();
  });

  const entries = [];
  predictionsSnap.docs.forEach((doc) => {
    const profile = profilesById.get(doc.id);
    if (!profile) return;
    const prediction = doc.data();
    entries.push({
      uid: doc.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
  });
  entries.sort((a, b) => b.points - a.points);

  await db.doc("leaderboardCache/current").set({ entries, computedAt: Date.now() });
}
```

- [ ] **Step 2: Replace it with the rank-snapshot-aware version**

Replace the whole function with:

```js
async function recomputeLeaderboard() {
  const [predictionsSnap, profilesSnap, resultsSnap, tournamentStateSnap] = await Promise.all([
    db.collection("predictions").get(),
    db.collection("profiles").get(),
    db.collection("results").get(),
    db.doc("tournamentState/current").get(),
  ]);

  const profilesById = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const results = {};
  resultsSnap.docs.forEach((doc) => {
    results[doc.id] = doc.data();
  });

  const entries = [];
  predictionsSnap.docs.forEach((doc) => {
    const profile = profilesById.get(doc.id);
    if (!profile) return;
    const prediction = doc.data();
    entries.push({
      uid: doc.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
  });
  entries.sort((a, b) => b.points - a.points);

  await db.doc("leaderboardCache/current").set({ entries, computedAt: Date.now() });

  // Rank snapshots (GREAT_LEAP_SPEC.md §7.1): only written once a real
  // matchday is set (tournamentState/current.currentMatchday, hand-bumped
  // — §1.2, no admin UI). Scoring-agnostic on purpose: this just snapshots
  // whatever `points` each entry already has above, so a future scoring
  // change (e.g. Plan 2 adding bracket points) flows through automatically.
  //
  // Note: `.exists` is a boolean property on Admin SDK DocumentSnapshots,
  // not a method call like on the client SDK.
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

- [ ] **Step 3: Run the existing pure-function tests to confirm nothing broke**

Run: `cd functions/leaderboard && npm test`
Expected: PASS, same 13 tests as Task 7 (this step doesn't add new automated tests, per the note above — it's a smoke check that the file still loads and the helper functions still work after editing the file around them).

- [ ] **Step 4: Manual verification (documented, not automated)**

After this is deployed (`firebase deploy --only functions:leaderboard`):
1. In the Firebase console, hand-edit `tournamentState/current` to add `currentMatchday: 1`.
2. Hand-edit any `results/{teamId}` doc (e.g. bump a position) to trigger `recomputeLeaderboardOnResult`.
3. Confirm a new `rankSnapshots/1` doc appears with `{matchday: 1, entries: [...], computedAt: <timestamp>}`, where `entries` matches the ranks implied by `leaderboardCache/current`.
4. Repeat with `currentMatchday: 2` and another `results` edit — confirm `rankSnapshots/2` is created and `rankSnapshots/1` is untouched.

- [ ] **Step 5: Commit**

```bash
git add functions/leaderboard/index.js
git commit -m "feat: upsert per-matchday rank snapshots from recomputeLeaderboard"
```

---

## Plan Complete

At the end of this plan: `bracketState`, `bracketPredictions`, and `rankSnapshots` all exist as real Firestore collections with rules and typed client hooks; `tournamentState/current.currentMatchday` is a supported hand-edited field; `functions/leaderboard` has a real (if minimal) test suite and a server-side `assignRanks` matching the client's; every `recomputeLeaderboard()` run keeps a historical per-matchday rank record. Nothing in this plan renders any UI, computes bracket scores, or adds submission-flow/eligibility logic — that's Plan 2 (Bracket feature) and Plan 3 (Started-phase Home + registration closing).
