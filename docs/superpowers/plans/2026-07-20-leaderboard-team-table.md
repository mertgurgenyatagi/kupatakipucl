# Leaderboard / Team Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the club team-table (standings), the signed-up player list, and the participant points leaderboard for kupatakipucl, per `docs/superpowers/specs/2026-07-20-leaderboard-team-table-design.md`.

**Architecture:** A new `results/{teamId}` Firestore collection (manually maintained, no admin UI) drives both the team table and score computation. Scoring is a pure client-side function (`scoring.ts`) — no new Cloud Function. `HomePage` gets real content for all four visibility states (team table + player list, plus the leaderboard once the tournament has started); `LeaderboardPage` becomes a dedicated view of the same leaderboard data.

**Tech Stack:** React + TypeScript, Firebase Firestore (`firebase/firestore` v9 modular SDK), Vitest + React Testing Library, `firebase/firestore` mocked at module level (no emulator suite).

## Global Constraints

- All-Turkish UI text, no English strings in rendered output (`SPEC.md` §9).
- No admin panel — `results` is written by direct Firestore edits (Mert asking Claude), never through app UI (`SPEC.md` §7b).
- Leaderboard ties are left as ties, no tiebreaker logic (`SPEC.md` §3).
- Bare-skeleton scope: plain text team names, no crests/visual polish (`SPEC.md` §9a, deferred — same precedent as unit 2).
- Strictly free backend — no new paid services (`SPEC.md` §7a).
- Tests: Vitest + React Testing Library, Firestore mocked at the module level via `vi.mock("firebase/firestore", ...)`, no emulator suite — matches every existing test file under `src/predictions/` and `src/profile/`.

---

### Task 1: Team result type + scoring function

**Files:**
- Create: `src/leaderboard/teamResultTypes.ts`
- Create: `src/leaderboard/scoring.ts`
- Test: `src/leaderboard/scoring.test.ts`

**Interfaces:**
- Produces: `TeamResult { position: number; points: number; goalDifference: number; goalsFor: number; goalsAgainst: number }` (from `teamResultTypes.ts`). `computeScore(ranking: string[], results: Record<string, TeamResult>): number` (from `scoring.ts`).

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/scoring.test.ts
import { describe, it, expect } from "vitest";
import { computeScore } from "./scoring";
import { TeamResult } from "./teamResultTypes";

function result(position: number): TeamResult {
  return { position, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
}

describe("computeScore", () => {
  it("awards 3 points for an exact position match", () => {
    expect(computeScore(["a"], { a: result(1) })).toBe(3);
  });

  it("awards 3 points when the delta is 1", () => {
    expect(computeScore(["a"], { a: result(2) })).toBe(3);
  });

  it("awards 3 points when the delta is 2", () => {
    expect(computeScore(["a"], { a: result(3) })).toBe(3);
  });

  it("awards 0 points when the delta is exactly 3 (boundary excluded)", () => {
    expect(computeScore(["a"], { a: result(4) })).toBe(0);
  });

  it("awards 0 points when the delta is large", () => {
    expect(computeScore(["a"], { a: result(20) })).toBe(0);
  });

  it("contributes 0 for a team missing from results, without throwing", () => {
    expect(computeScore(["a", "b"], { a: result(1) })).toBe(3);
  });

  it("sums points across multiple teams", () => {
    // "a" predicted 1st, actual 1st -> 3. "b" predicted 2nd, actual 2nd -> 3. "c" predicted 3rd, actual 10th -> 0.
    expect(computeScore(["a", "b", "c"], { a: result(1), b: result(2), c: result(10) })).toBe(6);
  });

  it("returns 0 for an empty ranking", () => {
    expect(computeScore([], { a: result(1) })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/scoring.test.ts`
Expected: FAIL — `Cannot find module './scoring'` (neither file exists yet).

- [ ] **Step 3: Write the type and the implementation**

```typescript
// src/leaderboard/teamResultTypes.ts
export interface TeamResult {
  position: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
}
```

```typescript
// src/leaderboard/scoring.ts
import { TeamResult } from "./teamResultTypes";

export function computeScore(ranking: string[], results: Record<string, TeamResult>): number {
  let score = 0;
  ranking.forEach((teamId, index) => {
    const result = results[teamId];
    if (!result) return;
    const predictedPosition = index + 1;
    if (Math.abs(predictedPosition - result.position) < 3) {
      score += 3;
    }
  });
  return score;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/scoring.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/teamResultTypes.ts src/leaderboard/scoring.ts src/leaderboard/scoring.test.ts
git commit -m "Add TeamResult type and round-1 scoring function"
```

---

### Task 2: `useResults` hook

**Files:**
- Create: `src/leaderboard/useResults.ts`
- Test: `src/leaderboard/useResults.test.ts`

**Interfaces:**
- Consumes: `TeamResult` (Task 1), `db` from `../firebase`.
- Produces: `useResults(): { results: Record<string, TeamResult>; loading: boolean }`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/useResults.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useResults } from "./useResults";

describe("useResults", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty results map before any docs exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useResults());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual({});
  });

  it("keys results by doc id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "arsenal",
          data: () => ({ position: 1, points: 10, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 }),
        },
        {
          id: "barcelona",
          data: () => ({ position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 }),
        },
      ],
    });
    const { result } = renderHook(() => useResults());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results.arsenal.position).toBe(1);
    expect(result.current.results.barcelona.position).toBe(2);
  });

  it("stops loading and leaves results empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useResults());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load results", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/useResults.test.ts`
Expected: FAIL — `Cannot find module './useResults'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/leaderboard/useResults.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { TeamResult } from "./teamResultTypes";

export function useResults() {
  const [results, setResults] = useState<Record<string, TeamResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "results"))
      .then((snapshot) => {
        if (ignore) return;
        const next: Record<string, TeamResult> = {};
        snapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          next[docSnap.id] = docSnap.data() as TeamResult;
        });
        setResults(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load results", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { results, loading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/useResults.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/useResults.ts src/leaderboard/useResults.test.ts
git commit -m "Add useResults hook"
```

---

### Task 3: `usePlayers` hook

**Files:**
- Create: `src/leaderboard/usePlayers.ts`
- Test: `src/leaderboard/usePlayers.test.ts`

**Interfaces:**
- Consumes: `Profile` from `../profile/profileTypes`, `db` from `../firebase`.
- Produces: `Player extends Profile { uid: string }`, `usePlayers(): { players: Player[]; loading: boolean }`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/usePlayers.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePlayers } from "./usePlayers";

describe("usePlayers", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty list before any profiles exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => usePlayers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
  });

  it("maps each profile doc to a Player with uid set from the doc id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "uid1",
          data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }),
        },
      ],
    });
    const { result } = renderHook(() => usePlayers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
    ]);
  });

  it("stops loading and leaves players empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePlayers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load players", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/usePlayers.test.ts`
Expected: FAIL — `Cannot find module './usePlayers'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/leaderboard/usePlayers.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Profile } from "../profile/profileTypes";

export interface Player extends Profile {
  uid: string;
}

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "profiles"))
      .then((snapshot) => {
        if (ignore) return;
        setPlayers(
          snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
            uid: docSnap.id,
            ...(docSnap.data() as Profile),
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load players", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { players, loading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/usePlayers.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/usePlayers.ts src/leaderboard/usePlayers.test.ts
git commit -m "Add usePlayers hook"
```

---

### Task 4: `useLeaderboard` hook

**Files:**
- Create: `src/leaderboard/leaderboardTypes.ts`
- Create: `src/leaderboard/useLeaderboard.ts`
- Test: `src/leaderboard/useLeaderboard.test.ts`

**Interfaces:**
- Consumes: `useResults()` (Task 2), `computeScore` (Task 1), `Prediction` from `../predictions/predictionTypes`, `Profile` from `../profile/profileTypes`, `db` from `../firebase`.
- Produces: `LeaderboardEntry { uid: string; firstName: string; lastName: string; photoURL: string; points: number; ranking: string[] }`, `useLeaderboard(): { entries: LeaderboardEntry[]; loading: boolean }`. `entries` is sorted descending by `points`, includes only uids that have both a `predictions` doc and a `profiles` doc.

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/useLeaderboard.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLeaderboard } from "./useLeaderboard";

function mockCollections(overrides: {
  results?: { id: string; data: () => unknown }[];
  predictions?: { id: string; data: () => unknown }[];
  profiles?: { id: string; data: () => unknown }[];
}) {
  mockGetDocs.mockImplementation((ref: { name: string }) => {
    const docs = overrides[ref.name as "results" | "predictions" | "profiles"] ?? [];
    return Promise.resolve({ docs });
  });
}

describe("useLeaderboard", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty list when nobody has submitted a prediction", async () => {
    mockCollections({ results: [], predictions: [], profiles: [] });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });

  it("joins predictions with profiles and computes points from results", async () => {
    mockCollections({
      results: [{ id: "arsenal", data: () => ({ position: 1, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }) }],
      predictions: [
        { id: "uid1", data: () => ({ ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 }) },
      ],
      profiles: [
        { id: "uid1", data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }) },
      ],
    });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 3, ranking: ["arsenal"] },
    ]);
  });

  it("sorts entries descending by points", async () => {
    mockCollections({
      results: [
        { id: "arsenal", data: () => ({ position: 1, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }) },
        { id: "barcelona", data: () => ({ position: 20, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }) },
      ],
      predictions: [
        { id: "low", data: () => ({ ranking: ["barcelona"], submittedAt: 1, updatedAt: 1 }) },
        { id: "high", data: () => ({ ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 }) },
      ],
      profiles: [
        { id: "low", data: () => ({ firstName: "Low", lastName: "Scorer", photoURL: "l.png", createdAt: 1 }) },
        { id: "high", data: () => ({ firstName: "High", lastName: "Scorer", photoURL: "h.png", createdAt: 1 }) },
      ],
    });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.uid)).toEqual(["high", "low"]);
  });

  it("skips a prediction whose uid has no matching profile", async () => {
    mockCollections({
      results: [],
      predictions: [{ id: "orphan", data: () => ({ ranking: [], submittedAt: 1, updatedAt: 1 }) }],
      profiles: [],
    });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/useLeaderboard.test.ts`
Expected: FAIL — `Cannot find module './useLeaderboard'`.

- [ ] **Step 3: Write the type and the implementation**

```typescript
// src/leaderboard/leaderboardTypes.ts
export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  lastName: string;
  photoURL: string;
  points: number;
  ranking: string[];
}
```

```typescript
// src/leaderboard/useLeaderboard.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Prediction } from "../predictions/predictionTypes";
import { Profile } from "../profile/profileTypes";
import { useResults } from "./useResults";
import { computeScore } from "./scoring";
import { LeaderboardEntry } from "./leaderboardTypes";

export function useLeaderboard() {
  const { results, loading: resultsLoading } = useResults();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resultsLoading) return;
    let ignore = false;
    Promise.all([getDocs(collection(db, "predictions")), getDocs(collection(db, "profiles"))])
      .then(([predictionsSnapshot, profilesSnapshot]) => {
        if (ignore) return;
        const profilesById = new Map<string, Profile>();
        profilesSnapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          profilesById.set(docSnap.id, docSnap.data() as Profile);
        });
        const next: LeaderboardEntry[] = [];
        predictionsSnapshot.docs.forEach((docSnap: { id: string; data: () => unknown }) => {
          const profile = profilesById.get(docSnap.id);
          if (!profile) return;
          const prediction = docSnap.data() as Prediction;
          next.push({
            uid: docSnap.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            photoURL: profile.photoURL,
            points: computeScore(prediction.ranking, results),
            ranking: prediction.ranking,
          });
        });
        next.sort((a, b) => b.points - a.points);
        setEntries(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load leaderboard", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [results, resultsLoading]);

  return { entries, loading: loading || resultsLoading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/useLeaderboard.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/leaderboardTypes.ts src/leaderboard/useLeaderboard.ts src/leaderboard/useLeaderboard.test.ts
git commit -m "Add useLeaderboard hook"
```

---

### Task 5: `TeamTable` component

**Files:**
- Create: `src/leaderboard/TeamTable.tsx`
- Test: `src/leaderboard/TeamTable.test.tsx`

**Interfaces:**
- Consumes: `TEAMS` from `../predictions/teams`, `TeamResult` (Task 1).
- Produces: `TeamTable({ results: Record<string, TeamResult> })` — a React component with no other exports.

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/TeamTable.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TeamTable } from "./TeamTable";
import { TEAMS } from "../predictions/teams";

describe("TeamTable", () => {
  it("renders every team at 0 points, alphabetically, with no sort controls when results is empty", () => {
    render(<TeamTable results={{}} />);
    const rows = screen.getAllByRole("row").slice(1); // drop header row
    expect(rows).toHaveLength(TEAMS.length);
    expect(screen.getByText(TEAMS[0].name)).toBeInTheDocument();
    expect(screen.queryAllByText("0")).toHaveLength(TEAMS.length);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a sortable table defaulting to position order when results is populated", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[1].id]: { position: 1, points: 10, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 },
          [TEAMS[0].id]: { position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 },
        }}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(TEAMS[1].name);
    expect(rows[1]).toHaveTextContent(TEAMS[0].name);
  });

  it("re-sorts when a column header is clicked", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[1].id]: { position: 1, points: 3, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 },
          [TEAMS[0].id]: { position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 },
        }}
      />
    );
    fireEvent.click(screen.getByText("Puan"));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(TEAMS[0].name); // 9 points, now first
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/TeamTable.test.tsx`
Expected: FAIL — `Cannot find module './TeamTable'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/leaderboard/TeamTable.tsx
import { useState } from "react";
import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";

type SortKey = "position" | "points" | "goalDifference" | "goalsFor" | "goalsAgainst";

interface TeamTableProps {
  results: Record<string, TeamResult>;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "position", label: "Sıra" },
  { key: "points", label: "Puan" },
  { key: "goalDifference", label: "Averaj" },
  { key: "goalsFor", label: "Attığı" },
  { key: "goalsAgainst", label: "Yediği" },
];

export function TeamTable({ results }: TeamTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const hasResults = Object.keys(results).length > 0;

  if (!hasResults) {
    return (
      <table>
        <thead>
          <tr>
            <th>Takım</th>
            <th>Puan</th>
          </tr>
        </thead>
        <tbody>
          {TEAMS.map((team) => (
            <tr key={team.id}>
              <td>{team.name}</td>
              <td>0</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const sorted = [...TEAMS].sort((a, b) => {
    const ra = results[a.id];
    const rb = results[b.id];
    if (!ra || !rb) return 0;
    if (sortKey === "position") return ra.position - rb.position;
    return rb[sortKey] - ra[sortKey];
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Takım</th>
          {COLUMNS.map((col) => (
            <th key={col.key}>
              <button onClick={() => setSortKey(col.key)}>{col.label}</button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((team) => {
          const result = results[team.id];
          return (
            <tr key={team.id}>
              <td>{team.name}</td>
              <td>{result?.position ?? "-"}</td>
              <td>{result?.points ?? "-"}</td>
              <td>{result?.goalDifference ?? "-"}</td>
              <td>{result?.goalsFor ?? "-"}</td>
              <td>{result?.goalsAgainst ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/TeamTable.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/TeamTable.tsx src/leaderboard/TeamTable.test.tsx
git commit -m "Add TeamTable component"
```

---

### Task 6: `PlayerList` component

**Files:**
- Create: `src/leaderboard/PlayerList.tsx`
- Test: `src/leaderboard/PlayerList.test.tsx`

**Interfaces:**
- Consumes: `Player` (Task 3), `LeaderboardEntry` (Task 4), `TEAMS` from `../predictions/teams`.
- Produces: `PlayerList({ players: Player[]; showFullNames: boolean; leaderboardEntries?: LeaderboardEntry[] })`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/PlayerList.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlayerList } from "./PlayerList";
import { TEAMS } from "../predictions/teams";

const players = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 2 },
];

describe("PlayerList", () => {
  it("shows only first names and a count when showFullNames is false", () => {
    render(<PlayerList players={players} showFullNames={false} />);
    expect(screen.getByText(/2 kişi katıldı/)).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.queryByText(/Lovelace/)).not.toBeInTheDocument();
  });

  it("shows full names when showFullNames is true and no leaderboardEntries are given", () => {
    render(<PlayerList players={players} showFullNames={true} />);
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Alan Turing/)).toBeInTheDocument();
    expect(screen.queryByText(/tahmin göndermedi/)).not.toBeInTheDocument();
  });

  it("reveals a submitter's ranking when leaderboardEntries includes them", () => {
    render(
      <PlayerList
        players={players}
        showFullNames={true}
        leaderboardEntries={[
          { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 3, ranking: [TEAMS[0].id] },
        ]}
      />
    );
    expect(screen.getByText(new RegExp(TEAMS[0].name))).toBeInTheDocument();
  });

  it("marks a player as not having submitted when leaderboardEntries doesn't include them", () => {
    render(<PlayerList players={players} showFullNames={true} leaderboardEntries={[]} />);
    const items = screen.getAllByText(/tahmin göndermedi/);
    expect(items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/PlayerList.test.tsx`
Expected: FAIL — `Cannot find module './PlayerList'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/leaderboard/PlayerList.tsx
import { Player } from "./usePlayers";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TEAMS } from "../predictions/teams";

interface PlayerListProps {
  players: Player[];
  showFullNames: boolean;
  leaderboardEntries?: LeaderboardEntry[];
}

function rankingNames(ranking: string[]): string {
  return ranking.map((id) => TEAMS.find((t) => t.id === id)?.name ?? id).join(", ");
}

export function PlayerList({ players, showFullNames, leaderboardEntries }: PlayerListProps) {
  if (!showFullNames) {
    return (
      <p>
        {players.length} kişi katıldı: {players.map((p) => p.firstName).join(", ")}
      </p>
    );
  }

  const entryByUid = new Map((leaderboardEntries ?? []).map((e) => [e.uid, e]));

  return (
    <ul>
      {players.map((player) => {
        const entry = entryByUid.get(player.uid);
        return (
          <li key={player.uid}>
            <img src={player.photoURL} alt="" />
            {player.firstName} {player.lastName}
            {leaderboardEntries && (entry ? ` — ${rankingNames(entry.ranking)}` : " — tahmin göndermedi")}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/PlayerList.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/PlayerList.tsx src/leaderboard/PlayerList.test.tsx
git commit -m "Add PlayerList component"
```

---

### Task 7: `LeaderboardTable` component

**Files:**
- Create: `src/leaderboard/LeaderboardTable.tsx`
- Test: `src/leaderboard/LeaderboardTable.test.tsx`

**Interfaces:**
- Consumes: `LeaderboardEntry` (Task 4).
- Produces: `LeaderboardTable({ entries: LeaderboardEntry[] })`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/leaderboard/LeaderboardTable.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeaderboardTable } from "./LeaderboardTable";

describe("LeaderboardTable", () => {
  it("shows a fallback message when there are no entries", () => {
    render(<LeaderboardTable entries={[]} />);
    expect(screen.getByText("Henüz tahmin gönderen olmadı.")).toBeInTheDocument();
  });

  it("renders each entry with name and points, in the given order", () => {
    render(
      <LeaderboardTable
        entries={[
          { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] },
          { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", points: 6, ranking: [] },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ada Lovelace");
    expect(items[0]).toHaveTextContent("9 puan");
    expect(items[1]).toHaveTextContent("Alan Turing");
    expect(items[1]).toHaveTextContent("6 puan");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leaderboard/LeaderboardTable.test.tsx`
Expected: FAIL — `Cannot find module './LeaderboardTable'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/leaderboard/LeaderboardTable.tsx
import { LeaderboardEntry } from "./leaderboardTypes";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return <p>Henüz tahmin gönderen olmadı.</p>;
  }
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.uid}>
          <img src={entry.photoURL} alt="" />
          {entry.firstName} {entry.lastName} — {entry.points} puan
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leaderboard/LeaderboardTable.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/LeaderboardTable.tsx src/leaderboard/LeaderboardTable.test.tsx
git commit -m "Add LeaderboardTable component"
```

---

### Task 8: Wire real content into `HomePage`

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useVisibilityState()` (existing, `src/state/useVisibilityState.ts`), `useResults()` (Task 2), `usePlayers()` (Task 3), `useLeaderboard()` (Task 4), `TeamTable` (Task 5), `PlayerList` (Task 6), `LeaderboardTable` (Task 7).
- Produces: `HomePage()` — no props, no new exports beyond the component itself.

This task also fixes `App.test.tsx`, which renders `HomePage` without mocking `firebase/firestore` — once `HomePage` reads real collections via the hooks above, that integration test needs the same Firestore mock the unit-level tests use, or it will hang/error against an unconfigured `db`.

- [ ] **Step 1: Write the failing test for `HomePage`**

Replace the full contents of `src/pages/HomePage.test.tsx`:

```typescript
// src/pages/HomePage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseVisibilityState = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseLeaderboard = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));

vi.mock("../leaderboard/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../leaderboard/TeamTable", () => ({
  TeamTable: () => <div>team-table</div>,
}));

vi.mock("../leaderboard/PlayerList", () => ({
  PlayerList: ({ showFullNames, leaderboardEntries }: { showFullNames: boolean; leaderboardEntries?: unknown[] }) => (
    <div>
      player-list:{String(showFullNames)}:{leaderboardEntries ? "revealed" : "hidden"}
    </div>
  ),
}));

vi.mock("../leaderboard/LeaderboardTable", () => ({
  LeaderboardTable: () => <div>leaderboard-table</div>,
}));

const emptyResults = { results: {}, loading: false };
const emptyPlayers = { players: [], loading: false };
const emptyLeaderboard = { entries: [], loading: false };

describe("HomePage", () => {
  beforeEach(() => {
    mockUseResults.mockReturnValue(emptyResults);
    mockUsePlayers.mockReturnValue(emptyPlayers);
    mockUseLeaderboard.mockReturnValue(emptyLeaderboard);
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("NST_NLI: shows the team table and a first-names-only player list, no leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:false:hidden")).toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it("NST_LI: shows the team table and a full-name player list, no leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:true:hidden")).toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it("ST_NLI: shows the team table, a revealing full-name player list, and the leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("ST_NLI");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:true:revealed")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });

  it("ST_LI: shows the team table, a revealing full-name player list, and the leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:true:revealed")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — current `HomePage` doesn't call any of the mocked hooks, so `screen.getByText("team-table")` etc. won't be found.

- [ ] **Step 3: Rewrite `HomePage`**

Replace the full contents of `src/pages/HomePage.tsx`:

```tsx
// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { VisibilityState } from "../state/visibilityState";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../leaderboard/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { TeamTable } from "../leaderboard/TeamTable";
import { PlayerList } from "../leaderboard/PlayerList";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";

const BLURB: Record<VisibilityState, string> = {
  NST_NLI: "[Placeholder] Not started, not logged in: mission blurb + sign-up countdown go here.",
  NST_LI: "[Placeholder] Not started, logged in: prediction submission countdown + rules go here.",
  ST_NLI: "[Placeholder] Started, not logged in: mission blurb + sign-up-closed notice + match days remaining go here.",
  ST_LI: "[Placeholder] Started, logged in: same as above, plus chat access.",
};

export function HomePage() {
  const state = useVisibilityState();
  const started = state === "ST_NLI" || state === "ST_LI";

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (resultsLoading || playersLoading || leaderboardLoading) return null;

  return (
    <div>
      <p>{BLURB[state]}</p>
      <TeamTable results={results} />
      <PlayerList
        players={players}
        showFullNames={state !== "NST_NLI"}
        leaderboardEntries={started ? entries : undefined}
      />
      {started && <LeaderboardTable entries={entries} />}
    </div>
  );
}
```

Note: `useLeaderboard` is called unconditionally on every render regardless of `started`, because React's Rules of Hooks forbid conditional hook calls — the pre-tournament read is cheap (small collection, empty most of the time) and its result is simply unused until `started` is true.

- [ ] **Step 4: Run the `HomePage` test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Fix `App.test.tsx`'s now-broken integration tests**

`App.test.tsx` renders the real `HomePage` (not a mock), so it now needs `firebase/firestore` mocked too, or the new hooks' `getDocs` calls will hang against an unconfigured `db`. Add the mock and update `./firebase`'s mock to include `db`. In `src/App.test.tsx`, replace:

```typescript
vi.mock("./firebase", () => ({ auth: {} }));
```

with:

```typescript
vi.mock("./firebase", () => ({ auth: {}, db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  getDocs: () => Promise.resolve({ docs: [] }),
}));
```

(Placed alongside the existing `vi.mock("firebase/auth", ...)` block, before the `describe`.) No other changes needed in this file — `HomePage`'s placeholder blurb text is unchanged, so the existing `/Not started, not logged in/` assertion still passes; the hooks now simply resolve to empty collections instead of hanging.

- [ ] **Step 6: Run the full test suite to verify nothing else broke**

Run: `npx vitest run`
Expected: PASS — all test files green, including `src/App.test.tsx` and `src/pages/HomePage.test.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/App.test.tsx
git commit -m "Wire team table, player list, and leaderboard into HomePage"
```

---

### Task 9: Wire `LeaderboardPage`

**Files:**
- Modify: `src/pages/LeaderboardPage.tsx`
- Create: `src/pages/LeaderboardPage.test.tsx`

**Interfaces:**
- Consumes: `useLeaderboard()` (Task 4), `LeaderboardTable` (Task 7).
- Produces: `LeaderboardPage()` — no props.

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/LeaderboardPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";

const mockUseLeaderboard = vi.fn();

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

describe("LeaderboardPage", () => {
  it("renders nothing while the leaderboard is loading", () => {
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: true });
    const { container } = render(<LeaderboardPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the leaderboard table once loaded", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/9 puan/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LeaderboardPage.test.tsx`
Expected: FAIL — current `LeaderboardPage` always renders the generic `PlaceholderPage` text, not real leaderboard content.

- [ ] **Step 3: Rewrite `LeaderboardPage`**

Replace the full contents of `src/pages/LeaderboardPage.tsx`:

```tsx
// src/pages/LeaderboardPage.tsx
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";

export function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  if (loading) return null;
  return <LeaderboardTable entries={entries} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/LeaderboardPage.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LeaderboardPage.tsx src/pages/LeaderboardPage.test.tsx
git commit -m "Wire real leaderboard content into LeaderboardPage"
```

---

### Task 10: Firestore rules for `results`, full verification, and manual review

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task closes out the unit.

- [ ] **Step 1: Create `firebase.json` and `.firebaserc`**

Neither file exists in this repo yet — `firestore.rules` and `storage.rules` were deployed by pasting into the Firebase console (see unit 2), not via CLI. `firebase deploy --only firestore:rules` needs both files to know which project and which local file to deploy. Create `.firebaserc`:

```json
{
  "projects": {
    "default": "kupatakipucl"
  }
}
```

Create `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 2: Add the `results` rule**

In `firestore.rules`, inside `match /databases/{database}/documents { ... }`, add a new block alongside the existing `profiles`/`surveyResponses`/`predictions` ones:

```
// Team results feed the team table and score computation (SPEC.md §3, §8b).
// Manually maintained (no admin UI, SPEC.md §7b) — every signed-in user can
// read, nobody can write through the app; updates happen via direct
// Firestore edits (Mert asking Claude), same as the no-admin-panel model.
match /results/{teamId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

- [ ] **Step 3: Deploy the updated rules**

Run: `npx firebase deploy --only firestore:rules --project kupatakipucl`
Expected: `+  Deploy complete!` — the CLI is already authenticated as `thisisfootballstuff@gmail.com` from this session's earlier setup, so this doesn't need a console paste like unit 2 did.

- [ ] **Step 4: Verify the deployed rules match the local file**

```bash
TOKEN=$(gcloud auth print-access-token)
curl -s -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: kupatakipucl" "https://firebaserules.googleapis.com/v1/projects/kupatakipucl/releases/cloud.firestore"
```

Expected: a `rulesetName` with a `createTime`/`updateTime` from just now — confirms the release actually updated, not just that the deploy command exited 0.

- [ ] **Step 5: Run the full test suite and type-check**

Run: `npx vitest run`
Expected: PASS — every test file green, including all new `src/leaderboard/*.test.ts(x)` files and the updated `src/pages/HomePage.test.tsx`, `src/App.test.tsx`, `src/pages/LeaderboardPage.test.tsx`.

Run: `npx tsc -b`
Expected: no output, exit code 0.

- [ ] **Step 6: Seed test `results` data and manually verify in the browser**

This step needs Mert (visual confirmation), same as unit 2's Firebase verification step. Seed two or three teams into `results` (via the Firebase console's Firestore data tab, or ask Claude to do it via the REST API used elsewhere this session), then in the running dev server (`npm run dev`):

- Visit `/` with no `?debugDate=` — confirm the team table shows all teams at 0 points (or the seeded ones at their real position if `results` isn't empty — see the exact empty-vs-populated behavior in Task 5).
- Visit `/?debugDate=2026-09-09` — confirm the team table becomes sortable, the player list reveals rankings (or "tahmin göndermedi" for non-submitters), and the leaderboard renders with points matching `scoring.ts`'s rule.
- Visit `/leaderboard` directly at the same debug date — confirm it shows the same ranked list as the `HomePage` leaderboard section.

- [ ] **Step 7: Commit**

```bash
git add firebase.json .firebaserc firestore.rules
git commit -m "Add Firestore rule for the results collection"
```

---

## Summary

10 tasks: scoring function → results hook → players hook → leaderboard hook → three presentational components (TeamTable, PlayerList, LeaderboardTable) → HomePage wiring (+ App.test.tsx fix) → LeaderboardPage wiring → Firestore rules + full verification. Each task after the first three is independently testable against the previous tasks' exact interfaces (`TeamResult`, `computeScore`, `Player`, `LeaderboardEntry`), so a reviewer can approve/reject any task without needing the others to be re-explained.
