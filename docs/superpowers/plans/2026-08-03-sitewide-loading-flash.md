# Sitewide Loading-Flash Elimination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate FOUT and blank-then-pop page loads sitewide, per the approved design spec at `docs/superpowers/specs/2026-08-03-sitewide-loading-flash-design.md`.

**Architecture:** A single `useFontsReady()` hook (moved from `AboutPage.tsx` into a shared `src/lib/useFontsReady.ts`) gets folded into `ProfileGate.tsx`, the one component that already blanks the whole app until auth/profile resolve — so no page, including the nav, ever paints in a fallback font. `HomePage.tsx`, `StatsPage.tsx`, and `PredictionsPage.tsx` swap their blank `return null` loading states for skeletons matching the convention `LeaderboardPage`/`ForumPage`/`ProfilePage` already use; `HomeLandingLoggedOutStarted.tsx`'s own nested `postsLoading` blank-return (a second flash point one level deeper, found while planning) gets replaced with an in-place forum skeleton instead. `AvatarImage` (shared by every avatar and team crest sitewide) and `ForumImageThumb` get a fade-in transition; `ForumImageThumb` also gets an `onError` fallback, since it's currently the only image category on the site with none.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind v4, Vitest + React Testing Library, `@base-ui/react` (Avatar primitive), Firebase (Firestore/Auth) — no new dependencies.

## Global Constraints

- Keep `npx tsc -b` and `npx vitest run` clean after every task.
- No `<link rel=preload>` for the web font — Vite fingerprints the font asset path at build time, so a static preload href would be wrong in production; rely on the `useFontsReady()` gate alone (spec's explicit decision).
- Do not touch `AppShell.tsx`'s nav conditionals (`{!loading && ...}`) — investigated during brainstorming and found not to reproduce; explicitly out of scope for this plan.
- Do not touch `HeroCarousel.tsx`, chat, presence, or the countdown — already correct or explicitly out of scope per the spec.
- New skeletons follow the existing idiom exactly: `aria-hidden`, `data-testid="<name>-skeleton"`, built from the real `Frame`/`Skeleton` primitives sized to roughly match the real layout — not pixel-perfect.
- Stage specific files when committing (never `git add -A`).

---

## Task 1: Extract `useFontsReady` into a shared hook

**Files:**
- Create: `src/lib/useFontsReady.ts`
- Create: `src/lib/useFontsReady.test.ts`

**Interfaces:**
- Produces: `useFontsReady(): boolean`, named export from `src/lib/useFontsReady.ts`. Task 2 imports this exact signature into `ProfileGate.tsx` and removes the local copy from `AboutPage.tsx`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/useFontsReady.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { useFontsReady } from "./useFontsReady";

describe("useFontsReady", () => {
  const originalFonts = (document as unknown as { fonts?: unknown }).fonts;

  afterEach(() => {
    if (originalFonts === undefined) {
      delete (document as unknown as { fonts?: unknown }).fonts;
    } else {
      (document as unknown as { fonts?: unknown }).fonts = originalFonts;
    }
  });

  it("returns true immediately when document.fonts doesn't exist", () => {
    delete (document as unknown as { fonts?: unknown }).fonts;
    const { result } = renderHook(() => useFontsReady());
    expect(result.current).toBe(true);
  });

  it("returns true immediately when fonts are already loaded", () => {
    (document as unknown as { fonts?: unknown }).fonts = { status: "loaded", ready: Promise.resolve() };
    const { result } = renderHook(() => useFontsReady());
    expect(result.current).toBe(true);
  });

  it("returns false until the fonts.ready promise resolves, then true", async () => {
    let resolveReady: () => void = () => {};
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    (document as unknown as { fonts?: unknown }).fonts = { status: "loading", ready: readyPromise };

    const { result } = renderHook(() => useFontsReady());
    expect(result.current).toBe(false);

    resolveReady();
    await waitFor(() => expect(result.current).toBe(true));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/useFontsReady.test.ts`
Expected: FAIL with "Cannot find module './useFontsReady'" (or similar — the module doesn't exist yet).

- [ ] **Step 3: Create `useFontsReady.ts`**

```ts
import { useEffect, useState } from "react";

/**
 * The standard signal for "the page's web font has actually finished
 * loading" — used to gate first paint sitewide (via ProfileGate) so no page
 * ever renders in a fallback font and then visibly snaps to the real one.
 * Returns `true` synchronously in any environment without `document.fonts`
 * (jsdom in tests included), so no test-only mocking is needed for it.
 */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(
    () => typeof document === "undefined" || !("fonts" in document) || document.fonts.status === "loaded"
  );
  useEffect(() => {
    if (ready || typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/useFontsReady.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/useFontsReady.ts src/lib/useFontsReady.test.ts
git commit -m "Extract useFontsReady into a shared hook"
```

---

## Task 2: Gate the whole app on fonts via `ProfileGate`, remove the local gate from `AboutPage`

**Files:**
- Modify: `src/profile/ProfileGate.tsx`
- Modify: `src/profile/ProfileGate.test.tsx`
- Modify: `src/pages/AboutPage.tsx`

**Interfaces:**
- Consumes: `useFontsReady(): boolean` from Task 1 (`src/lib/useFontsReady.ts`).

- [ ] **Step 1: Write the failing test**

In `src/profile/ProfileGate.test.tsx`, add the mock and a new test. Replace the existing mock block (lines 1-28) with:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { ProfileGate } from "./ProfileGate";

const mockUseAuth = vi.fn();
const mockUseProfile = vi.fn();
const mockUseSurveyResponse = vi.fn();
const mockUseFontsReady = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));

vi.mock("../predictions/useSurveyResponse", () => ({
  useSurveyResponse: (uid: string | null) => mockUseSurveyResponse(uid),
}));

vi.mock("../lib/useFontsReady", () => ({
  useFontsReady: () => mockUseFontsReady(),
}));

vi.mock("../signup/SignupFlow", () => ({
  SignupFlow: ({ uid, onDone }: { uid: string; onDone: () => void }) => (
    <div>
      <span>signup-flow:{uid}</span>
      <button onClick={onDone}>finish</button>
    </div>
  ),
}));
```

Then add `mockUseFontsReady.mockReturnValue(true);` as the first line inside every existing `it(...)` body (all six of them), matching this file's existing style of setting every mock explicitly per test. Finally, add one new test at the end of the `describe` block:

```tsx
  it("renders nothing while fonts are not ready yet, even once auth/profile have resolved", () => {
    mockUseFontsReady.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseProfile.mockReturnValue(noProfile);
    mockUseSurveyResponse.mockReturnValue(noSurvey);
    const { container } = render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(container).toBeEmptyDOMElement();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/profile/ProfileGate.test.tsx`
Expected: FAIL — `Cannot find module '../lib/useFontsReady'` (the hook isn't wired into `ProfileGate.tsx` yet, so the mock has nothing to intercept... actually since the mock path doesn't need the real file to exist to be `vi.mock`ed, the more likely failure is the new "renders nothing while fonts are not ready" test failing because `ProfileGate` doesn't check `fontsReady` yet, so it renders `app-content` instead of nothing).

- [ ] **Step 3: Update `ProfileGate.tsx`**

Replace the full file contents:

```tsx
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./useProfile";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { useFontsReady } from "../lib/useFontsReady";
import { SignupFlow } from "../signup/SignupFlow";

/**
 * Blocks the rest of the app — including AppShell's own nav chrome — until
 * the site's web font has actually finished loading (see useFontsReady),
 * then until a signed-in user has both a profile *and* a survey response —
 * the quiz moved to be mandatory right after sign-up (PAGEMAP_SPEC.md), so a
 * profile alone is no longer enough to let someone through.
 *
 * Deliberately does *not* treat "has a profile but no survey yet" as a
 * resumable state — abandoning mid-quiz (closing the tab, reloading)
 * cancels the whole signup rather than picking back up later (Mert's
 * explicit call). SignupFlow always starts at its welcome message; a stale
 * profile/photo from an abandoned attempt just gets overwritten once they
 * actually complete it, so there's nothing to explicitly clean up here.
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const fontsReady = useFontsReady();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { response: survey, loading: surveyLoading } = useSurveyResponse(user?.uid ?? null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(false);
  }, [user?.uid]);

  if (!fontsReady || authLoading || (user && (profileLoading || surveyLoading))) {
    return null;
  }

  if (user && (!profile || !survey) && !completed) {
    return <SignupFlow uid={user.uid} onDone={() => setCompleted(true)} />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/profile/ProfileGate.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Remove the now-redundant local gate from `AboutPage.tsx`**

In `src/pages/AboutPage.tsx`:

Change the import line (line 1) from:
```tsx
import { Fragment, useEffect, useState } from "react";
```
to:
```tsx
import { Fragment } from "react";
```

Delete the entire `useFontsReady` function block (the comment above it and the function itself — currently lines 61-82, right before the `logoIn` variant):

```tsx
// Holds the reveal at its hidden (invisible) state until the real Inter
// Variable font has actually finished loading — without this, the giant
// hero text paints once in the browser's fallback font, then visibly
// snaps to Inter a moment later (worse here than elsewhere in the app
// because this text is so large/prominent). document.fonts.ready is the
// standard signal for "the font used on this page is ready to render."
function useFontsReady(): boolean {
  const [ready, setReady] = useState(
    () => typeof document === "undefined" || !("fonts" in document) || document.fonts.status === "loaded"
  );
  useEffect(() => {
    if (ready || typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
}
```

In the `AboutPage()` function body, remove the `const fontsReady = useFontsReady();` line, so it reads:

```tsx
export function AboutPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? "visible" : "hidden";
  const animate = "visible";
```

Then remove the conditional-mount wrapper around the content grid. Replace:

```tsx
      {/* Nothing below mounts until Inter Variable has actually finished
          loading — previously this content mounted immediately (just
          invisible via opacity:0) and animated in once fonts were ready,
          but the browser still laid the text out in a fallback font the
          instant it mounted, so the font swap and the reveal animation
          could visibly collide. Not mounting at all until fontsReady costs
          a longer blank pause, not a flicker. */}
      {fontsReady && (
        <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1500px] grid-cols-[0.85fr_1.3fr] gap-12 px-14 py-9">
```

with:

```tsx
      {/* Fonts are guaranteed ready by the time this ever mounts — the app
          doesn't render at all until they are (ProfileGate + useFontsReady,
          gating sitewide, not just this page). */}
      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1500px] grid-cols-[0.85fr_1.3fr] gap-12 px-14 py-9">
```

(everything inside the `<div>` is unchanged — only the `{fontsReady && (` wrapper and the comment above it are replaced). Then find the matching closing of that conditional near the end of the function — currently:

```tsx
        </div>
      )}
    </section>
  );
}
```

and change it to:

```tsx
        </div>
    </section>
  );
}
```

(drop the `)}` — the closing `</div>` now closes directly into `</section>`; re-run the formatter/fix indentation on the file if your editor auto-formats on save, since the inner content block shifts one indent level shallower).

- [ ] **Step 6: Run the full About/ProfileGate test suites to verify nothing broke**

Run: `npx vitest run src/pages/AboutPage.test.tsx src/profile/ProfileGate.test.tsx`
Expected: PASS (4 + 7 tests). `AboutPage.test.tsx` needs no edits — it never asserted on the gating, so it passes unchanged.

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no output (clean).

- [ ] **Step 8: Commit**

```bash
git add src/profile/ProfileGate.tsx src/profile/ProfileGate.test.tsx src/pages/AboutPage.tsx
git commit -m "Gate the whole app on fonts via ProfileGate, drop AboutPage's local copy"
```

---

## Task 3: Replace `HomePage`'s blank loading state with skeletons, fix the nested posts-loading flash

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/home/HomeLandingLoggedOutStarted.tsx`
- Modify: `src/home/HomeLandingLoggedOutStarted.test.tsx`

**Interfaces:**
- No new exported interfaces — both skeleton components are internal to `HomePage.tsx`.

- [ ] **Step 1: Write the failing tests**

In `src/pages/HomePage.test.tsx`, replace the single "renders nothing while any data source is still loading" test (lines 66-71) with two tests, one per skeleton variant:

```tsx
  it("loggedout_notstarted: shows the hero-band skeleton while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    render(<HomePage />);
    expect(screen.getByTestId("home-hero-skeleton")).toBeInTheDocument();
  });

  it("loggedin_notstarted: shows the bento skeleton while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    render(<HomePage />);
    expect(screen.getByTestId("home-bento-skeleton")).toBeInTheDocument();
  });
```

In `src/home/HomeLandingLoggedOutStarted.test.tsx`, replace the "renders nothing while posts are still loading" test (lines 104-108) with:

```tsx
  it("shows the rest of the grid with a forum skeleton while posts are still loading", () => {
    mockUsePosts.mockReturnValue({ posts: [], loading: true, refetch: vi.fn(), loadOlder: vi.fn(), hasMore: false });
    renderPage();
    expect(screen.getByText("league-table-list")).toBeInTheDocument();
    expect(screen.getByText("upcoming-preview")).toBeInTheDocument();
    expect(screen.getByText("home-hero")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
    expect(screen.getByTestId("home-forum-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("forum-widget:null")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/HomePage.test.tsx src/home/HomeLandingLoggedOutStarted.test.tsx`
Expected: FAIL — `getByTestId("home-hero-skeleton")` etc. not found (both pages still `return null` while loading).

- [ ] **Step 3: Update `HomePage.tsx`**

Replace the full file contents:

```tsx
// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";
import { LoggedInHome } from "../home/LoggedInHome";
import { HomeLandingLoggedOutStarted } from "../home/HomeLandingLoggedOutStarted";
import { LoggedInHomeStarted } from "../home/LoggedInHomeStarted";
import { Frame } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";

// Matches HomeLandingLoggedOut's single hero-band shape (heading, subline,
// CTA pill, then the mission line + 4-digit countdown on the right).
function HomeHeroBandSkeleton() {
  return (
    <div
      className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[3fr_2fr] lg:gap-16"
      aria-hidden
      data-testid="home-hero-skeleton"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-14 w-full max-w-3xl rounded-lg" />
        <Skeleton className="h-5 w-full max-w-xl rounded-md" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
      <div className="flex flex-col gap-7 lg:border-l lg:border-color_border1/30 lg:pl-12">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="flex items-start gap-5 sm:gap-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

const HOME_BENTO_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";

// Matches the bento shape shared by LoggedInHome/LoggedInHomeStarted/
// HomeLandingLoggedOutStarted — a welcome-banner-height bar above a row of
// Frame-shaped cells. Not pixel-matched per state (they use different exact
// column counts/widths) — this is a skeleton, not a preview.
function HomeBentoSkeleton() {
  return (
    <div className={HOME_BENTO_SHELL} aria-hidden data-testid="home-bento-skeleton">
      <Skeleton className="h-20 w-full shrink-0 rounded-[var(--radius-4xl)]" />
      <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Frame key={i} className="h-[26rem] lg:h-full" />
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const state = useVisibilityState();
  const phase = useTournamentPhase();

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (resultsLoading || playersLoading || leaderboardLoading) {
    return state === "loggedout_notstarted" ? <HomeHeroBandSkeleton /> : <HomeBentoSkeleton />;
  }

  // Every VisibilityState has its own dedicated landing composition — see
  // onboarding/PAGE_BRIEFING.txt's "HOME - not logged in, not started" and
  // "HOME - logged in, not started" sections, plus PAGEMAP_SPEC.md §3.
  if (state === "loggedout_notstarted") {
    return <HomeLandingLoggedOut players={players} />;
  }
  if (state === "loggedin_notstarted") {
    return <LoggedInHome players={players} />;
  }
  // loggedout_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later), same treatment as the logged-in branch
  // below.
  if (state === "loggedout_leaguephase" || state === "loggedout_preknockout" || state === "loggedout_knockout") {
    return <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} phase={phase} />;
  }
  // loggedin_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later).
  if (state === "loggedin_leaguephase" || state === "loggedin_preknockout" || state === "loggedin_knockout") {
    return <LoggedInHomeStarted results={results} players={players} entries={entries} phase={phase} />;
  }

  return null;
}
```

- [ ] **Step 4: Update `HomeLandingLoggedOutStarted.tsx`**

Add `Skeleton` to the imports (after the `PageUnavailable`-style import block near the top — after the existing `Frame, FrameHeader, FrameTitle, FrameBody` import):

```tsx
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
```

Remove the early-return line:
```tsx
  if (postsLoading) return null;
```

Replace the Forum `<Frame>` block's `<FrameBody>` contents. Change:

```tsx
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
```

to:

```tsx
            <FrameBody>
              {postsLoading ? (
                <div className="flex flex-col gap-3 p-4" aria-hidden data-testid="home-forum-skeleton">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <Skeleton className="h-4 flex-1 rounded-sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
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
                </>
              )}
            </FrameBody>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/pages/HomePage.test.tsx src/home/HomeLandingLoggedOutStarted.test.tsx`
Expected: PASS (all tests in both files).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no output (clean).

- [ ] **Step 7: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/home/HomeLandingLoggedOutStarted.tsx src/home/HomeLandingLoggedOutStarted.test.tsx
git commit -m "Replace Home's blank loading states with skeletons"
```

---

## Task 4: Replace `StatsPage`'s blank loading state with a skeleton

**Files:**
- Modify: `src/pages/StatsPage.tsx`
- Modify: `src/pages/StatsPage.test.tsx`

**Interfaces:**
- No new exported interfaces — `StatsSkeleton` is internal to `StatsPage.tsx`.

- [ ] **Step 1: Write the failing test**

In `src/pages/StatsPage.test.tsx`, replace the "renders nothing while any data source is still loading" test (lines 91-96) with:

```tsx
  it("shows the stats skeleton while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePlayers.mockReturnValue({ players: [], loading: true });
    render(<StatsPage />);
    expect(screen.getByTestId("stats-skeleton")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: FAIL — `getByTestId("stats-skeleton")` not found (page still `return null`s).

- [ ] **Step 3: Add `StatsSkeleton` and wire it in**

In `src/pages/StatsPage.tsx`, add `Skeleton` to the imports (the file already imports `Frame, FrameHeader, FrameTitle, FrameBody` and `PageUnavailable` from `@/components/ui/...` around line 24-25):

```tsx
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { PageUnavailable } from "@/components/ui/page-unavailable";
```

Add the skeleton component right after the `WIDGET_GRID` constant (currently line 39, just before the `UCL_TEAM_PLACEHOLDER` array):

```tsx
// Matches PAGE_SHELL/MAIN_ROW's [1fr_1fr_300px] three-column shape: two
// columns of widget-sized placeholder cards, a third Frame standing in for
// StatsHero.
function StatsSkeleton() {
  return (
    <div className={PAGE_SHELL} aria-hidden data-testid="stats-skeleton">
      <div className={MAIN_ROW}>
        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-y-auto p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`a-${i}`} className="h-32 rounded-[var(--radius-4xl)]" />
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-y-auto p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`b-${i}`} className="h-32 rounded-[var(--radius-4xl)]" />
          ))}
        </div>
        <Frame className="min-h-[128px] lg:h-full" />
      </div>
    </div>
  );
}
```

Find the `StatsPage()` function's loading check (currently near the end of the file):

```tsx
  if (leaderboardLoading || resultsLoading || playersLoading || responsesLoading) return null;
```

and change it to:

```tsx
  if (leaderboardLoading || resultsLoading || playersLoading || responsesLoading) return <StatsSkeleton />;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/StatsPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/pages/StatsPage.tsx src/pages/StatsPage.test.tsx
git commit -m "Replace Stats page's blank loading state with a skeleton"
```

---

## Task 5: Replace `PredictionsPage`'s blank loading state with a minimal skeleton

**Files:**
- Modify: `src/pages/PredictionsPage.tsx`
- Modify: `src/pages/PredictionsPage.test.tsx`

**Interfaces:**
- No new exported interfaces — `PredictionsLoadingSkeleton` is internal to `PredictionsPage.tsx`.

- [ ] **Step 1: Write the failing test**

In `src/pages/PredictionsPage.test.tsx`, replace the "renders nothing while the prediction is loading" test (lines 115-120) with:

```tsx
  it("shows a minimal loading skeleton while the prediction is loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: true });
    renderPage();
    expect(screen.getByTestId("predictions-skeleton")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/PredictionsPage.test.tsx`
Expected: FAIL — `getByTestId("predictions-skeleton")` not found (page still `return null`s).

- [ ] **Step 3: Add the skeleton and wire it in**

In `src/pages/PredictionsPage.tsx`, add the `Skeleton` import alongside the existing `@/components/ui/page-unavailable` import:

```tsx
import { PAGE_UNAVAILABLE_MESSAGE } from "@/components/ui/page-unavailable";
import { Skeleton } from "@/components/ui/skeleton";
```

Add the skeleton component right after the `type FlowStep = "intro" | "rank" | "done";` line:

```tsx
// This page is a full-viewport animated intro sequence, not a data grid, and
// usePrediction's loading is a single fast read that usually ends in an
// immediate redirect — a couple of centered bars, not a pixel-matched
// mockup of a UI that's about to be replaced or redirected away from.
function PredictionsLoadingSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8"
      aria-hidden
      data-testid="predictions-skeleton"
    >
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-4 w-80 rounded-sm" />
    </div>
  );
}
```

Find the loading check inside `PredictionsPage()`:

```tsx
  if (loading) return null;
```

and change it to:

```tsx
  if (loading) return <PredictionsLoadingSkeleton />;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/PredictionsPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/pages/PredictionsPage.tsx src/pages/PredictionsPage.test.tsx
git commit -m "Replace Predictions page's blank loading state with a minimal skeleton"
```

---

## Task 6: Fade in `AvatarImage` instead of popping from fallback to photo

**Files:**
- Modify: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/avatar.test.tsx`

**Interfaces:**
- No signature changes — `AvatarImage`'s props are untouched, only its className gains a class.

> Context confirmed by reading `node_modules/@base-ui/react/avatar/image/{AvatarImage,useImageLoadingStatus}.js`: `AvatarImage` only ever mounts the real `<img>` once `useImageLoadingStatus` (which itself probes via `new window.Image()`, same constructor `test/setup.ts`'s `ImageMock` already fakes for `HeroCarousel.tsx`'s tests) reports `'loaded'`. So the element is never in the DOM half-loaded — a static animation class in the base className is enough; no load-state tracking needed in this file.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/avatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

describe("AvatarImage", () => {
  it("fades in once the photo has loaded, instead of popping in instantly", async () => {
    render(
      <Avatar>
        <AvatarImage src="/photo.png" alt="" />
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>
    );
    const img = await screen.findByRole("img");
    expect(img).toHaveClass("animate-cotton-fade");
  });

  it("shows the fallback, not a broken/empty image, before the photo has loaded", () => {
    render(
      <Avatar>
        <AvatarImage src="/photo.png" alt="" />
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("MG")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/avatar.test.tsx`
Expected: FAIL — first test fails because the rendered `<img>` doesn't have the `animate-cotton-fade` class yet.

- [ ] **Step 3: Add the fade-in class**

In `src/components/ui/avatar.tsx`, change the `AvatarImage` function:

```tsx
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover animate-cotton-fade",
        className
      )}
      {...props}
    />
  )
}
```

(only the className string changes — `animate-cotton-fade` appended, same keyframe already used for route transitions in `AppShell.tsx`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/avatar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/avatar.tsx src/components/ui/avatar.test.tsx
git commit -m "Fade in AvatarImage instead of popping from fallback to photo"
```

---

## Task 7: Fade in `ForumImageThumb` and add a failure fallback

**Files:**
- Modify: `src/forum/ForumImageThumb.tsx`
- Create: `src/forum/ForumImageThumb.test.tsx`

**Interfaces:**
- No prop changes — `ForumImageThumb({ src: string; className?: string })` keeps its exact signature.

- [ ] **Step 1: Write the failing test**

Create `src/forum/ForumImageThumb.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ForumImageThumb } from "./ForumImageThumb";

describe("ForumImageThumb", () => {
  it("starts the thumbnail transparent, then fades it in once it loads", () => {
    render(<ForumImageThumb src="/uploads/photo.png" />);
    const img = screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")!;
    expect(img).toHaveClass("opacity-0");

    fireEvent.load(img);
    expect(img).toHaveClass("opacity-100");
  });

  it("shows a fallback icon instead of a broken image when the thumbnail fails to load", () => {
    render(<ForumImageThumb src="/uploads/missing.png" />);
    const img = screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")!;

    fireEvent.error(img);

    expect(screen.getByTestId("forum-image-fallback")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resmi büyüt" })?.querySelector("img")).not.toBeInTheDocument();
  });

  it("still opens the lightbox on click, and shows a failure message there if the full image fails too", () => {
    render(<ForumImageThumb src="/uploads/photo.png" />);
    fireEvent.click(screen.getByRole("button", { name: "Resmi büyüt" }));

    const dialog = screen.getByRole("button", { name: "Kapat" });
    const fullImg = dialog.querySelector("img")!;
    fireEvent.error(fullImg);

    expect(screen.getByText("Resim yüklenemedi.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/forum/ForumImageThumb.test.tsx`
Expected: FAIL — the current `<img>` has no `opacity-0`/`opacity-100` classes and there's no `forum-image-fallback` testid or "Resim yüklenemedi." text.

- [ ] **Step 3: Implement the fade-in and error fallback**

Replace the full contents of `src/forum/ForumImageThumb.tsx`:

```tsx
// src/forum/ForumImageThumb.tsx
import { useState, type MouseEvent } from "react";
import { X, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForumImageThumbProps {
  src: string;
  className?: string;
}

type ImageStatus = "loading" | "loaded" | "error";

/**
 * 4chan-style image treatment: a small bounded thumbnail (never full width),
 * expanding to the full image only on click, in a lightbox overlay. Every
 * forum image call site uses this instead of its own inline <img> so the
 * "bounded until clicked" behavior stays in one place.
 *
 * Unlike AvatarImage (base-ui's primitive, which only mounts once a photo
 * has already loaded), this is a plain <img> — the thumbnail box is already
 * fixed-size so there's no layout shift, but the image itself used to pop in
 * with no fade and no failure handling at all. Both the thumbnail and the
 * lightbox now track their own load status independently, since a broken
 * upload should show a fallback in both places, not just one.
 */
export function ForumImageThumb({ src, className }: ForumImageThumbProps) {
  const [expanded, setExpanded] = useState(false);
  const [thumbStatus, setThumbStatus] = useState<ImageStatus>("loading");
  const [fullStatus, setFullStatus] = useState<ImageStatus>("loading");

  function openLightbox(e: MouseEvent) {
    // Image click must never bubble into a post-row's own "open the thread
    // popup" click handler (RecentPostsPreview) — the thumbnail is its own
    // target, not a door into the popup.
    e.stopPropagation();
    setExpanded(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openLightbox}
        aria-label="Resmi büyüt"
        className={className ?? "block size-16 shrink-0 cursor-pointer overflow-hidden rounded-md border border-color_border1/50"}
      >
        {thumbStatus === "error" ? (
          <div className="flex size-full items-center justify-center bg-muted" data-testid="forum-image-fallback">
            <ImageOff className="size-4 text-color_textsecondary/50" aria-hidden />
          </div>
        ) : (
          <img
            src={src}
            alt=""
            loading="lazy"
            onLoad={() => setThumbStatus("loaded")}
            onError={() => setThumbStatus("error")}
            className={cn(
              "size-full object-cover transition-opacity duration-300",
              thumbStatus === "loaded" ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </button>

      {expanded && (
        <div
          role="button"
          tabIndex={-1}
          aria-label="Kapat"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-color_idk/80 p-6"
        >
          {fullStatus === "error" ? (
            <p className="text-sm text-white">Resim yüklenemedi.</p>
          ) : (
            <img
              src={src}
              alt=""
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setFullStatus("loaded")}
              onError={() => setFullStatus("error")}
              className={cn(
                "max-h-full max-w-full cursor-default rounded-lg object-contain transition-opacity duration-300",
                fullStatus === "loaded" ? "opacity-100" : "opacity-0"
              )}
            />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            aria-label="Kapat"
            className="absolute top-4 right-4 cursor-pointer rounded-full bg-color_idk/50 p-2 text-white outline-none transition-colors hover:bg-color_idk/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/forum/ForumImageThumb.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/forum/ForumImageThumb.tsx src/forum/ForumImageThumb.test.tsx
git commit -m "Fade in ForumImageThumb and add a failure fallback"
```

---

## Final check

- [ ] Run the full suite once more: `npx vitest run` — expect every test file to pass (no regressions in files not directly touched, e.g. other pages/components that render `AvatarImage` through the shared component).
- [ ] Run `npx tsc -b` once more — expect no output.
