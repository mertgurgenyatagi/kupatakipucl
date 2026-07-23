# Stats Page Redesign (7+6 Widget Grid) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the stats page as a two-frame, 13-widget grid (7 tournament-stat widgets left, 6 participant-stat widgets right) per `docs/superpowers/specs/2026-07-23-stats-page-design.md`, which supersedes the original scoped build.

**Architecture:** Small, focused pure functions (`ageBuckets.ts`, `surveyAggregates.ts`, `teamAgreement.ts`, plus the existing `teamBias.ts`) turn raw Firestore-shaped data into ready-to-render rows/bars. Two new generic presentational components (`RankedStatList`, `BarChartWidget`) plus one trivial one (`NumberBox`) render all 13 widgets — no per-widget one-off components. One new hook (`useSurveyResponses`) mirrors the existing `usePlayers` "fetch whole collection" shape. `StatsPage.tsx` is pure composition: four hooks in, computed props out, no logic of its own.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library, Tailwind v4 (hand-rolled CSS bars, no charting library), existing `Frame`/`Avatar` primitives.

## Global Constraints

- All-Turkish UI text in rendered output (except the pre-existing shared blocked-page string, matching every other gated page).
- No new Firestore collections or security rules — `surveyResponses`'s read rule already allows any signed-in user (loosened 2026-07-23 for the participant popup); the `pageAccess.ts` change is what keeps that safe for this page.
- Hand-rolled CSS only for the bar charts — no charting library dependency (confirmed absent from `package.json`; would be the only one in this codebase).
- A team/category with no resolvable data is excluded from its ranking entirely (`computeTeamBias`'s existing convention) — except the four always-complete-scale distributions (age buckets, football-knowledge 1-7, Messi/Ronaldo, and this rule does NOT apply to Süper Lig, which omits zero-vote options on purpose per spec).
- Widget sizing: general grid shape (2 columns per frame) is fixed, but individual widget height is NOT forced uniform — content dictates height (spec explicitly rescinds "approximately same size").
- **Visual polish**: SPEC.md §9a requires the `impeccable` skill be invoked "when actual frontend design work starts (layout, components, visual identity pass)" — not deferred to later. Whoever executes Tasks 5-8 (the visual components and the page itself) should invoke it then, unlike the original `2026-07-20-stats.md` plan which explicitly deferred all visual polish.
- Windows/PowerShell environment — shell commands below are plain `git`/`npx` invocations that work identically in the Bash tool or PowerShell.

---

### Task 1: `useSurveyResponses` hook

**Files:**
- Create: `src/predictions/useSurveyResponses.ts`
- Test: `src/predictions/useSurveyResponses.test.ts`

**Interfaces:**
- Consumes: `SurveyResponse` from `./surveyTypes` (existing: `{ age, footballKnowledge, messiOrRonaldo, superLigTeam, uclTeam, device, submittedAt }`).
- Produces: `SurveyResponseEntry` (`SurveyResponse & { uid: string }`), `useSurveyResponses(): { responses: SurveyResponseEntry[]; loading: boolean }` — every later task that needs all participants' survey answers consumes this.

- [ ] **Step 1: Write the failing test**

```typescript
// src/predictions/useSurveyResponses.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useSurveyResponses } from "./useSurveyResponses";

describe("useSurveyResponses", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty list before any responses exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useSurveyResponses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.responses).toEqual([]);
  });

  it("maps each response doc to a SurveyResponseEntry with uid set from the doc id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "uid1",
          data: () => ({
            age: 24,
            footballKnowledge: 6,
            messiOrRonaldo: "messi",
            superLigTeam: "Galatasaray",
            uclTeam: null,
            device: "both",
            submittedAt: 1,
          }),
        },
      ],
    });
    const { result } = renderHook(() => useSurveyResponses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.responses).toEqual([
      {
        uid: "uid1",
        age: 24,
        footballKnowledge: 6,
        messiOrRonaldo: "messi",
        superLigTeam: "Galatasaray",
        uclTeam: null,
        device: "both",
        submittedAt: 1,
      },
    ]);
  });

  it("stops loading and leaves responses empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useSurveyResponses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.responses).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load survey responses", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/predictions/useSurveyResponses.test.ts`
Expected: FAIL — cannot find module `./useSurveyResponses`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/predictions/useSurveyResponses.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";

export interface SurveyResponseEntry extends SurveyResponse {
  uid: string;
}

export function useSurveyResponses() {
  const [responses, setResponses] = useState<SurveyResponseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getDocs(collection(db, "surveyResponses"))
      .then((snapshot) => {
        if (ignore) return;
        setResponses(
          snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
            uid: docSnap.id,
            ...(docSnap.data() as SurveyResponse),
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load survey responses", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { responses, loading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/predictions/useSurveyResponses.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/predictions/useSurveyResponses.ts src/predictions/useSurveyResponses.test.ts
git commit -m "Add useSurveyResponses hook for aggregate survey stats"
```

---

### Task 2: Age bucketing (`ageBuckets.ts`)

**Files:**
- Create: `src/stats/ageBuckets.ts`
- Test: `src/stats/ageBuckets.test.ts`

**Interfaces:**
- Consumes: nothing (plain `number[]` in).
- Produces: `AGE_BUCKETS: string[]` (fixed order: `<20, 20, 21, 22, 23, 24, 25, 26, 27, >27`), `bucketAge(age: number): string`, `computeAgeDistribution(ages: number[]): { label: string; count: number }[]` — always all 10 buckets, in order, zero included. `StatsPage.tsx` (Task 8) calls this with `responses.map(r => r.age)`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/stats/ageBuckets.test.ts
import { describe, it, expect } from "vitest";
import { AGE_BUCKETS, bucketAge, computeAgeDistribution } from "./ageBuckets";

describe("bucketAge", () => {
  it("buckets ages below 20 into '<20'", () => {
    expect(bucketAge(19)).toBe("<20");
    expect(bucketAge(15)).toBe("<20");
  });

  it("buckets ages above 27 into '>27'", () => {
    expect(bucketAge(28)).toBe(">27");
    expect(bucketAge(40)).toBe(">27");
  });

  it("buckets ages 20-27 into their own exact-number bucket", () => {
    expect(bucketAge(20)).toBe("20");
    expect(bucketAge(27)).toBe("27");
    expect(bucketAge(23)).toBe("23");
  });
});

describe("computeAgeDistribution", () => {
  it("always returns all 10 buckets in fixed order, even with no input", () => {
    const out = computeAgeDistribution([]);
    expect(out.map((b) => b.label)).toEqual(AGE_BUCKETS);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });

  it("counts ages into their correct bucket", () => {
    const out = computeAgeDistribution([19, 20, 20, 30]);
    expect(out.find((b) => b.label === "<20")?.count).toBe(1);
    expect(out.find((b) => b.label === "20")?.count).toBe(2);
    expect(out.find((b) => b.label === ">27")?.count).toBe(1);
    expect(out.find((b) => b.label === "21")?.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stats/ageBuckets.test.ts`
Expected: FAIL — cannot find module `./ageBuckets`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/stats/ageBuckets.ts
export const AGE_BUCKETS = ["<20", "20", "21", "22", "23", "24", "25", "26", "27", ">27"];

export function bucketAge(age: number): string {
  if (age < 20) return "<20";
  if (age > 27) return ">27";
  return String(age);
}

export interface AgeBucketCount {
  label: string;
  count: number;
}

export function computeAgeDistribution(ages: number[]): AgeBucketCount[] {
  const counts = new Map<string, number>(AGE_BUCKETS.map((label) => [label, 0]));
  ages.forEach((age) => {
    const bucket = bucketAge(age);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  return AGE_BUCKETS.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stats/ageBuckets.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/stats/ageBuckets.ts src/stats/ageBuckets.test.ts
git commit -m "Add age bucketing for the stats page age-distribution widget"
```

---

### Task 3: Survey aggregates (`surveyAggregates.ts`)

**Files:**
- Create: `src/stats/surveyAggregates.ts`
- Test: `src/stats/surveyAggregates.test.ts`

**Interfaces:**
- Consumes: `MessiOrRonaldo` from `../predictions/surveyTypes`.
- Produces: `computeFootballKnowledgeDistribution(levels: number[]): { label: string; count: number }[]` (always levels "1".."7", zero included), `computeMessiRonaldoDistribution(picks: MessiOrRonaldo[]): { label: string; count: number }[]` (always "Messi"/"Ronaldo"/"Fikrim yok", zero included), `computeSuperLigDistribution(teams: string[]): { label: string; count: number }[]` (only teams with ≥1 vote, sorted by count descending). `StatsPage.tsx` (Task 8) calls each with the corresponding field pre-extracted from `responses`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/stats/surveyAggregates.test.ts
import { describe, it, expect } from "vitest";
import {
  computeFootballKnowledgeDistribution,
  computeMessiRonaldoDistribution,
  computeSuperLigDistribution,
} from "./surveyAggregates";

describe("computeFootballKnowledgeDistribution", () => {
  it("always returns all 7 levels in order, even with no input", () => {
    const out = computeFootballKnowledgeDistribution([]);
    expect(out.map((b) => b.label)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });

  it("counts each level correctly", () => {
    const out = computeFootballKnowledgeDistribution([4, 4, 7]);
    expect(out.find((b) => b.label === "4")?.count).toBe(2);
    expect(out.find((b) => b.label === "7")?.count).toBe(1);
    expect(out.find((b) => b.label === "1")?.count).toBe(0);
  });
});

describe("computeMessiRonaldoDistribution", () => {
  it("always returns all 3 options in a fixed order, even with no input", () => {
    const out = computeMessiRonaldoDistribution([]);
    expect(out.map((b) => b.label)).toEqual(["Messi", "Ronaldo", "Fikrim yok"]);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });

  it("counts each pick correctly", () => {
    const out = computeMessiRonaldoDistribution(["messi", "messi", "no-opinion"]);
    expect(out.find((b) => b.label === "Messi")?.count).toBe(2);
    expect(out.find((b) => b.label === "Fikrim yok")?.count).toBe(1);
    expect(out.find((b) => b.label === "Ronaldo")?.count).toBe(0);
  });
});

describe("computeSuperLigDistribution", () => {
  it("returns an empty array for no input", () => {
    expect(computeSuperLigDistribution([])).toEqual([]);
  });

  it("omits teams with zero votes and sorts by count descending", () => {
    const out = computeSuperLigDistribution(["Galatasaray", "Fenerbahçe", "Galatasaray", "Galatasaray"]);
    expect(out).toEqual([
      { label: "Galatasaray", count: 3 },
      { label: "Fenerbahçe", count: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stats/surveyAggregates.test.ts`
Expected: FAIL — cannot find module `./surveyAggregates`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/stats/surveyAggregates.ts
import { MessiOrRonaldo } from "../predictions/surveyTypes";

export interface CountBar {
  label: string;
  count: number;
}

const FOOTBALL_KNOWLEDGE_LEVELS = [1, 2, 3, 4, 5, 6, 7];

export function computeFootballKnowledgeDistribution(levels: number[]): CountBar[] {
  const counts = new Map<number, number>(FOOTBALL_KNOWLEDGE_LEVELS.map((level) => [level, 0]));
  levels.forEach((level) => {
    counts.set(level, (counts.get(level) ?? 0) + 1);
  });
  return FOOTBALL_KNOWLEDGE_LEVELS.map((level) => ({
    label: String(level),
    count: counts.get(level) ?? 0,
  }));
}

const MESSI_OR_RONALDO_OPTIONS: MessiOrRonaldo[] = ["messi", "ronaldo", "no-opinion"];
const MESSI_OR_RONALDO_LABELS: Record<MessiOrRonaldo, string> = {
  messi: "Messi",
  ronaldo: "Ronaldo",
  "no-opinion": "Fikrim yok",
};

export function computeMessiRonaldoDistribution(picks: MessiOrRonaldo[]): CountBar[] {
  const counts = new Map<MessiOrRonaldo, number>(MESSI_OR_RONALDO_OPTIONS.map((o) => [o, 0]));
  picks.forEach((pick) => {
    counts.set(pick, (counts.get(pick) ?? 0) + 1);
  });
  return MESSI_OR_RONALDO_OPTIONS.map((pick) => ({
    label: MESSI_OR_RONALDO_LABELS[pick],
    count: counts.get(pick) ?? 0,
  }));
}

export function computeSuperLigDistribution(teams: string[]): CountBar[] {
  const counts = new Map<string, number>();
  teams.forEach((team) => {
    counts.set(team, (counts.get(team) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stats/surveyAggregates.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add src/stats/surveyAggregates.ts src/stats/surveyAggregates.test.ts
git commit -m "Add football-knowledge/Messi-Ronaldo/Super Lig distribution stats"
```

---

### Task 4: Team agreement (`teamAgreement.ts`)

**Files:**
- Create: `src/stats/teamAgreement.ts`
- Test: `src/stats/teamAgreement.test.ts`

**Interfaces:**
- Consumes: `TEAMS` from `../predictions/teams`.
- Produces: `TeamAgreement { teamId: string; teamName: string; spread: number }`, `computeTeamAgreement(rankings: string[][]): TeamAgreement[]` — standard deviation of predicted position per team across all rankings that include it, sorted ascending (lowest spread/most-agreed first). Teams never ranked by anyone are excluded. No `results` needed — pure prediction data. `StatsPage.tsx` (Task 8) reads `out.slice(0, 3)` for most-agreed and `out.slice(-3).reverse()` for most-disagreed.

- [ ] **Step 1: Write the failing test**

```typescript
// src/stats/teamAgreement.test.ts
import { describe, it, expect } from "vitest";
import { computeTeamAgreement } from "./teamAgreement";
import { TEAMS } from "../predictions/teams";

const teamA = TEAMS[0].id;
const teamB = TEAMS[1].id;

describe("computeTeamAgreement", () => {
  it("gives a spread of 0 when every ranking places the team at the same position", () => {
    const out = computeTeamAgreement([[teamA], [teamA]]);
    const entry = out.find((t) => t.teamId === teamA);
    expect(entry?.spread).toBe(0);
  });

  it("gives a higher spread when predicted positions vary more", () => {
    // teamA: index 0 in both -> positions [1, 1] -> spread 0.
    // teamB: index 1 then index 4 -> positions [2, 5] -> spread > 0.
    const out = computeTeamAgreement([
      [teamA, teamB],
      [teamA, TEAMS[2].id, TEAMS[3].id, TEAMS[4].id, teamB],
    ]);
    const a = out.find((t) => t.teamId === teamA);
    const b = out.find((t) => t.teamId === teamB);
    expect(a?.spread).toBe(0);
    expect(b!.spread).toBeGreaterThan(0);
  });

  it("sorts ascending by spread (most agreed-upon first)", () => {
    const out = computeTeamAgreement([
      [teamA, teamB],
      [teamA, TEAMS[2].id, TEAMS[3].id, TEAMS[4].id, teamB],
    ]);
    expect(out[0].teamId).toBe(teamA);
  });

  it("excludes a team that was never ranked by anyone", () => {
    const out = computeTeamAgreement([[teamA]]);
    expect(out.find((t) => t.teamId === teamB)).toBeUndefined();
  });

  it("returns an empty array for no rankings", () => {
    expect(computeTeamAgreement([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stats/teamAgreement.test.ts`
Expected: FAIL — cannot find module `./teamAgreement`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/stats/teamAgreement.ts
import { TEAMS } from "../predictions/teams";

export interface TeamAgreement {
  teamId: string;
  teamName: string;
  spread: number;
}

export function computeTeamAgreement(rankings: string[][]): TeamAgreement[] {
  const agreements: TeamAgreement[] = [];

  TEAMS.forEach((team) => {
    const positions: number[] = [];
    rankings.forEach((ranking) => {
      const index = ranking.indexOf(team.id);
      if (index === -1) return;
      positions.push(index + 1);
    });
    if (positions.length === 0) return;

    const mean = positions.reduce((sum, p) => sum + p, 0) / positions.length;
    const variance = positions.reduce((sum, p) => sum + (p - mean) ** 2, 0) / positions.length;
    agreements.push({ teamId: team.id, teamName: team.name, spread: Math.sqrt(variance) });
  });

  return agreements.sort((a, b) => a.spread - b.spread);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stats/teamAgreement.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/stats/teamAgreement.ts src/stats/teamAgreement.test.ts
git commit -m "Add team-agreement (predicted-position spread) stat"
```

---

### Task 5: `RankedStatList` component (and retire `StatWidget.tsx`'s dead render function)

**Files:**
- Create: `src/stats/RankedStatList.tsx`
- Test: `src/stats/RankedStatList.test.tsx`
- Modify: `src/leaderboard/StatWidget.tsx` (delete the unused `StatWidget()` render function and `initials()` helper; keep `StatRow`/`StatWidgetSpec`/`STAT_WIDGETS`)

**Interfaces:**
- Consumes: `Avatar`/`AvatarFallback` from `@/components/ui/avatar`, `TeamCrest` from `../leaderboard/TeamCrest`, `cn` from `@/lib/utils`.
- Produces: `RankedRow { key: string; name: string; value: string; fill?: string; teamId?: string }`, `RankedStatList({ label, rows }: { label: string; rows: RankedRow[] }): JSX.Element` — every left-column widget in `StatsPage.tsx` (Task 8) renders through this. When `teamId` is set, the row shows the real `TeamCrest`; otherwise it shows a solid-fill initials avatar (`fill` required in that case).

First, confirm nothing outside this file currently renders the component we're about to delete:

- [ ] **Step 1: Confirm `StatWidget` (the function) has no live consumers**

Search the codebase for `StatWidget` and `STAT_WIDGETS` (e.g. with the Grep tool, pattern `StatWidget|STAT_WIDGETS`, path `src`). Expected: only three kinds of hits — `StatWidget.tsx`'s own definitions, `teamDossier.ts`/`TeamPopup.tsx` importing the type-only `StatRow`, and this plan's own StatsPage.tsx (Task 8, not yet written). No other file should import or render the `StatWidget` function or `STAT_WIDGETS` array directly — this is what makes deleting the render function safe.

- [ ] **Step 2: Write the failing test**

```typescript
// src/stats/RankedStatList.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RankedStatList } from "./RankedStatList";

describe("RankedStatList", () => {
  it("renders the label and each row's name and value", () => {
    render(
      <RankedStatList
        label="Gol Krallığı"
        rows={[
          { key: "a", name: "K. Demir", value: "11", fill: "bg-navy" },
          { key: "b", name: "A. Yıldız", value: "9", fill: "bg-silver" },
        ]}
      />
    );
    expect(screen.getByText("Gol Krallığı")).toBeInTheDocument();
    expect(screen.getByText("K. Demir")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("A. Yıldız")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("renders initials from the name when no teamId is given", () => {
    render(
      <RankedStatList
        label="Test"
        rows={[{ key: "a", name: "Kaan Aslan", value: "11", fill: "bg-navy" }]}
      />
    );
    expect(screen.getByText("KA")).toBeInTheDocument();
  });

  it("does not render name-initials when a teamId is given (uses the real crest instead)", () => {
    render(
      <RankedStatList
        label="Test"
        rows={[{ key: "ajax", name: "Kaan Aslan", value: "+2.0", teamId: "ajax" }]}
      />
    );
    expect(screen.queryByText("KA")).not.toBeInTheDocument();
  });

  it("shows a fallback message when there are no rows", () => {
    render(<RankedStatList label="Boş" rows={[]} />);
    expect(screen.getByText("Boş")).toBeInTheDocument();
    expect(screen.getByText("Henüz hesaplanabilecek veri yok.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/stats/RankedStatList.test.tsx`
Expected: FAIL — cannot find module `./RankedStatList`.

- [ ] **Step 4: Write minimal implementation**

```tsx
// src/stats/RankedStatList.tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { cn } from "@/lib/utils";

export interface RankedRow {
  key: string;
  name: string;
  value: string;
  /** Solid-fill color for the initials avatar. Only read when `teamId` is
   *  absent — team rows use the real crest instead. */
  fill?: string;
  teamId?: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.replace(".", "").charAt(0))
    .join("")
    .toUpperCase();
}

export function RankedStatList({ label, rows }: { label: string; rows: RankedRow[] }) {
  return (
    <div className="flex min-h-0 flex-col">
      <span className="border-b border-border/40 pb-2 font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      {rows.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">Henüz hesaplanabilecek veri yok.</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="flex items-center gap-3 border-b border-border/50 py-1.5 last:border-0"
            >
              <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground tnum">
                {i + 1}
              </span>
              {row.teamId ? (
                <TeamCrest teamId={row.teamId} className="size-7 shrink-0" />
              ) : (
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className={cn("font-mono text-[0.58rem] text-navy-ink", row.fill)}>
                    {initials(row.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="min-w-0 flex-1 truncate font-display text-[0.8125rem] font-medium text-ink">
                {row.name}
              </span>
              <span className="shrink-0 font-mono text-[0.8125rem] font-bold text-ink tnum">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/stats/RankedStatList.test.tsx`
Expected: PASS (4/4)

- [ ] **Step 6: Retire `StatWidget.tsx`'s dead render function**

Replace the entire contents of `src/leaderboard/StatWidget.tsx` with:

```tsx
// src/leaderboard/StatWidget.tsx

/** Exported for reuse by TeamPopup.tsx's own per-team scorer/assister/rating
 *  lists, and by stats/RankedStatList.tsx (src/pages/StatsPage.tsx) — same
 *  row shape (rank, solid-fill avatar, name, value), just populated
 *  differently per consumer. */
export interface StatRow {
  name: string;
  value: string;
  fill: string;
}

interface StatWidgetSpec {
  key: string;
  title: string;
  rows: StatRow[];
}

/**
 * The three stat widgets from Mert's brief — best players by rating, top
 * scorers, top assisters. There is no footballer-level data model anywhere
 * in this app (a "Player" here is a pool participant, not a footballer), so
 * these run on dummy rows (Mert: "dummy data is fine, just fill in the
 * picture frames with solid colors") — fictional names, not real
 * footballers, so nobody mistakes this for tracked data before the real
 * feed exists.
 *
 * Rendered via stats/RankedStatList.tsx, the shared ranked-list sub-widget
 * used by all 7 left-column widgets on the stats page (2026-07-23
 * redesign) — this file now holds only the shared row shape and this
 * dummy data.
 */
export const STAT_WIDGETS: StatWidgetSpec[] = [
  {
    key: "rating",
    title: "En İyiler",
    rows: [
      { name: "A. Yıldız", value: "8.7", fill: "bg-navy" },
      { name: "K. Demir", value: "8.3", fill: "bg-silver" },
      { name: "E. Kaya", value: "7.9", fill: "bg-brass" },
    ],
  },
  {
    key: "scorers",
    title: "Gol Krallığı",
    rows: [
      { name: "K. Demir", value: "11", fill: "bg-navy" },
      { name: "A. Yıldız", value: "9", fill: "bg-silver" },
      { name: "B. Aydın", value: "7", fill: "bg-brass" },
    ],
  },
  {
    key: "assists",
    title: "Asist Krallığı",
    rows: [
      { name: "M. Şahin", value: "8", fill: "bg-navy" },
      { name: "E. Kaya", value: "6", fill: "bg-silver" },
      { name: "A. Yıldız", value: "5", fill: "bg-brass" },
    ],
  },
];
```

This drops the `meta`/`valueTone` fields along with the render function — both were only read by the deleted `StatWidget()` component, and today's approved design gives all 7 left-column widgets one consistent look with no per-widget "badge" value style and no secondary meta line.

- [ ] **Step 7: Run the full suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS — `teamDossier.test.ts`/`TeamPopup.test.tsx` (the only other consumers of `StatWidget.tsx`, via the still-present `StatRow` type) are unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/stats/RankedStatList.tsx src/stats/RankedStatList.test.tsx src/leaderboard/StatWidget.tsx
git commit -m "Add RankedStatList; retire StatWidget's unused render function"
```

---

### Task 6: `BarChartWidget` component

**Files:**
- Create: `src/stats/BarChartWidget.tsx`
- Test: `src/stats/BarChartWidget.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React.
- Produces: `BarDatum { label: string; count: number }`, `BarChartWidget({ label, bars }: { label: string; bars: BarDatum[] }): JSX.Element` — every right-column bar widget in `StatsPage.tsx` (Task 8) renders through this. Structurally compatible with `AgeBucketCount`/`CountBar` from Tasks 2-3 (same `{label, count}` shape) with no import needed between them.

- [ ] **Step 1: Write the failing test**

```typescript
// src/stats/BarChartWidget.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BarChartWidget } from "./BarChartWidget";

describe("BarChartWidget", () => {
  it("renders the label, each bar's label, and its count", () => {
    render(
      <BarChartWidget
        label="Yaş"
        bars={[
          { label: "20", count: 3 },
          { label: "21", count: 5 },
        ]}
      />
    );
    expect(screen.getByText("Yaş")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows a fallback message when there are no bars", () => {
    render(<BarChartWidget label="Yaş" bars={[]} />);
    expect(screen.getByText("Henüz hesaplanabilecek veri yok.")).toBeInTheDocument();
  });

  it("sizes each bar's fill relative to the largest count", () => {
    const { container } = render(
      <BarChartWidget
        label="Test"
        bars={[
          { label: "A", count: 2 },
          { label: "B", count: 4 },
        ]}
      />
    );
    const fills = container.querySelectorAll<HTMLElement>(".bg-brass");
    expect(fills[0].style.width).toBe("50%");
    expect(fills[1].style.width).toBe("100%");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stats/BarChartWidget.test.tsx`
Expected: FAIL — cannot find module `./BarChartWidget`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/stats/BarChartWidget.tsx
export interface BarDatum {
  label: string;
  count: number;
}

export function BarChartWidget({ label, bars }: { label: string; bars: BarDatum[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.count));
  return (
    <div className="flex min-h-0 flex-col">
      <span className="border-b border-border/40 pb-2 font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      {bars.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">Henüz hesaplanabilecek veri yok.</p>
      ) : (
        <div className="flex flex-col gap-2 pt-2">
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="shrink-0 whitespace-nowrap font-display text-[0.75rem] text-ink">
                {bar.label}
              </span>
              <div className="h-3 min-w-[2rem] flex-1 rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-brass"
                  style={{ width: `${(bar.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right font-mono text-[0.7rem] text-muted-foreground tnum">
                {bar.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stats/BarChartWidget.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/stats/BarChartWidget.tsx src/stats/BarChartWidget.test.tsx
git commit -m "Add BarChartWidget, hand-rolled CSS bar chart for the stats page"
```

---

### Task 7: `NumberBox` component

**Files:**
- Create: `src/stats/NumberBox.tsx`
- Test: `src/stats/NumberBox.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React.
- Produces: `NumberBox({ label, value }: { label: string; value: number }): JSX.Element` — the "number of participants" widget in `StatsPage.tsx` (Task 8) renders through this.

- [ ] **Step 1: Write the failing test**

```typescript
// src/stats/NumberBox.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NumberBox } from "./NumberBox";

describe("NumberBox", () => {
  it("renders the value and label", () => {
    render(<NumberBox label="Katılımcı Sayısı" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Katılımcı Sayısı")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stats/NumberBox.test.tsx`
Expected: FAIL — cannot find module `./NumberBox`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/stats/NumberBox.tsx
export function NumberBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-6">
      <span className="font-display text-4xl font-bold text-ink tnum">{value}</span>
      <span className="font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stats/NumberBox.test.tsx`
Expected: PASS (1/1)

- [ ] **Step 5: Commit**

```bash
git add src/stats/NumberBox.tsx src/stats/NumberBox.test.tsx
git commit -m "Add NumberBox for the participant-count widget"
```

---

### Task 8: `pageAccess.ts` change + `StatsPage.tsx` rewrite + delete superseded files

**Files:**
- Modify: `src/state/pageAccess.ts`
- Modify: `src/state/pageAccess.test.ts`
- Modify: `src/pages/StatsPage.tsx` (full rewrite)
- Modify: `src/pages/StatsPage.test.tsx` (full rewrite)
- Delete: `src/stats/AccuracyTable.tsx`, `src/stats/AccuracyTable.test.tsx`, `src/stats/accuracy.ts`, `src/stats/accuracy.test.ts`
- Delete: `src/stats/TeamBiasTable.tsx`, `src/stats/TeamBiasTable.test.tsx`

**Interfaces:**
- Consumes: `usePlayers` (`../profile/usePlayers`), `useSurveyResponses` (Task 1), `useLeaderboard`/`useResults` (existing), `computeTeamBias` (existing `../stats/teamBias`), `computeTeamAgreement` (Task 4), `computeAgeDistribution` (Task 2), `computeFootballKnowledgeDistribution`/`computeMessiRonaldoDistribution`/`computeSuperLigDistribution` (Task 3), `RankedStatList` (Task 5), `BarChartWidget` (Task 6), `NumberBox` (Task 7), `STAT_WIDGETS` (`../leaderboard/StatWidget`), `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` (`@/components/ui/frame`).
- Produces: the rebuilt `StatsPage` route component — nothing else depends on it.

- [ ] **Step 1: Update `pageAccess.ts`**

In `src/state/pageAccess.ts`, change:

```typescript
  stats: ["ST_NLI", "ST_LI"],
```

to:

```typescript
  stats: ["ST_LI"],
```

- [ ] **Step 2: Update `pageAccess.test.ts`**

Replace the entire contents of `src/state/pageAccess.test.ts` with:

```typescript
import { describe, it, expect } from "vitest";
import { isPageAllowed } from "./pageAccess";

describe("isPageAllowed", () => {
  it("blocks every gated page for NST_NLI", () => {
    expect(isPageAllowed("predictions", "NST_NLI")).toBe(false);
    expect(isPageAllowed("leaderboard", "NST_NLI")).toBe(false);
    expect(isPageAllowed("chat", "NST_NLI")).toBe(false);
    expect(isPageAllowed("forum", "NST_NLI")).toBe(false);
    expect(isPageAllowed("stats", "NST_NLI")).toBe(false);
  });

  it("allows predictions, chat and forum (not leaderboard/stats) for NST_LI", () => {
    expect(isPageAllowed("predictions", "NST_LI")).toBe(true);
    expect(isPageAllowed("chat", "NST_LI")).toBe(true);
    expect(isPageAllowed("forum", "NST_LI")).toBe(true);
    expect(isPageAllowed("leaderboard", "NST_LI")).toBe(false);
    expect(isPageAllowed("stats", "NST_LI")).toBe(false);
  });

  it("allows leaderboard and forum but not stats, chat or predictions for ST_NLI", () => {
    expect(isPageAllowed("leaderboard", "ST_NLI")).toBe(true);
    expect(isPageAllowed("forum", "ST_NLI")).toBe(true);
    expect(isPageAllowed("stats", "ST_NLI")).toBe(false);
    expect(isPageAllowed("chat", "ST_NLI")).toBe(false);
    expect(isPageAllowed("predictions", "ST_NLI")).toBe(false);
  });

  it("allows every gated page for ST_LI", () => {
    expect(isPageAllowed("predictions", "ST_LI")).toBe(true);
    expect(isPageAllowed("leaderboard", "ST_LI")).toBe(true);
    expect(isPageAllowed("chat", "ST_LI")).toBe(true);
    expect(isPageAllowed("forum", "ST_LI")).toBe(true);
    expect(isPageAllowed("stats", "ST_LI")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the pageAccess test to verify it passes**

Run: `npx vitest run src/state/pageAccess.test.ts`
Expected: PASS (4/4)

- [ ] **Step 4: Write the failing `StatsPage.test.tsx`**

Replace the entire contents of `src/pages/StatsPage.test.tsx` with:

```tsx
// src/pages/StatsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { StatsPage } from "./StatsPage";
import { TEAMS } from "../predictions/teams";

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseSurveyResponses = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));
vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));
vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));
vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));
vi.mock("../predictions/useSurveyResponses", () => ({
  useSurveyResponses: () => mockUseSurveyResponses(),
}));

vi.mock("../stats/RankedStatList", () => ({
  RankedStatList: ({ label, rows }: { label: string; rows: unknown[] }) => (
    <div>{label}:{rows.length}</div>
  ),
}));
vi.mock("../stats/BarChartWidget", () => ({
  BarChartWidget: ({ label, bars }: { label: string; bars: unknown[] }) => (
    <div>{label}:{bars.length}</div>
  ),
}));
vi.mock("../stats/NumberBox", () => ({
  NumberBox: ({ label, value }: { label: string; value: number }) => (
    <div>{label}:{value}</div>
  ),
}));

const teamA = TEAMS[0].id;
const teamB = TEAMS[1].id;

describe("StatsPage", () => {
  beforeEach(() => {
    mockUseLeaderboard.mockReturnValue({
      entries: [
        { uid: "u1", firstName: "Ada", lastName: "Lovelace", photoURL: "", points: 10, ranking: [teamA, teamB] },
        { uid: "u2", firstName: "Alan", lastName: "Turing", photoURL: "", points: 8, ranking: [teamB, teamA] },
      ],
      loading: false,
    });
    mockUseResults.mockReturnValue({
      results: {
        [teamA]: { position: 1, points: 9, goalDifference: 5, goalsFor: 5, goalsAgainst: 0 },
        [teamB]: { position: 2, points: 6, goalDifference: 2, goalsFor: 4, goalsAgainst: 2 },
      },
      loading: false,
    });
    mockUsePlayers.mockReturnValue({
      players: [
        { uid: "u1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
        { uid: "u2", firstName: "Alan", lastName: "Turing", photoURL: "", createdAt: 2 },
        { uid: "u3", firstName: "Grace", lastName: "Hopper", photoURL: "", createdAt: 3 },
      ],
      loading: false,
    });
    mockUseSurveyResponses.mockReturnValue({
      responses: [
        { uid: "u1", age: 22, footballKnowledge: 5, messiOrRonaldo: "messi", superLigTeam: "Galatasaray", uclTeam: null, device: "both", submittedAt: 1 },
        { uid: "u2", age: 30, footballKnowledge: 3, messiOrRonaldo: "ronaldo", superLigTeam: "Fenerbahçe", uclTeam: "Arsenal", device: "phone", submittedAt: 2 },
      ],
      loading: false,
    });
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<StatsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("blocks logged-out visitors even after the tournament has started (ST_NLI)", () => {
    mockUseVisibilityState.mockReturnValue("ST_NLI");
    render(<StatsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUsePlayers.mockReturnValue({ players: [], loading: true });
    const { container } = render(<StatsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all 7 tournament-stat widgets and 6 participant-stat widgets with computed data once loaded", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    render(<StatsPage />);

    // Left: 3 existing dummy widgets, always 3 rows each.
    expect(screen.getByText("En İyiler:3")).toBeInTheDocument();
    expect(screen.getByText("Gol Krallığı:3")).toBeInTheDocument();
    expect(screen.getByText("Asist Krallığı:3")).toBeInTheDocument();
    // Left: the 4 new team-based widgets. Both fixture teams have results
    // and are ranked by both participants, so every one of these resolves
    // to the same 2 teams (teamBias.test.ts/teamAgreement.test.ts cover the
    // actual sort/split correctness — this just checks the page wires the
    // right computed data into the right widget).
    expect(screen.getByText("Beklenti Üstü:2")).toBeInTheDocument();
    expect(screen.getByText("Beklenti Altı:2")).toBeInTheDocument();
    expect(screen.getByText("Hemfikir Olunanlar:2")).toBeInTheDocument();
    expect(screen.getByText("Tartışmalı Takımlar:2")).toBeInTheDocument();

    // Right: straight number box counts every signed-up profile, not just predictors.
    expect(screen.getByText("Katılımcı Sayısı:3")).toBeInTheDocument();
    // Right: age/knowledge/messi-ronaldo always show every fixed bucket/level/option.
    expect(screen.getByText("Yaş:10")).toBeInTheDocument();
    expect(screen.getByText("Futbol Bilgisi:7")).toBeInTheDocument();
    expect(screen.getByText("Messi mi Ronaldo mu?:3")).toBeInTheDocument();
    // Right: Süper Lig only shows the 2 teams actually picked (zero-vote omitted).
    expect(screen.getByText("Süper Lig Takımı:2")).toBeInTheDocument();
    // Right: UCL is placeholder data — constant regardless of responses.
    expect(screen.getByText("UCL Takımı:5")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: FAIL — the old `StatsPage.tsx` doesn't wire these hooks/labels.

- [ ] **Step 6: Rewrite `StatsPage.tsx`**

Replace the entire contents of `src/pages/StatsPage.tsx` with:

```tsx
// src/pages/StatsPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useSurveyResponses } from "../predictions/useSurveyResponses";
import { computeTeamBias } from "../stats/teamBias";
import { computeTeamAgreement } from "../stats/teamAgreement";
import { computeAgeDistribution } from "../stats/ageBuckets";
import {
  computeFootballKnowledgeDistribution,
  computeMessiRonaldoDistribution,
  computeSuperLigDistribution,
} from "../stats/surveyAggregates";
import { RankedStatList, RankedRow } from "../stats/RankedStatList";
import { BarChartWidget } from "../stats/BarChartWidget";
import { NumberBox } from "../stats/NumberBox";
import { STAT_WIDGETS } from "../leaderboard/StatWidget";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1100px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
const MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";
const WIDGET_GRID = "grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-y-auto p-4";

// UCL supported-team survey answer is still free text (about to become a
// select — see docs/superpowers/specs/2026-07-23-stats-page-design.md's
// follow-ups); no real read is wired up for it yet, so this widget runs on
// placeholder data, same spirit as StatWidget.tsx's existing dummy rows.
const UCL_TEAM_PLACEHOLDER = [
  { label: "Real Madrid", count: 9 },
  { label: "Barcelona", count: 7 },
  { label: "Arsenal", count: 5 },
  { label: "Galatasaray", count: 4 },
  { label: "Liverpool", count: 2 },
];

function formatSigned(value: number): string {
  return (value > 0 ? "+" : "") + value.toFixed(1);
}

export function StatsPage() {
  const state = useVisibilityState();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { responses, loading: responsesLoading } = useSurveyResponses();

  if (!isPageAllowed("stats", state)) {
    return (
      <div className="flex h-full flex-1 items-center px-5 sm:px-8 lg:px-12">
        <p className="font-display text-2xl text-muted-foreground italic">
          This section isn't available right now.
        </p>
      </div>
    );
  }

  if (leaderboardLoading || resultsLoading || playersLoading || responsesLoading) return null;

  const rankings = entries.map((entry) => entry.ranking);

  const bias = computeTeamBias(rankings, results);
  const overperformers = bias.slice(0, 3);
  const underperformers = bias.slice(-3).reverse();

  const agreement = computeTeamAgreement(rankings);
  const mostAgreed = agreement.slice(0, 3);
  const mostDisagreed = agreement.slice(-3).reverse();

  const overperformerRows: RankedRow[] = overperformers.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: formatSigned(t.averageDifference),
    teamId: t.teamId,
  }));
  const underperformerRows: RankedRow[] = underperformers.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: formatSigned(t.averageDifference),
    teamId: t.teamId,
  }));
  const agreedRows: RankedRow[] = mostAgreed.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: t.spread.toFixed(1),
    teamId: t.teamId,
  }));
  const disagreedRows: RankedRow[] = mostDisagreed.map((t) => ({
    key: t.teamId,
    name: t.teamName,
    value: t.spread.toFixed(1),
    teamId: t.teamId,
  }));

  const ageBars = computeAgeDistribution(responses.map((r) => r.age));
  const knowledgeBars = computeFootballKnowledgeDistribution(responses.map((r) => r.footballKnowledge));
  const messiRonaldoBars = computeMessiRonaldoDistribution(responses.map((r) => r.messiOrRonaldo));
  const superLigBars = computeSuperLigDistribution(responses.map((r) => r.superLigTeam));

  return (
    <div className={PAGE_SHELL}>
      <div className={MAIN_ROW}>
        <Frame className="min-h-0 lg:h-full">
          <FrameHeader tone="navy">
            <FrameTitle className="text-navy-ink">Turnuva İstatistikleri</FrameTitle>
          </FrameHeader>
          <FrameBody className={WIDGET_GRID}>
            {STAT_WIDGETS.map((spec) => (
              <RankedStatList
                key={spec.key}
                label={spec.title}
                rows={spec.rows.map((row, i) => ({ key: `${spec.key}-${i}`, ...row }))}
              />
            ))}
            <RankedStatList label="Beklenti Üstü" rows={overperformerRows} />
            <RankedStatList label="Beklenti Altı" rows={underperformerRows} />
            <RankedStatList label="Hemfikir Olunanlar" rows={agreedRows} />
            <RankedStatList label="Tartışmalı Takımlar" rows={disagreedRows} />
          </FrameBody>
        </Frame>
        <Frame className="min-h-0 lg:h-full">
          <FrameHeader tone="navy">
            <FrameTitle className="text-navy-ink">Katılımcı İstatistikleri</FrameTitle>
          </FrameHeader>
          <FrameBody className={WIDGET_GRID}>
            <NumberBox label="Katılımcı Sayısı" value={players.length} />
            <BarChartWidget label="Yaş" bars={ageBars} />
            <BarChartWidget label="Futbol Bilgisi" bars={knowledgeBars} />
            <BarChartWidget label="Messi mi Ronaldo mu?" bars={messiRonaldoBars} />
            <BarChartWidget label="Süper Lig Takımı" bars={superLigBars} />
            <BarChartWidget label="UCL Takımı" bars={UCL_TEAM_PLACEHOLDER} />
          </FrameBody>
        </Frame>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: PASS (4/4)

- [ ] **Step 8: Delete the superseded files**

```bash
git rm src/stats/AccuracyTable.tsx src/stats/AccuracyTable.test.tsx src/stats/accuracy.ts src/stats/accuracy.test.ts
git rm src/stats/TeamBiasTable.tsx src/stats/TeamBiasTable.test.tsx
```

- [ ] **Step 9: Run the full suite and typecheck**

Run: `npx vitest run`
Expected: PASS, no failures, no references to the deleted files remain (confirmed by Step 1 of Task 5 plus this being the only page that ever imported `AccuracyTable`/`TeamBiasTable`).

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/state/pageAccess.ts src/state/pageAccess.test.ts src/pages/StatsPage.tsx src/pages/StatsPage.test.tsx
git commit -m "Rewrite stats page as 7+6 widget grid; retire accuracy ranking"
```

---

## Self-Review Notes

- **Spec coverage**: all 13 widgets (Goals section, both lists) map to a task — 3 existing dummy widgets + 4 new team-based ones (Tasks 4-5, wired in Task 8) on the left; participant count + 4 real survey distributions + 1 placeholder (Tasks 1-3, 6-7, wired in Task 8) on the right. Page shell/access change (Task 8) covers the Architecture section's fixed-viewport/two-Frame/pageAccess requirements. Cleanup section covered by Task 8's deletions and Task 5's `StatWidget.tsx` trim.
- **Type consistency checked**: `RankedRow` (Task 5) is what Task 8 constructs and passes to `RankedStatList`; `BarDatum`/`CountBar`/`AgeBucketCount` (Tasks 2-3, 6) all use the identical `{label: string; count: number}` shape so Task 8 can pass any of them into `BarChartWidget` with no adapter needed — verified no naming drift between where each type is produced (Tasks 1-4) and where it's consumed (Task 8).
- **No placeholders**: every step has complete, runnable code; no "TBD"/"similar to Task N" shortcuts.
