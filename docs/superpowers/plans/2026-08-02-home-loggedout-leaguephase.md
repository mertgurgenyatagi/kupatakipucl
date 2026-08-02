# Home — Logged-Out League Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `loggedout_leaguephase` composition of Home — a 4-column bento (league table, upcoming fixtures + forum preview, hero carousel, participant standings) — replacing the generic `[Placeholder]` skeleton for that one `VisibilityState`.

**Architecture:** Extract `FixtureRow` out of `UpcomingMatchesDrawer` and build two new small components on top of it and `TeamCrest`/`qualificationBand` (`LeagueTableList`, `UpcomingMatchesPreview`); extend `RecentPostsPreview` for a nullable `uid`; reuse `HomeHero` and `LeaderboardTable` unchanged; compose all four into a new `HomeLandingLoggedOutStarted`, routed from `HomePage.tsx`.

**Tech Stack:** React 18 + TypeScript (strict), Tailwind v4, Vitest + React Testing Library, the existing `Frame`/`FrameHeader`/`FrameBody`/`FrameTitle` UI kit.

## Global Constraints

- Desktop-only — no responsive breakpoints in any new component (explicit instruction, this session).
- No new Firestore reads or collections — every hook used (`useResults`, `usePlayers`, `useLeaderboard`, `usePosts`) is already used elsewhere in the app.
- Turkish UI copy throughout, matching existing strings' tone.
- Every panel wrapped in the existing `Frame`/`FrameHeader`/`FrameBody`/`FrameTitle` chrome.
- "Cursorify" convention: `cursor-pointer` only on elements with a real click handler. The one deliberate exception is the upcoming-fixture rows, kept "clickable but does nothing" to match `UpcomingMatchesDrawer`'s existing, explicit convention.
- Shared "cotton" easing (`ease-[var(--ease-cotton)]`, `animate-cotton-rise` class) for entrance motion, matching every other bento-style page.
- TypeScript strict mode (repo-wide already) — no `any`.
- Every new/changed component gets a co-located `.test.tsx` (Vitest + React Testing Library, same conventions as existing test files in this repo).
- Design spec: `docs/superpowers/specs/2026-08-02-home-loggedout-leaguephase-design.md` — this plan implements it exactly; if anything here conflicts with that doc, the doc wins and this plan has a bug.

---

### Task 1: Extract `FixtureRow` out of `UpcomingMatchesDrawer`

**Files:**
- Create: `src/leaderboard/FixtureRow.tsx`
- Create: `src/leaderboard/FixtureRow.test.tsx`
- Create: `src/leaderboard/UpcomingMatchesDrawer.test.tsx`
- Modify: `src/leaderboard/UpcomingMatchesDrawer.tsx`

**Interfaces:**
- Produces: `FixtureRow({ fixture: Fixture, results: Record<string, TeamResult> }): JSX.Element` — a single fixture row (place · home crest+name · date/time · away crest+name · place), clickable-but-no-op on the row, each team's crest+name independently clickable-but-no-op too (stops propagation). `Fixture` comes from `../devpanel/fixtures`, `TeamResult` from `./teamResultTypes`.
- Consumes (Task 2): `UpcomingMatchesPreview` will import `FixtureRow` the same way `UpcomingMatchesDrawer` does below.

This is a pure extraction — the drawer's rendered output must be byte-identical before and after, just sourced from a shared component.

- [ ] **Step 1: Write the failing test for the new `FixtureRow` component**

```tsx
// src/leaderboard/FixtureRow.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FixtureRow } from "./FixtureRow";
import { Fixture } from "../devpanel/fixtures";

const fixture: Fixture = {
  id: "m1",
  matchday: 1,
  order: 1,
  homeTeamId: "ajax",
  awayTeamId: "arsenal",
  kickoffUtc: "2026-09-16T18:45:00.000Z",
};

describe("FixtureRow", () => {
  it("renders both teams' short names", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    expect(screen.getByText("AJA")).toBeInTheDocument();
    expect(screen.getByText("ARS")).toBeInTheDocument();
  });

  it("shows a dash for each team's current place when no result exists yet", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("shows each team's real current place when a result exists", () => {
    render(
      <FixtureRow
        fixture={fixture}
        results={{
          ajax: { position: 3, points: 9, goalDifference: 2, goalsFor: 5, goalsAgainst: 3 },
          arsenal: { position: 1, points: 12, goalDifference: 6, goalsFor: 10, goalsAgainst: 4 },
        }}
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("the row itself is clickable but has no observable click side effect", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    const [rowButton] = screen.getAllByRole("button");
    expect(() => fireEvent.click(rowButton)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/leaderboard/FixtureRow.test.tsx`
Expected: FAIL — `Cannot find module './FixtureRow'` (the file doesn't exist yet).

- [ ] **Step 3: Create `FixtureRow.tsx`, extracting the row markup verbatim out of `UpcomingMatchesDrawer.tsx`**

```tsx
// src/leaderboard/FixtureRow.tsx
import { type KeyboardEvent, type MouseEvent } from "react";
import { TEAM_BY_ID } from "../predictions/teams";
import { Fixture } from "../devpanel/fixtures";
import { TeamResult } from "./teamResultTypes";
import { TeamCrest } from "./TeamCrest";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Istanbul",
});
const TIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Istanbul",
});

// Home place · home crest-over-code | date/time | away crest-over-code ·
// away place — see UpcomingMatchesDrawer.tsx's original comment (git blame)
// for the layout history. Shared verbatim between the drawer and
// UpcomingMatchesPreview (Home's static 3-fixture widget) since 2026-08-02.
const ROW_GRID_COLUMNS = "1.25rem minmax(0,1fr) 5rem minmax(0,1fr) 1.25rem";

function place(results: Record<string, TeamResult>, teamId: string): string {
  const position = results[teamId]?.position;
  return position ? String(position) : "-";
}

/** Clickable, but intentionally does nothing yet — Mert's own spec: "clickable
 *  but does nothing." Reserved for a future match-detail view. */
function handleMatchClick() {}
function handleMatchKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleMatchClick();
  }
}

/** Its own clickable target broken out of the row's big clickable zone
 *  (stops propagation) — one object per Mert's spec, so the name underlines
 *  whenever any part of it, crest included, is hovered. */
function handleTeamClick(e: MouseEvent) {
  e.stopPropagation();
}

export function FixtureRow({
  fixture,
  results,
}: {
  fixture: Fixture;
  results: Record<string, TeamResult>;
}) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);

  return (
    <div className="h-24 px-2">
      {/* A div, not a <button> — a real <button> can't contain the
          home/away crest+name buttons below (invalid nesting). */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleMatchClick}
        onKeyDown={handleMatchKeyDown}
        className="grid h-full w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-color_hoverfill focus-visible:bg-color_hoverfill"
        style={{ gridTemplateColumns: ROW_GRID_COLUMNS }}
      >
        <span className="font-mono text-xs text-color_textsecondary tnum">
          {place(results, home.id)}
        </span>
        <button
          type="button"
          onClick={handleTeamClick}
          className="group flex cursor-pointer flex-col items-center gap-1"
        >
          <TeamCrest teamId={home.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {home.shortName}
          </span>
        </button>

        <span className="flex flex-col items-center justify-center leading-tight">
          <span className="font-mono text-sm text-color_text tnum">
            {DATE_FMT.format(kickoff)}
          </span>
          <span className="font-mono text-sm text-color_textsecondary tnum">
            {TIME_FMT.format(kickoff)}
          </span>
        </span>

        <button
          type="button"
          onClick={handleTeamClick}
          className="group flex cursor-pointer flex-col items-center gap-1"
        >
          <TeamCrest teamId={away.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {away.shortName}
          </span>
        </button>
        <span className="font-mono text-xs text-color_textsecondary tnum">
          {place(results, away.id)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/leaderboard/FixtureRow.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing regression test for the drawer, ahead of refactoring it**

`UpcomingMatchesDrawer.tsx` has no existing test file — this is the first one, added specifically to catch a broken extraction.

```tsx
// src/leaderboard/UpcomingMatchesDrawer.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";

vi.mock("../tournament/now", () => ({
  resolveNow: () => new Date("2026-08-01T00:00:00.000Z"),
}));

describe("UpcomingMatchesDrawer", () => {
  it("starts collapsed", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    expect(screen.getByRole("button", { name: "Yaklaşan maçları göster" })).toBeInTheDocument();
  });

  it("opens to reveal upcoming fixtures rendered via FixtureRow", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    expect(screen.getByRole("button", { name: "Yaklaşan maçları kapat" })).toBeInTheDocument();
    // Real fixture short codes are 2-4 uppercase letters — at least one
    // fixture row must have rendered post-open.
    expect(screen.getAllByText(/^[A-Z]{2,4}$/).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/leaderboard/UpcomingMatchesDrawer.test.tsx`
Expected: FAIL if the drawer isn't yet refactored to use `FixtureRow` — actually at this point the drawer still works today (pre-refactor), so this may already PASS against the *current* implementation. That's fine and expected: it's a characterization test locking in today's behavior before Step 7 changes the implementation underneath it. Confirm it PASSES now, before touching `UpcomingMatchesDrawer.tsx`.

- [ ] **Step 7: Refactor `UpcomingMatchesDrawer.tsx` to render `FixtureRow` instead of its own inline markup**

Replace the file's imports and the fixture-mapping block. New full file:

```tsx
// src/leaderboard/UpcomingMatchesDrawer.tsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { getUpcomingFixtures } from "./upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { TeamResult } from "./teamResultTypes";
import { FixtureRow } from "./FixtureRow";

const INITIAL_COUNT = 10;
const BATCH_SIZE = 10;
const LOAD_DELAY_MS = 550;
const SCROLL_THRESHOLD_PX = 32;
const PANEL_ID = "upcoming-matches-panel";

/**
 * The hero carousel's bottom drawer. Collapsed, it's a full-width bar peeking
 * up from the card's bottom edge with just a chevron. Open, it grows upward
 * to 90% of the card's height (Mert: "go up all the way until only the 10
 * percent headspace is left") — a fixed percentage of the card, not a
 * content-measured height, which is why this is hand-rolled with a plain
 * `open` boolean + CSS height transition rather than a Collapsible
 * primitive (those animate to *content* height, not an arbitrary
 * percentage of an ancestor).
 *
 * Shows real upcoming fixtures (kickoff still ahead of `now`, see
 * upcomingFixtures.ts) — not devMatches state, so this works identically for
 * a logged-out visitor in production, not just inside the dev panel. Ten are
 * loaded up front, however many tall rows fit in the 90%-height panel show
 * without scrolling, and scrolling to the bottom loads ten more at a time,
 * "Classic" infinite-scroll style, with a brief spinner standing in for a
 * fetch even though the full season's fixture list is already local.
 *
 * Per-fixture rendering lives in FixtureRow.tsx (shared with Home's static
 * UpcomingMatchesPreview, 2026-08-02) — this component owns only the
 * collapse/expand chrome and the infinite-scroll batching.
 */
export function UpcomingMatchesDrawer({
  results,
}: {
  results: Record<string, TeamResult>;
}) {
  const allUpcoming = useMemo(() => getUpcomingFixtures(resolveNow()), []);
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, []);

  const hasMore = visibleCount < allUpcoming.length;
  const shown = allUpcoming.slice(0, visibleCount);

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    if (loadingMore || !hasMore) return;
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > SCROLL_THRESHOLD_PX) return;

    setLoadingMore(true);
    loadTimer.current = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + BATCH_SIZE, allUpcoming.length));
      setLoadingMore(false);
    }, LOAD_DELAY_MS);
  }

  if (allUpcoming.length === 0) return null;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden transition-[height] duration-300 ease-[var(--ease-cotton)] ${open ? "h-[90%]" : "h-12"}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Yaklaşan maçları kapat" : "Yaklaşan maçları göster"}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-center rounded-t-[var(--radius-4xl)] border-t border-color_border1/70 bg-card text-color_textsecondary shadow-frame transition-colors duration-150 ease-[var(--ease-cotton)] hover:text-color_text"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>

      <div id={PANEL_ID} className="flex min-h-0 flex-1 flex-col bg-card">
        <div
          onScroll={handleScroll}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-color_border1/70 pt-2"
        >
          {shown.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} results={results} />
          ))}

          {loadingMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-color_textsecondary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run both test files to verify everything still passes**

Run: `npx vitest run src/leaderboard/FixtureRow.test.tsx src/leaderboard/UpcomingMatchesDrawer.test.tsx`
Expected: PASS (all tests, drawer behavior unchanged)

- [ ] **Step 9: Commit**

```bash
git add src/leaderboard/FixtureRow.tsx src/leaderboard/FixtureRow.test.tsx src/leaderboard/UpcomingMatchesDrawer.tsx src/leaderboard/UpcomingMatchesDrawer.test.tsx
git commit -m "Extract FixtureRow out of UpcomingMatchesDrawer

Pure extraction, no behavior change — sets up a shared piece for the
new Home widget (UpcomingMatchesPreview) to reuse instead of
duplicating the crest/date/place markup."
```

---

### Task 2: `UpcomingMatchesPreview` — static 3-fixture widget

**Files:**
- Create: `src/leaderboard/UpcomingMatchesPreview.tsx`
- Create: `src/leaderboard/UpcomingMatchesPreview.test.tsx`

**Interfaces:**
- Consumes: `FixtureRow` (Task 1), `getUpcomingFixtures(now: Date): Fixture[]` from `./upcomingFixtures`, `resolveNow(): Date` from `../tournament/now`.
- Produces: `UpcomingMatchesPreview({ results: Record<string, TeamResult> }): JSX.Element` — consumed by Task 5.

- [ ] **Step 1: Write the failing test**

```tsx
// src/leaderboard/UpcomingMatchesPreview.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesPreview } from "./UpcomingMatchesPreview";

vi.mock("../tournament/now", () => ({
  resolveNow: () => new Date("2026-08-01T00:00:00.000Z"),
}));

describe("UpcomingMatchesPreview", () => {
  it("renders exactly 3 fixture rows (each row = 1 wrapper + 2 team buttons)", () => {
    render(<UpcomingMatchesPreview results={{}} />);
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("has no collapse/expand affordance anywhere", () => {
    render(<UpcomingMatchesPreview results={{}} />);
    expect(screen.queryByLabelText("Yaklaşan maçları göster")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Yaklaşan maçları kapat")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/leaderboard/UpcomingMatchesPreview.test.tsx`
Expected: FAIL — `Cannot find module './UpcomingMatchesPreview'`

- [ ] **Step 3: Implement**

```tsx
// src/leaderboard/UpcomingMatchesPreview.tsx
import { useMemo } from "react";
import { getUpcomingFixtures } from "./upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { TeamResult } from "./teamResultTypes";
import { FixtureRow } from "./FixtureRow";

const PREVIEW_COUNT = 3;

/**
 * Home's logged-out league-phase "upcoming matches" widget — the same
 * fixture rows as UpcomingMatchesDrawer, but always-open and fixed at 3: no
 * collapse chrome, no infinite scroll, no scroll container at all. Per
 * Mert's own convention (see FixtureRow.tsx), the rows stay clickable but
 * inert, consistent with the drawer everywhere else fixtures show up.
 */
export function UpcomingMatchesPreview({ results }: { results: Record<string, TeamResult> }) {
  const upcoming = useMemo(() => getUpcomingFixtures(resolveNow()).slice(0, PREVIEW_COUNT), []);

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <p className="text-center font-display text-sm text-color_textsecondary italic">
          Yaklaşan maç yok.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      {upcoming.map((fixture) => (
        <FixtureRow key={fixture.id} fixture={fixture} results={results} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/leaderboard/UpcomingMatchesPreview.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/UpcomingMatchesPreview.tsx src/leaderboard/UpcomingMatchesPreview.test.tsx
git commit -m "Add UpcomingMatchesPreview, a static 3-fixture Home widget

Reuses FixtureRow (extracted in the previous commit) with no drawer
chrome — built for Home's logged-out league-phase composition."
```

---

### Task 3: `RecentPostsPreview` — nullable `uid`

**Files:**
- Modify: `src/forum/RecentPostsPreview.tsx`
- Modify: `src/forum/RecentPostsPreview.test.tsx`

**Interfaces:**
- `RecentPostsPreviewProps.uid` changes from `string` to `string | null`.
- No other prop changes. `onDeletePost`/`onSaveEdit` remain required but become structurally unreachable when `uid` is `null` (no behavior change needed there — they're only ever invoked via `ThreadPopup`'s own author check, and `ThreadPopup` already supports a nullable `uid`, per the 2026-08-02 Forum logged-out branch).

- [ ] **Step 1: Write the failing tests**

Add this new `describe` block at the end of `src/forum/RecentPostsPreview.test.tsx`, just before the final `describe("ForumPreviewFooter", ...)` block:

```tsx
describe("RecentPostsPreview — logged out (uid null)", () => {
  it("renders the like button disabled with a sign-in-prompt label", () => {
    renderPreview({ posts: [post({})], uid: null });
    const likeButton = screen.getByRole("button", { name: "Beğenmek için giriş yapmalısın" });
    expect(likeButton).toBeDisabled();
  });

  it("does not call onToggleLike when the disabled like button is clicked", () => {
    const onToggleLike = vi.fn();
    renderPreview({ posts: [post({})], uid: null, onToggleLike });
    fireEvent.click(screen.getByRole("button", { name: "Beğenmek için giriş yapmalısın" }));
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it("still shows the like count for a logged-out viewer", () => {
    renderPreview({
      posts: [post({})],
      uid: null,
      likesByPost: new Map([["p1", new Set(["someone-else"])]]),
    });
    const likeButton = screen.getByRole("button", { name: "Beğenmek için giriş yapmalısın" });
    expect(within(likeButton).getByText("1")).toBeInTheDocument();
  });

  it("the row itself still opens the thread popup for a logged-out viewer", () => {
    renderPreview({ posts: [post({ text: "Tıklanabilir" })], uid: null });
    fireEvent.click(screen.getByText("Tıklanabilir"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
```

(`within` and `vi` are already imported at the top of this file — no new imports needed.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/forum/RecentPostsPreview.test.tsx`
Expected: FAIL — TypeScript error (`uid` doesn't accept `null` yet) and/or the like button has no `disabled` attribute, no "Beğenmek için giriş yapmalısın" label.

- [ ] **Step 3: Widen the `uid` prop type**

In `src/forum/RecentPostsPreview.tsx`, change:

```tsx
interface RecentPostsPreviewProps {
  posts: PostWithId[];
  players: Player[];
  uid: string;
```

to:

```tsx
interface RecentPostsPreviewProps {
  posts: PostWithId[];
  players: Player[];
  uid: string | null;
```

- [ ] **Step 4: Guard the `liked` computation**

Change:

```tsx
const likedBy = likesByPost.get(post.id);
const liked = likedBy?.has(uid) ?? false;
const likeCount = likedBy?.size ?? 0;
```

to:

```tsx
const likedBy = likesByPost.get(post.id);
const liked = uid ? (likedBy?.has(uid) ?? false) : false;
const likeCount = likedBy?.size ?? 0;
```

- [ ] **Step 5: Gate the like button, matching `ThreadCard.tsx`'s established convention**

Change:

```tsx
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    onToggleLike(post.id);
  }}
  aria-pressed={liked}
  aria-label={liked ? "Beğeniyi geri al" : "Beğen"}
  className={cn(
    "-ml-1.5 flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent",
    liked ? "text-color_accent" : "text-color_textsecondary hover:text-color_accent"
  )}
>
```

to:

```tsx
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    if (uid) onToggleLike(post.id);
  }}
  disabled={!uid}
  aria-pressed={liked}
  aria-label={!uid ? "Beğenmek için giriş yapmalısın" : liked ? "Beğeniyi geri al" : "Beğen"}
  className={cn(
    "-ml-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent",
    !uid
      ? "cursor-default text-color_textsecondary"
      : liked
        ? "cursor-pointer text-color_accent"
        : "cursor-pointer text-color_textsecondary hover:text-color_accent"
  )}
>
```

(The `<Heart>` icon and count `<span>` inside stay exactly as they are.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/forum/RecentPostsPreview.test.tsx`
Expected: PASS (all existing tests plus the 4 new ones — existing tests use `uid="uid1"` and are unaffected)

- [ ] **Step 7: Commit**

```bash
git add src/forum/RecentPostsPreview.tsx src/forum/RecentPostsPreview.test.tsx
git commit -m "Widen RecentPostsPreview's uid to allow a logged-out viewer

Matches the like-button gating convention ThreadCard.tsx already
established for the full Forum page — disabled, distinct aria-label,
no cursor-pointer, count still visible. Needed so this widget can be
mounted on Home's logged-out league-phase page."
```

---

### Task 4: `LeagueTableList` — single-column standings widget

**Files:**
- Create: `src/leaderboard/LeagueTableList.tsx`
- Create: `src/leaderboard/LeagueTableList.test.tsx`

**Interfaces:**
- Consumes: `TEAMS` from `../predictions/teams`, `TeamResult` from `./teamResultTypes`, `qualificationBand` from `./qualification`, `TeamCrest` from `./TeamCrest`, `Frame`/`FrameBody` from `@/components/ui/frame`, `cn` from `@/lib/utils`.
- Produces: `LeagueTableList({ results: Record<string, TeamResult>, onSelectTeam?: (teamId: string) => void }): JSX.Element` — consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/leaderboard/LeagueTableList.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LeagueTableList } from "./LeagueTableList";
import { TEAMS } from "../predictions/teams";

describe("LeagueTableList", () => {
  it("renders all 36 teams as single rows with dashes when no results exist", () => {
    render(<LeagueTableList results={{}} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(TEAMS.length);
    expect(screen.getByText(TEAMS[0].name)).toBeInTheDocument();
    expect(rows[0].textContent).toContain("--");
  });

  it("sorts by real standings position when results exist, teams without a result trailing", () => {
    render(
      <LeagueTableList
        results={{
          [TEAMS[5].id]: { position: 1, points: 12, goalDifference: 5, goalsFor: 10, goalsAgainst: 5, matchesPlayed: 4 },
          [TEAMS[2].id]: { position: 2, points: 9, goalDifference: 3, goalsFor: 8, goalsAgainst: 5, matchesPlayed: 4 },
        }}
      />
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(TEAMS[5].name);
    expect(rows[1]).toHaveTextContent(TEAMS[2].name);
  });

  it("shows a direct-qualification tick for positions 1-8, a playoff tick for 9-24, and none for 25-36", () => {
    render(
      <LeagueTableList
        results={{
          [TEAMS[0].id]: { position: 1, points: 20, goalDifference: 10, goalsFor: 15, goalsAgainst: 5, matchesPlayed: 6 },
          [TEAMS[1].id]: { position: 10, points: 9, goalDifference: 1, goalsFor: 8, goalsAgainst: 7, matchesPlayed: 6 },
          [TEAMS[2].id]: { position: 30, points: 2, goalDifference: -8, goalsFor: 3, goalsAgainst: 11, matchesPlayed: 6 },
        }}
      />
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0].querySelector(".bg-color_accent")).toBeInTheDocument();
    expect(rows[1].querySelector(".bg-color_qualification")).toBeInTheDocument();
    expect(rows[2].querySelector(".bg-color_accent")).not.toBeInTheDocument();
    expect(rows[2].querySelector(".bg-color_qualification")).not.toBeInTheDocument();
  });

  it("calls onSelectTeam with the team id when a row is clicked", () => {
    const onSelectTeam = vi.fn();
    render(<LeagueTableList results={{}} onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByText(TEAMS[0].name));
    expect(onSelectTeam).toHaveBeenCalledWith(TEAMS[0].id);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/leaderboard/LeagueTableList.test.tsx`
Expected: FAIL — `Cannot find module './LeagueTableList'`

- [ ] **Step 3: Implement**

```tsx
// src/leaderboard/LeagueTableList.tsx
import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";
import { qualificationBand } from "./qualification";
import { TeamCrest } from "./TeamCrest";
import { Frame, FrameBody } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

interface LeagueTableListProps {
  results: Record<string, TeamResult>;
  /** Fires with a team's id when its row is clicked — opens TeamPopup, same
   *  as TeamTable's own click behavior. No phase gate: identical for
   *  started and not-started, matching TeamTable. */
  onSelectTeam?: (teamId: string) => void;
}

/**
 * Home's logged-out league-phase "league table" column — the same 36-team
 * standing as TeamTable, laid out as one tall scrollable list (one row per
 * team) instead of TeamTable's space-constrained two-half compact grid. Row
 * height is matched to LeaderboardTable's row rhythm (the participant
 * standings sitting alongside it in the same page) rather than TeamTable's
 * denser rows — see the 2026-08-02 design spec's "large items, as tall as
 * participants" note.
 */
export function LeagueTableList({ results, onSelectTeam }: LeagueTableListProps) {
  const hasResults = Object.keys(results).length > 0;

  const ordered = hasResults
    ? [...TEAMS].sort((a, b) => {
        const ra = results[a.id];
        const rb = results[b.id];
        if (!ra && !rb) return 0;
        if (!ra) return 1;
        if (!rb) return -1;
        return ra.position - rb.position;
      })
    : TEAMS;

  return (
    <Frame className="h-full animate-cotton-rise border-color_border1/35">
      <FrameBody>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 sm:px-3">
          <ul>
            {ordered.map((team, index) => {
              const result = results[team.id];
              const band = result ? qualificationBand(result.position) : null;
              return (
                <li
                  key={team.id}
                  onClick={() => onSelectTeam?.(team.id)}
                  style={{ animationDelay: `${Math.min(index * 16, 500)}ms` }}
                  className={cn(
                    "flex h-14 animate-cotton-rise cursor-pointer items-center gap-3 border-b border-color_border1/50 px-2 transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill",
                    !result && "opacity-55"
                  )}
                >
                  <span aria-hidden className="flex w-1 shrink-0 justify-center">
                    {band === "direct" && <span className="h-4 w-1 rounded-r-full bg-color_accent" />}
                    {band === "playoff" && <span className="h-4 w-1 rounded-r-full bg-color_qualification" />}
                  </span>
                  <span className="w-6 shrink-0 font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result ? String(result.position) : "--"}
                  </span>
                  <TeamCrest teamId={team.id} className="size-8 shrink-0" />
                  <span
                    className="min-w-0 flex-1 truncate font-display text-sm font-medium text-color_text"
                    title={team.name}
                  >
                    {team.name}
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result?.matchesPlayed ?? "-"}
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result?.goalsFor ?? "-"}
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tracking-tight text-color_textsecondary tnum">
                    {result?.goalsAgainst ?? "-"}
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-xs tracking-tight text-color_text tnum">
                    {result ? signed(result.goalDifference) : "-"}
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-xs font-bold tracking-tight text-color_text tnum">
                    {result?.points ?? "-"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </FrameBody>
    </Frame>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/leaderboard/LeagueTableList.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/LeagueTableList.tsx src/leaderboard/LeagueTableList.test.tsx
git commit -m "Add LeagueTableList, a tall single-column standings widget

Reuses TeamCrest and qualificationBand from the existing team table;
built for Home's logged-out league-phase composition, where the
league table sits beside LeaderboardTable and needs matching row
height rather than TeamTable's compact two-half layout."
```

---

### Task 5: `HomeLandingLoggedOutStarted` — the page composition

**Files:**
- Create: `src/home/HomeLandingLoggedOutStarted.tsx`
- Create: `src/home/HomeLandingLoggedOutStarted.test.tsx`

**Interfaces:**
- Consumes: `LeagueTableList` (Task 4), `UpcomingMatchesPreview` (Task 2), `RecentPostsPreview`/`ForumPreviewFooter` (Task 3, from `../forum/RecentPostsPreview`), `HomeHero` (`./HomeHero`, unchanged), `LeaderboardTable` (`../leaderboard/LeaderboardTable`, unchanged), `ParticipantPopup`/`TeamPopup` (`../leaderboard/ParticipantPopup` / `../leaderboard/TeamPopup`, unchanged), `usePosts` (`../forum/usePosts`), `buildLikesByPost` (`../forum/postLikes`), `assignRanks` (`../leaderboard/ranking`).
- Produces: `HomeLandingLoggedOutStarted({ results: Record<string, TeamResult>, players: Player[], entries: LeaderboardEntry[] }): JSX.Element` — consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/home/HomeLandingLoggedOutStarted.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomeLandingLoggedOutStarted } from "./HomeLandingLoggedOutStarted";

const mockUsePosts = vi.fn();

vi.mock("../forum/usePosts", () => ({
  usePosts: () => mockUsePosts(),
}));

vi.mock("../leaderboard/LeagueTableList", () => ({
  LeagueTableList: ({ onSelectTeam }: { onSelectTeam: (id: string) => void }) => (
    <button onClick={() => onSelectTeam("ajax")}>league-table-list</button>
  ),
}));

vi.mock("../leaderboard/UpcomingMatchesPreview", () => ({
  UpcomingMatchesPreview: () => <div>upcoming-preview</div>,
}));

vi.mock("../forum/RecentPostsPreview", () => ({
  RecentPostsPreview: ({
    uid,
    onSelectParticipant,
  }: {
    uid: string | null;
    onSelectParticipant: (uid: string) => void;
  }) => (
    <div>
      <span>forum-widget:{String(uid)}</span>
      <button onClick={() => onSelectParticipant("player-1")}>select-participant</button>
    </div>
  ),
  ForumPreviewFooter: () => <div>forum-footer</div>,
}));

vi.mock("./HomeHero", () => ({
  HomeHero: () => <div>home-hero</div>,
}));

vi.mock("../leaderboard/LeaderboardTable", () => ({
  LeaderboardTable: ({ onSelectEntry }: { onSelectEntry: (uid: string) => void }) => (
    <button onClick={() => onSelectEntry("player-1")}>leaderboard-table</button>
  ),
}));

vi.mock("../leaderboard/ParticipantPopup", () => ({
  ParticipantPopup: ({ ranked }: { ranked: { entry: { uid: string } } | null }) => (
    <div>participant-popup:{ranked ? ranked.entry.uid : "closed"}</div>
  ),
}));

vi.mock("../leaderboard/TeamPopup", () => ({
  TeamPopup: ({ teamId }: { teamId: string | null }) => <div>team-popup:{teamId ?? "closed"}</div>,
}));

const player = { uid: "player-1", firstName: "Ada", photoURL: "", createdAt: 1 };

describe("HomeLandingLoggedOutStarted", () => {
  beforeEach(() => {
    mockUsePosts.mockReturnValue({ posts: [], loading: false, refetch: vi.fn(), loadOlder: vi.fn(), hasMore: false });
  });

  it("renders nothing while posts are still loading", () => {
    mockUsePosts.mockReturnValue({ posts: [], loading: true, refetch: vi.fn(), loadOlder: vi.fn(), hasMore: false });
    const { container } = render(
      <HomeLandingLoggedOutStarted results={{}} players={[player]} entries={[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all four widgets once posts have loaded", () => {
    render(<HomeLandingLoggedOutStarted results={{}} players={[player]} entries={[]} />);
    expect(screen.getByText("league-table-list")).toBeInTheDocument();
    expect(screen.getByText("upcoming-preview")).toBeInTheDocument();
    expect(screen.getByText("forum-widget:null")).toBeInTheDocument();
    expect(screen.getByText("home-hero")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });

  it("selecting a team opens TeamPopup and closes ParticipantPopup", () => {
    render(<HomeLandingLoggedOutStarted results={{}} players={[player]} entries={[]} />);
    fireEvent.click(screen.getByText("league-table-list"));
    expect(screen.getByText("team-popup:ajax")).toBeInTheDocument();
    expect(screen.getByText("participant-popup:closed")).toBeInTheDocument();
  });

  it("selecting a participant (from the forum widget or the standings) opens ParticipantPopup and closes TeamPopup", () => {
    render(
      <HomeLandingLoggedOutStarted
        results={{}}
        players={[player]}
        entries={[{ uid: "player-1", firstName: "Ada", photoURL: "", points: 10, ranking: [] }]}
      />
    );
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:player-1")).toBeInTheDocument();
    expect(screen.getByText("team-popup:closed")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/home/HomeLandingLoggedOutStarted.test.tsx`
Expected: FAIL — `Cannot find module './HomeLandingLoggedOutStarted'`

- [ ] **Step 3: Implement**

```tsx
// src/home/HomeLandingLoggedOutStarted.tsx
import { useCallback, useMemo, useState } from "react";
import { usePosts } from "../forum/usePosts";
import { buildLikesByPost } from "../forum/postLikes";
import { assignRanks } from "../leaderboard/ranking";
import { LeagueTableList } from "../leaderboard/LeagueTableList";
import { UpcomingMatchesPreview } from "../leaderboard/UpcomingMatchesPreview";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { HomeHero } from "./HomeHero";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { Player } from "../profile/usePlayers";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";

interface HomeLandingLoggedOutStartedProps {
  results: Record<string, TeamResult>;
  players: Player[];
  entries: LeaderboardEntry[];
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Column widths are a first-pass estimate (design spec §3: "starting
// values, not pixel-locked") — col 1 widest for the league table, col 2
// narrower for its two stacked frames, col 3 a fixed 300px matching
// HomeHero's established width on logged-in Home, col 4 wide for standings.
const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[1.3fr_0.9fr_300px_1fr] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";
const CELL = "h-[26rem] lg:h-full animate-cotton-rise";

// This page never has a signed-in viewer (it's the loggedout_leaguephase
// composition specifically), so RecentPostsPreview's like/delete/edit
// callbacks are structurally unreachable here — the like button is
// disabled, and delete/edit only ever fire for a post's own author, which
// a null uid can never be.
function noop() {}

/**
 * Home, logged-out + league phase — the wireframe's 4-column bento: league
 * table | upcoming fixtures + forum preview | hero carousel | participant
 * standings. No banner/blurb/greeting above it (design spec: the wireframe
 * is literal). Desktop-only, no responsive breakpoints.
 */
export function HomeLandingLoggedOutStarted({ results, players, entries }: HomeLandingLoggedOutStartedProps) {
  const { posts, loading: postsLoading } = usePosts();
  const likesByPost = useMemo(() => buildLikesByPost(posts), [posts]);
  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
  }, []);

  if (postsLoading) return null;

  return (
    <div className={PAGE_SHELL}>
      <div className={CELL_ROW}>
        <LeagueTableList results={results} onSelectTeam={handleSelectTeam} />

        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          <Frame className="h-[13rem] animate-cotton-rise lg:h-1/2" style={{ animationDelay: "60ms" }}>
            <FrameHeader tone="navy">
              <FrameTitle className="text-base text-color_text sm:text-lg">Yaklaşan Maçlar</FrameTitle>
            </FrameHeader>
            <FrameBody>
              <UpcomingMatchesPreview results={results} />
            </FrameBody>
          </Frame>

          <Frame className="h-[13rem] animate-cotton-rise lg:h-1/2" style={{ animationDelay: "120ms" }}>
            <FrameHeader tone="navy">
              <FrameTitle className="text-base text-color_text sm:text-lg">Forum</FrameTitle>
            </FrameHeader>
            <FrameBody>
              <RecentPostsPreview
                posts={posts}
                players={players}
                uid={null}
                likesByPost={likesByPost}
                onToggleLike={noop}
                onSelectParticipant={handleSelectParticipant}
                onDeletePost={noop}
                onSaveEdit={noop}
                onRefetch={noop}
              />
              <ForumPreviewFooter />
            </FrameBody>
          </Frame>
        </div>

        <HomeHero className={CELL} style={{ animationDelay: "180ms" }} />

        <LeaderboardTable
          entries={entries}
          players={players}
          revealCorrectness
          onSelectEntry={handleSelectParticipant}
        />
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={(open) => {
          if (!open) setSelectedUid(null);
        }}
        onSelectTeam={handleSelectTeam}
        tournamentStarted
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={(open) => {
          if (!open) setSelectedTeamId(null);
        }}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        tournamentStarted
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/home/HomeLandingLoggedOutStarted.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/home/HomeLandingLoggedOutStarted.tsx src/home/HomeLandingLoggedOutStarted.test.tsx
git commit -m "Add HomeLandingLoggedOutStarted, the logged-out league-phase Home composition

Wires LeagueTableList, UpcomingMatchesPreview, RecentPostsPreview
(uid=null), HomeHero, and LeaderboardTable into the 4-column bento
from the design spec, with TeamPopup/ParticipantPopup cross-linked
exactly like LeaderboardPage's own wiring. Not yet routed from
HomePage — that's the next commit."
```

---

### Task 6: Route `loggedout_leaguephase` to the new composition

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `HomeLandingLoggedOutStarted` (Task 5).

- [ ] **Step 1: Write the failing test — replace the outdated `loggedout_leaguephase` test**

In `src/pages/HomePage.test.tsx`, add this mock alongside the existing `vi.mock` calls (near the `HomeLandingLoggedOut`/`LoggedInHome` mocks):

```tsx
vi.mock("../home/HomeLandingLoggedOutStarted", () => ({
  HomeLandingLoggedOutStarted: ({ players }: { players: unknown[] }) => (
    <div>home-landing-loggedout-started:{players.length}</div>
  ),
}));
```

Then replace this existing test:

```tsx
  it("loggedout_leaguephase: shows the team table, a revealing first-names-only player list (logged out), and the leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:false:revealed")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });
```

with:

```tsx
  it("loggedout_leaguephase: renders the dedicated started/logged-out landing page instead of the shared skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("home-landing-loggedout-started:1")).toBeInTheDocument();
    expect(screen.queryByText("team-table")).not.toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });
```

(The `loggedin_knockout` test right below it is untouched — that state still falls through to the shared skeleton.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — `loggedout_leaguephase` still renders `team-table`/`leaderboard-table` (the old shared-skeleton path), not `home-landing-loggedout-started:1`.

- [ ] **Step 3: Add the early return in `HomePage.tsx`**

Add the import:

```tsx
import { HomeLandingLoggedOutStarted } from "../home/HomeLandingLoggedOutStarted";
```

Add the new early return, directly after the existing `loggedin_notstarted` one:

```tsx
  if (state === "loggedin_notstarted") {
    return <LoggedInHome players={players} />;
  }
  if (state === "loggedout_leaguephase") {
    return <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} />;
  }
```

Remove the now-dead `loggedout_leaguephase` entry from the `BLURB` map (it can never be looked up again):

```tsx
const BLURB: Partial<Record<VisibilityState, string>> = {
  loggedin_leaguephase: STARTED_LOGGEDIN_BLURB,
  loggedout_preknockout: STARTED_LOGGEDOUT_BLURB,
  loggedin_preknockout: STARTED_LOGGEDIN_BLURB,
  loggedout_knockout: STARTED_LOGGEDOUT_BLURB,
  loggedin_knockout: STARTED_LOGGEDIN_BLURB,
};
```

- [ ] **Step 4: Run the full test file to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (all 5 tests, including the untouched `loggedin_knockout` one)

- [ ] **Step 5: Run the full test suite to check for regressions elsewhere**

Run: `npx vitest run`
Expected: PASS — no other test file references `loggedout_leaguephase`'s old shared-skeleton behavior.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "Route loggedout_leaguephase to HomeLandingLoggedOutStarted

The last of Home's two originally-unbuilt started states now has a
real composition instead of the generic [Placeholder] skeleton.
loggedin_leaguephase and both preknockout/knockout phases (in either
login state) are untouched — still the shared skeleton, separate
future work."
```

---

### Task 7: Manual verification

**Files:** none (no code changes — verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Force the target state via DevPanel**

Navigate to `/#/dev`, force phase to `leaguephase` and login state to logged-out (sign out first if a dev session is active).

- [ ] **Step 3: Verify the composition on Home (`/#/`)**

Confirm, visually or via a Playwright snapshot:
- All four columns render: league table (36 rows, one per team), upcoming-3 fixtures, forum preview + "Forumu Aç" link, hero carousel, participant standings.
- No banner/blurb/greeting above the 4-column row.
- Clicking a league-table row opens `TeamPopup`.
- Clicking a participant (from the forum widget's post rows, or a standings row) opens `ParticipantPopup`, showing first-name-only (per the existing name-privacy work).
- The forum widget's like button is visibly inert (no pointer cursor, no color change on hover).
- The upcoming-fixture rows show a pointer cursor on hover but produce no visible effect on click.
- Top nav shows Ana Sayfa, Puan Durumu, Forum, Hakkında (already correct, unchanged by this work) — confirm no regression.

- [ ] **Step 4: Confirm no regression on `loggedin_leaguephase`**

Force login state to logged-in with the same `leaguephase` phase. Confirm Home still shows the (unchanged) generic `[Placeholder]` skeleton — this work must not have touched that path.

- [ ] **Step 5: Confirm no regression on `/leaderboard`**

Navigate to `/#/leaderboard` in both logged-in and logged-out states. Confirm `TeamTable` and `UpcomingMatchesDrawer` (inside `LeaderboardHero`) still look and behave exactly as before — the `FixtureRow` extraction (Task 1) must be visually invisible there.

---

## Self-review notes

- **Spec coverage:** §1 (architecture) → Tasks 1, 2, 4. §2 (page composition) → Task 5. §3 (component specs) → Tasks 2, 3, 4. §4 (data wiring) → Task 5. §5 (testing, including the manual Playwright pass) → every task's test steps plus Task 7. All covered.
- **Placeholder scan:** none found — every step has real, complete code.
- **Type consistency:** `LeagueTableList`'s `onSelectTeam?: (teamId: string) => void` matches `TeamPopup`'s `onSelectTeam: (teamId: string) => void` call site in Task 5. `RecentPostsPreview`'s widened `uid: string | null` matches `HomeLandingLoggedOutStarted`'s `uid={null}` call site. `UpcomingMatchesPreview`'s and `LeagueTableList`'s `results` prop both take `Record<string, TeamResult>`, matching `HomeLandingLoggedOutStartedProps.results`. Confirmed consistent across all six tasks.
