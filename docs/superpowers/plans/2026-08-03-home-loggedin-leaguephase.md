# Home — logged-in, league phase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `loggedin_leaguephase` composition of `HomePage.tsx` — currently the generic `[Placeholder]` skeleton — per the approved design spec at `docs/superpowers/specs/2026-08-03-home-loggedin-leaguephase-design.md`.

**Architecture:** A shared `HomeWelcomeBanner` (extracted from `HomeLandingLoggedIn.tsx`) sits above a new 3-column bento composition, `HomeLandingLoggedInStarted`, built from mostly-reused widgets (`UpcomingMatchesPreview`, `RecentPostsPreview`, `HomeHero`, `ChatRoom`) plus one new widget (`NearbyStandingsList`). A new data-fetching wrapper, `LoggedInHomeStarted`, mirrors `LoggedInHome.tsx`'s role (auth-gated chat/posts hooks) minus everything lobby- or prediction-submission-related, which this page doesn't use. `HomePage.tsx` gets one new early return.

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library, existing Firebase hooks (no new backend work).

## Global Constraints

- No `FrameHeader`/title band on any of the five widgets in the new composition — confirmed directly with Mert, a deliberate departure from `HomeLandingLoggedIn`'s navy-banded cells.
- Desktop-only. No responsive breakpoints, no mobile consideration whatsoever — Mert's exact words: "Do not even give an ounce of thought to mobile."
- The welcome banner's "Tahminini Yap" CTA must be **unconditionally hidden** on the started composition (`showCta={false}`), regardless of prediction-submission status — `/predictions` redirects home for any visitor once the tournament has started.
- Chat on this page is global-only: no Special Lobby switcher, no lobby management UI, `lobbyId={null}` always.
- Katılımcılar (the participant-list widget) is not present anywhere in this composition — replaced by `UpcomingMatchesPreview` (col 1) and `NearbyStandingsList` (col 3).
- Keep `npx tsc -b` and `npm run test` clean after every task.

---

## Task 1: Extract `HomeWelcomeBanner` out of `HomeLandingLoggedIn`

**Files:**
- Create: `src/home/HomeWelcomeBanner.tsx`
- Create: `src/home/HomeWelcomeBanner.test.tsx`
- Modify: `src/home/HomeLandingLoggedIn.tsx`
- Modify: `src/home/HomeLandingLoggedIn.test.tsx`

**Interfaces:**
- Produces: `HomeWelcomeBanner({ me: Player, showCta: boolean }): JSX.Element`, default-exported as a named export from `src/home/HomeWelcomeBanner.tsx`. Later tasks (Task 3) import this exact signature.

- [ ] **Step 1: Write the failing test for `HomeWelcomeBanner`**

Create `src/home/HomeWelcomeBanner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomeWelcomeBanner } from "./HomeWelcomeBanner";
import { Player } from "../profile/usePlayers";

const mockUseCountdown = vi.fn();
vi.mock("./useCountdown", () => ({
  useCountdown: () => mockUseCountdown(),
}));

const me: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };

function renderBanner(showCta: boolean) {
  return render(
    <MemoryRouter>
      <HomeWelcomeBanner me={me} showCta={showCta} />
    </MemoryRouter>
  );
}

describe("HomeWelcomeBanner", () => {
  beforeEach(() => {
    mockUseCountdown.mockReturnValue({ days: 4, hours: 3, minutes: 2, seconds: 1, done: false });
  });

  it("greets the signed-in user by first name, bolded", () => {
    renderBanner(true);
    const greeting = screen.getByText((_, el) => el?.textContent === "Hoş geldin, Mert.");
    expect(greeting).toBeInTheDocument();
    expect(screen.getByText("Mert")).toHaveClass("font-bold");
  });

  it("shows the predictions CTA when showCta is true", () => {
    renderBanner(true);
    expect(screen.getByRole("link", { name: /Tahminini Yap/ })).toHaveAttribute("href", "/predictions");
  });

  it("hides the CTA when showCta is false", () => {
    renderBanner(false);
    expect(screen.queryByRole("link", { name: /Tahminini Yap/ })).not.toBeInTheDocument();
  });

  it("shows the countdown digits when not yet done", () => {
    renderBanner(true);
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("hides the countdown once it's done", () => {
    mockUseCountdown.mockReturnValue({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    renderBanner(true);
    expect(screen.queryByText("Tahminlerin Kapanmasına")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/home/HomeWelcomeBanner.test.tsx`
Expected: FAIL — `Cannot find module './HomeWelcomeBanner'`.

- [ ] **Step 3: Create `HomeWelcomeBanner.tsx`**

This is the exact banner JSX currently inline in `HomeLandingLoggedIn.tsx` (its `MiniCountdownDigit` helper plus the whole `<Frame>` block), with the `!submitterUids.has(me.uid)` check replaced by the `showCta` prop:

```tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Frame, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCountdown } from "./useCountdown";
import { TOURNAMENT_START_ISO } from "./deadlines";
import { initials } from "../profile/deletedAccount";
import type { Player } from "../profile/usePlayers";

interface HomeWelcomeBannerProps {
  me: Player;
  /** Whether to show the "Tahminini Yap" CTA. HomeLandingLoggedIn passes
   *  `!submitterUids.has(me.uid)` (predictions still open); the started
   *  page passes `false` unconditionally, since /predictions redirects
   *  home for anyone visiting once the tournament has started, regardless
   *  of submission status. */
  showCta: boolean;
}

function MiniCountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-2xl leading-none font-semibold text-color_text tnum sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs tracking-[0.1em] text-color_textsecondary uppercase">{label}</span>
    </span>
  );
}

/**
 * Personal welcome + primary action + countdown — one frame, no title band
 * (Home's "no widget carries a label" rule applies to the greeting too).
 * Shared between HomeLandingLoggedIn (not-started) and
 * HomeLandingLoggedInStarted (league phase) — identical treatment on both,
 * per the started page's own wireframe note ("welcome message, same as
 * logged in not started").
 */
export function HomeWelcomeBanner({ me, showCta }: HomeWelcomeBannerProps) {
  const countdown = useCountdown(TOURNAMENT_START_ISO);

  return (
    <Frame className="shrink-0 animate-cotton-rise">
      <FrameBody className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar className="size-14 shrink-0">
            <AvatarImage src={me.photoURL} alt="" />
            <AvatarFallback className="font-mono text-sm text-color_textsecondary">
              {initials(me)}
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 truncate font-display text-xl text-color_text sm:text-2xl">
            Hoş geldin, <span className="font-bold">{me.firstName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          {showCta && (
            <Link
              to="/predictions"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
            >
              Tahminini Yap
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}

          {!countdown.done && (
            <div className="flex items-baseline gap-4 whitespace-nowrap">
              <span className="font-mono text-xs tracking-[0.12em] text-color_textsecondary uppercase">
                Tahminlerin Kapanmasına
              </span>
              <div className="flex items-baseline gap-3.5">
                <MiniCountdownDigit value={countdown.days} label="Gün" />
                <MiniCountdownDigit value={countdown.hours} label="Saat" />
                <MiniCountdownDigit value={countdown.minutes} label="Dk" />
                <MiniCountdownDigit value={countdown.seconds} label="Sn" />
              </div>
            </div>
          )}
        </div>
      </FrameBody>
    </Frame>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/home/HomeWelcomeBanner.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Update `HomeLandingLoggedIn.tsx` to use the extracted banner**

In `src/home/HomeLandingLoggedIn.tsx`:

Replace the import block (lines 1-25) with:

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChatRoom } from "../chat/ChatRoom";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { ParticipantStatusList } from "./ParticipantStatusList";
import { HomeHero } from "./HomeHero";
import { HomeWelcomeBanner } from "./HomeWelcomeBanner";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { buildPlayersByUid } from "../profile/playersByUid";
import { LobbySwitcher, getLobbySwitcherLabel } from "../lobbies/LobbySwitcher";
import { LobbyManagementPanel } from "../lobbies/LobbyManagementPanel";
import type { MyLobby } from "../lobbies/useMyLobbies";
import type { useLobbyMessages } from "../lobbies/useLobbyMessages";
import { LobbyMember, LOBBY_NAME_MAX_LENGTH } from "../lobbies/lobbyTypes";
import type { RankedEntry } from "../leaderboard/ranking";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";
```

(This drops `ArrowRight`, `Avatar`/`AvatarImage`/`AvatarFallback`, `useCountdown`, `TOURNAMENT_START_ISO`, and `initials` — all now only used inside `HomeWelcomeBanner.tsx` — and adds the `HomeWelcomeBanner` import.)

Delete the `MiniCountdownDigit` function (it moved to `HomeWelcomeBanner.tsx`).

Delete the `const countdown = useCountdown(TOURNAMENT_START_ISO);` line inside the component body.

Replace the entire banner `<Frame>` block (the one starting with the comment `{/* Personal welcome + primary action + countdown ... */}` and ending at its closing `</Frame>`, immediately before `<div className={CELL_ROW}>`) with:

```tsx
      <HomeWelcomeBanner me={me} showCta={!submitterUids.has(me.uid)} />
```

- [ ] **Step 6: Update `HomeLandingLoggedIn.test.tsx` to drop now-duplicated banner detail tests**

In `src/home/HomeLandingLoggedIn.test.tsx`, remove the `mockUseCountdown` mock setup (the `vi.mock("./useCountdown", ...)` block and the `beforeEach` that sets its return value — the extracted banner is no longer mocked here, so its internal `useCountdown` call needs no interception for these tests since we're only checking wiring, not countdown rendering) — replace the block:

```tsx
const mockUseCountdown = vi.fn();
vi.mock("./useCountdown", () => ({
  useCountdown: () => mockUseCountdown(),
}));

vi.mock("../chat/ChatRoom", () => ({
```

with:

```tsx
vi.mock("./HomeWelcomeBanner", () => ({
  HomeWelcomeBanner: ({ me, showCta }: { me: { firstName: string }; showCta: boolean }) => (
    <div>welcome-banner:{me.firstName}:{String(showCta)}</div>
  ),
}));

vi.mock("../chat/ChatRoom", () => ({
```

Remove the whole `beforeEach(() => { mockUseCountdown.mockReturnValue(...) })` block inside `describe("HomeLandingLoggedIn", ...)`.

Replace these five tests (which now test `HomeWelcomeBanner`'s own internals, already covered by `HomeWelcomeBanner.test.tsx`):

```tsx
  it("greets the signed-in user by first name, bolded", () => {
    renderPage();
    const greeting = screen.getByText((_, el) => el?.textContent === "Hoş geldin, Mert.");
    expect(greeting).toBeInTheDocument();
    expect(screen.getByText("Mert")).toHaveClass("font-bold");
  });

  it("links the primary CTA to the predictions page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /Tahminini Yap/ })).toHaveAttribute("href", "/predictions");
  });

  it("hides the CTA once the user has already submitted a prediction", () => {
    renderPage({ submitterUids: new Set(["me", "p2"]) });
    expect(screen.queryByRole("link", { name: /Tahminini Yap/ })).not.toBeInTheDocument();
  });

  it("shows the countdown digits when not yet done", () => {
    renderPage();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("hides the countdown once it's done", () => {
    mockUseCountdown.mockReturnValue({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    renderPage();
    expect(screen.queryByText("Kayıtların Kapanmasına")).not.toBeInTheDocument();
  });
```

with a single wiring-level test:

```tsx
  it("passes the correct me and showCta through to the welcome banner", () => {
    renderPage();
    expect(screen.getByText("welcome-banner:Mert:true")).toBeInTheDocument();
  });

  it("tells the banner to hide the CTA once the user has already submitted a prediction", () => {
    renderPage({ submitterUids: new Set(["me", "p2"]) });
    expect(screen.getByText("welcome-banner:Mert:false")).toBeInTheDocument();
  });
```

- [ ] **Step 7: Run the full suite to verify everything still passes**

Run: `npm run test`
Expected: PASS, no failures, no unused-import errors.

Run: `npx tsc -b`
Expected: clean, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/home/HomeWelcomeBanner.tsx src/home/HomeWelcomeBanner.test.tsx src/home/HomeLandingLoggedIn.tsx src/home/HomeLandingLoggedIn.test.tsx
git commit -m "Extract HomeWelcomeBanner out of HomeLandingLoggedIn"
```

---

## Task 2: Build `NearbyStandingsList`

**Files:**
- Create: `src/leaderboard/NearbyStandingsList.tsx`
- Create: `src/leaderboard/NearbyStandingsList.test.tsx`

**Interfaces:**
- Produces: `NearbyStandingsList({ entries: LeaderboardEntry[], players: Player[], myUid: string, onSelectParticipant: (uid: string) => void }): JSX.Element`, and a pure exported helper `selectNearbyWindow<T>(items: T[], centerIndex: number, windowSize = 5): T[]`. Task 3 imports `NearbyStandingsList` with this exact prop shape.
- Consumes: `assignRanks` from `./ranking` (existing), `buildPlayersByUid` from `../profile/playersByUid` (existing), `fullName`/`initials` from `../profile/deletedAccount` (existing).

- [ ] **Step 1: Write the failing tests**

Create `src/leaderboard/NearbyStandingsList.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NearbyStandingsList, selectNearbyWindow } from "./NearbyStandingsList";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";

function makeEntries(count: number): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `p${i}`,
    firstName: `Player${i}`,
    photoURL: "",
    points: count - i,
    ranking: [],
  }));
}

describe("selectNearbyWindow", () => {
  const items = Array.from({ length: 36 }, (_, i) => i);

  it("centers the window on a middle index", () => {
    expect(selectNearbyWindow(items, 15)).toEqual([13, 14, 15, 16, 17]);
  });

  it("slides to the top when the center index is near the start", () => {
    expect(selectNearbyWindow(items, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(selectNearbyWindow(items, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  it("slides to the bottom when the center index is near the end", () => {
    expect(selectNearbyWindow(items, 35)).toEqual([31, 32, 33, 34, 35]);
    expect(selectNearbyWindow(items, 34)).toEqual([31, 32, 33, 34, 35]);
  });

  it("falls back to the top 5 when the center index is not found (-1)", () => {
    expect(selectNearbyWindow(items, -1)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns everything when there are fewer items than the window size", () => {
    expect(selectNearbyWindow([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });
});

const players: Player[] = Array.from({ length: 6 }, (_, i) => ({
  uid: `p${i}`,
  firstName: `Player${i}`,
  lastName: `L${i}`,
  photoURL: "",
  createdAt: i,
}));

describe("NearbyStandingsList", () => {
  it("shows the empty state when there are no entries", () => {
    render(<NearbyStandingsList entries={[]} players={[]} myUid="p0" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Henüz tahmin gönderen olmadı.")).toBeInTheDocument();
  });

  it("renders a 5-row window centered on the viewer", () => {
    const entries = makeEntries(10);
    render(<NearbyStandingsList entries={entries} players={players} myUid="p5" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Player3 L3")).toBeInTheDocument();
    expect(screen.getByText("Player7 L7")).toBeInTheDocument();
    expect(screen.queryByText("Player0 L0")).not.toBeInTheDocument();
    expect(screen.queryByText("Player9 L9")).not.toBeInTheDocument();
  });

  it("falls back to the top 5 when the viewer has no entry", () => {
    const entries = makeEntries(10);
    render(<NearbyStandingsList entries={entries} players={players} myUid="ghost" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Player0 L0")).toBeInTheDocument();
    expect(screen.getByText("Player4 L4")).toBeInTheDocument();
    expect(screen.queryByText("Player5 L5")).not.toBeInTheDocument();
  });

  it("fires onSelectParticipant when a row is clicked", () => {
    const entries = makeEntries(6);
    const onSelectParticipant = vi.fn();
    render(<NearbyStandingsList entries={entries} players={players} myUid="p2" onSelectParticipant={onSelectParticipant} />);
    fireEvent.click(screen.getByText("Player2 L2"));
    expect(onSelectParticipant).toHaveBeenCalledWith("p2");
  });

  it("highlights the viewer's own row and no one else's", () => {
    const entries = makeEntries(6);
    render(<NearbyStandingsList entries={entries} players={players} myUid="p2" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Player2 L2").closest("li")).toHaveClass("bg-color_accent/10");
    expect(screen.getByText("Player1 L1").closest("li")).not.toHaveClass("bg-color_accent/10");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/leaderboard/NearbyStandingsList.test.tsx`
Expected: FAIL — `Cannot find module './NearbyStandingsList'`.

- [ ] **Step 3: Create `NearbyStandingsList.tsx`**

```tsx
import { useMemo } from "react";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
import { assignRanks, RankedEntry } from "./ranking";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NearbyStandingsListProps {
  entries: LeaderboardEntry[];
  players: Player[];
  myUid: string;
  onSelectParticipant: (uid: string) => void;
}

const WINDOW_SIZE = 5;

/**
 * Pure windowing logic, exported for direct unit testing without rendering.
 * Slides rather than pads at either edge: a `centerIndex` too close to 0 or
 * to `items.length` clamps the window's start so it's always exactly
 * `windowSize` real items (when there are at least that many). A
 * `centerIndex` of -1 (viewer not found in the list at all) falls through
 * the same clamp to the top of the list — no separate case needed.
 */
export function selectNearbyWindow<T>(items: T[], centerIndex: number, windowSize = WINDOW_SIZE): T[] {
  if (items.length <= windowSize) return items;
  const half = Math.floor(windowSize / 2);
  let start = centerIndex - half;
  if (start < 0) start = 0;
  if (start + windowSize > items.length) start = items.length - windowSize;
  return items.slice(start, start + windowSize);
}

/**
 * Home's league-phase "standings around me" widget — a 5-row slice of the
 * full leaderboard, sliding to stay centered on the viewer wherever
 * possible. Replaces the Katılımcılar participant-list widget on this page
 * (design spec 2026-08-03, "nearby standings" section). No title band, per
 * this page's no-header convention.
 */
export function NearbyStandingsList({ entries, players, myUid, onSelectParticipant }: NearbyStandingsListProps) {
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
  const ranked = useMemo(() => assignRanks(entries), [entries]);
  const myIndex = ranked.findIndex((r) => r.entry.uid === myUid);
  const windowed = useMemo(() => selectNearbyWindow(ranked, myIndex), [ranked, myIndex]);

  if (ranked.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <p className="text-center font-display text-sm text-color_textsecondary italic">
          Henüz tahmin gönderen olmadı.
        </p>
      </div>
    );
  }

  return (
    <ul className="no-scrollbar min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto px-3 sm:px-4">
      {windowed.map(({ entry, rank }: RankedEntry) => {
        const isMe = entry.uid === myUid;
        const named = { firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName };
        return (
          <li
            key={entry.uid}
            onClick={() => onSelectParticipant(entry.uid)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_text/[0.06]",
              isMe && "bg-color_accent/10"
            )}
          >
            <span className="w-6 shrink-0 font-mono text-xs text-color_textsecondary tnum">
              {String(rank).padStart(2, "0")}
            </span>
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={entry.photoURL} alt="" />
              <AvatarFallback className="font-mono text-[0.6rem] text-color_textsecondary">
                {initials(named)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-display text-sm text-color_text">{fullName(named)}</span>
            <span className="shrink-0 font-mono text-sm font-medium text-color_text tnum">{entry.points}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/leaderboard/NearbyStandingsList.test.tsx`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/NearbyStandingsList.tsx src/leaderboard/NearbyStandingsList.test.tsx
git commit -m "Add NearbyStandingsList widget"
```

---

## Task 3: Build `HomeLandingLoggedInStarted` composition

**Files:**
- Create: `src/home/HomeLandingLoggedInStarted.tsx`
- Create: `src/home/HomeLandingLoggedInStarted.test.tsx`

**Interfaces:**
- Consumes: `HomeWelcomeBanner` (Task 1, `{ me: Player, showCta: boolean }`), `NearbyStandingsList` (Task 2, `{ entries, players, myUid, onSelectParticipant }`), plus existing `UpcomingMatchesPreview`, `RecentPostsPreview`/`ForumPreviewFooter`, `HomeHero`, `ChatRoom`, `ParticipantPopup`, `TeamPopup`, `MatchupPopup`.
- Produces: `HomeLandingLoggedInStarted(props): JSX.Element` with the prop interface below. Task 4 renders this component with these exact prop names/types.

```ts
interface HomeLandingLoggedInStartedProps {
  me: Player;
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  messages: MessageWithId[];
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  onlineCount: number;
  typingUids: string[];
  posts: PostWithId[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  likeError: string | null;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  forumActionError: string | null;
}
```

- [ ] **Step 1: Write the failing tests**

Create `src/home/HomeLandingLoggedInStarted.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { HomeLandingLoggedInStarted } from "./HomeLandingLoggedInStarted";
import { Player } from "../profile/usePlayers";

vi.mock("./HomeWelcomeBanner", () => ({
  HomeWelcomeBanner: ({ me, showCta }: { me: { firstName: string }; showCta: boolean }) => (
    <div>welcome-banner:{me.firstName}:{String(showCta)}</div>
  ),
}));

vi.mock("../leaderboard/UpcomingMatchesPreview", () => ({
  UpcomingMatchesPreview: ({
    onSelectTeam,
    onSelectFixture,
  }: {
    onSelectTeam: (id: string) => void;
    onSelectFixture?: (id: string) => void;
  }) => (
    <div>
      <button onClick={() => onSelectTeam("arsenal")}>upcoming-preview</button>
      <button onClick={() => onSelectFixture?.("fixture-1")}>upcoming-preview-fixture</button>
    </div>
  ),
}));

vi.mock("../forum/RecentPostsPreview", () => ({
  RecentPostsPreview: ({
    uid,
    onSelectParticipant,
  }: {
    uid: string;
    onSelectParticipant: (uid: string) => void;
  }) => (
    <div>
      <span>forum-widget:{uid}</span>
      <button onClick={() => onSelectParticipant("player-1")}>select-participant</button>
    </div>
  ),
  ForumPreviewFooter: () => <div>forum-footer</div>,
}));

vi.mock("./HomeHero", () => ({
  HomeHero: () => <div>home-hero</div>,
}));

vi.mock("../leaderboard/NearbyStandingsList", () => ({
  NearbyStandingsList: ({ onSelectParticipant }: { onSelectParticipant: (uid: string) => void }) => (
    <button onClick={() => onSelectParticipant("player-1")}>nearby-standings</button>
  ),
}));

vi.mock("../chat/ChatRoom", () => ({
  ChatRoom: ({ uid, lobbyId }: { uid: string; lobbyId?: string | null }) => (
    <div>chat-room:{uid}:{String(lobbyId)}</div>
  ),
}));

vi.mock("../leaderboard/ParticipantPopup", () => ({
  ParticipantPopup: ({ ranked }: { ranked: { entry: { uid: string } } | null }) => (
    <div>participant-popup:{ranked ? ranked.entry.uid : "closed"}</div>
  ),
}));

vi.mock("../leaderboard/TeamPopup", () => ({
  TeamPopup: ({
    teamId,
    onSelectFixture,
  }: {
    teamId: string | null;
    onSelectFixture?: (id: string) => void;
  }) => (
    <div>
      <span>team-popup:{teamId ?? "closed"}</span>
      <button onClick={() => onSelectFixture?.("fixture-2")}>team-popup-select-fixture</button>
    </div>
  ),
}));

vi.mock("../leaderboard/MatchupPopup", () => ({
  MatchupPopup: ({ fixtureId }: { fixtureId: string | null }) => <div>matchup-popup:{fixtureId ?? "closed"}</div>,
}));

const me: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };
const players: Player[] = [me];

function renderPage(overrides: Partial<Parameters<typeof HomeLandingLoggedInStarted>[0]> = {}) {
  return render(
    <HomeLandingLoggedInStarted
      me={me}
      players={players}
      results={{}}
      entries={[]}
      messages={[]}
      onLoadOlderMessages={vi.fn()}
      loadingOlderMessages={false}
      hasMoreOlderMessages={false}
      onlineCount={2}
      typingUids={[]}
      posts={[]}
      likesByPost={new Map()}
      onToggleLike={vi.fn()}
      likeError={null}
      onDeletePost={vi.fn()}
      onSaveEdit={vi.fn()}
      onRefetchPosts={vi.fn()}
      forumActionError={null}
      {...overrides}
    />
  );
}

describe("HomeLandingLoggedInStarted", () => {
  it("renders all five widgets, with the welcome banner's CTA always hidden", () => {
    renderPage();
    expect(screen.getByText("welcome-banner:Mert:false")).toBeInTheDocument();
    expect(screen.getByText("upcoming-preview")).toBeInTheDocument();
    expect(screen.getByText("forum-widget:me")).toBeInTheDocument();
    expect(screen.getByText("home-hero")).toBeInTheDocument();
    expect(screen.getByText("nearby-standings")).toBeInTheDocument();
    expect(screen.getByText("chat-room:me:null")).toBeInTheDocument();
  });

  it("selecting a team from the upcoming-matches widget opens TeamPopup and closes ParticipantPopup", () => {
    renderPage();
    fireEvent.click(screen.getByText("upcoming-preview"));
    expect(screen.getByText("team-popup:arsenal")).toBeInTheDocument();
    expect(screen.getByText("participant-popup:closed")).toBeInTheDocument();
  });

  it("selecting a participant from the forum widget opens ParticipantPopup and closes TeamPopup", () => {
    renderPage({ entries: [{ uid: "player-1", firstName: "Ada", photoURL: "", points: 10, ranking: [] }] });
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:player-1")).toBeInTheDocument();
    expect(screen.getByText("team-popup:closed")).toBeInTheDocument();
  });

  it("selecting a participant from nearby standings also opens ParticipantPopup", () => {
    renderPage({ entries: [{ uid: "player-1", firstName: "Ada", photoURL: "", points: 10, ranking: [] }] });
    fireEvent.click(screen.getByText("nearby-standings"));
    expect(screen.getByText("participant-popup:player-1")).toBeInTheDocument();
  });

  it("opens the Matchup Popup when a fixture is selected from the upcoming-matches preview or TeamPopup's match history", () => {
    renderPage();
    expect(screen.getByText("matchup-popup:closed")).toBeInTheDocument();

    fireEvent.click(screen.getByText("upcoming-preview-fixture"));
    expect(screen.getByText("matchup-popup:fixture-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("team-popup-select-fixture"));
    expect(screen.getByText("matchup-popup:fixture-2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/home/HomeLandingLoggedInStarted.test.tsx`
Expected: FAIL — `Cannot find module './HomeLandingLoggedInStarted'`.

- [ ] **Step 3: Create `HomeLandingLoggedInStarted.tsx`**

```tsx
import { useCallback, useMemo, useState } from "react";
import { HomeWelcomeBanner } from "./HomeWelcomeBanner";
import { UpcomingMatchesPreview } from "../leaderboard/UpcomingMatchesPreview";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { NearbyStandingsList } from "../leaderboard/NearbyStandingsList";
import { HomeHero } from "./HomeHero";
import { ChatRoom } from "../chat/ChatRoom";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { assignRanks } from "../leaderboard/ranking";
import { Frame, FrameBody } from "@/components/ui/frame";
import type { Player } from "../profile/usePlayers";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";

interface HomeLandingLoggedInStartedProps {
  me: Player;
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  messages: MessageWithId[];
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  onlineCount: number;
  typingUids: string[];
  posts: PostWithId[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  likeError: string | null;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  forumActionError: string | null;
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Starting values, not pixel-locked (design spec: "the sketch's own... not
// to take too seriously" framing) — col 2 fixed at 300px to match HomeHero's
// established width everywhere else it appears.
const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[1fr_300px_1fr] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

/**
 * Home, logged-in + league phase — the wireframe's welcome banner (identical
 * to logged-in-not-started's) above a 3-column bento: [upcoming 3 matches /
 * forum] | hero carousel | [nearby standings / chat]. No FrameHeader/title
 * band on any of the five widgets, a deliberate departure from
 * HomeLandingLoggedIn's navy-banded cells (Mert's direct instruction).
 * Katılımcılar and the Special Lobby switcher are absent entirely — dropped
 * in favor of the upcoming-matches widget and the nearby-standings widget
 * (design spec 2026-08-03).
 */
export function HomeLandingLoggedInStarted({
  me,
  players,
  results,
  entries,
  messages,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreOlderMessages,
  onlineCount,
  typingUids,
  posts,
  likesByPost,
  onToggleLike,
  likeError,
  onDeletePost,
  onSaveEdit,
  onRefetchPosts,
  forumActionError,
}: HomeLandingLoggedInStartedProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectFixture = useCallback((fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    setSelectedTeamId(null);
    setSelectedUid(null);
  }, []);

  return (
    <div className={PAGE_SHELL}>
      <HomeWelcomeBanner me={me} showCta={false} />

      <div className={CELL_ROW}>
        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          <Frame className="h-60 shrink-0 animate-cotton-rise" style={{ animationDelay: "60ms" }}>
            <FrameBody>
              <UpcomingMatchesPreview
                results={results}
                onSelectTeam={handleSelectTeam}
                onSelectFixture={handleSelectFixture}
              />
            </FrameBody>
          </Frame>

          <Frame className="min-h-0 flex-1 animate-cotton-rise" style={{ animationDelay: "120ms" }}>
            <FrameBody>
              <RecentPostsPreview
                posts={posts}
                players={players}
                uid={me.uid}
                likesByPost={likesByPost}
                onToggleLike={onToggleLike}
                onSelectParticipant={handleSelectParticipant}
                onDeletePost={onDeletePost}
                onSaveEdit={onSaveEdit}
                onRefetch={onRefetchPosts}
              />
              {(likeError || forumActionError) && (
                <p role="alert" className="shrink-0 px-5 pb-2 text-[0.72rem] text-color_remove sm:px-6">
                  {likeError ?? forumActionError}
                </p>
              )}
              <ForumPreviewFooter />
            </FrameBody>
          </Frame>
        </div>

        <HomeHero className="h-[26rem] lg:h-full animate-cotton-rise" style={{ animationDelay: "180ms" }} />

        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          <Frame className="h-60 shrink-0 animate-cotton-rise" style={{ animationDelay: "240ms" }}>
            <FrameBody>
              <NearbyStandingsList
                entries={entries}
                players={players}
                myUid={me.uid}
                onSelectParticipant={handleSelectParticipant}
              />
            </FrameBody>
          </Frame>

          <Frame className="min-h-0 flex-1 animate-cotton-rise" style={{ animationDelay: "300ms" }}>
            <FrameBody>
              {/* No FrameHeader on this page — the online-count badge that
                  used to live in Sohbet's navy header band moves here as a
                  quiet inline line instead (design spec 2026-08-03,
                  "Chat cell" section). */}
              <div className="flex shrink-0 items-center justify-end px-5 py-2 sm:px-6">
                <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.1em] text-color_textsecondary uppercase tnum">
                  <span className="size-1.5 rounded-full bg-color_accent" aria-hidden />
                  {onlineCount} çevrimiçi
                </span>
              </div>
              <ChatRoom
                uid={me.uid}
                players={players}
                mentionCandidates={players}
                messages={messages}
                onLoadOlder={onLoadOlderMessages}
                loadingOlder={loadingOlderMessages}
                hasMoreOlder={hasMoreOlderMessages}
                typingUids={typingUids}
                onSelectParticipant={handleSelectParticipant}
                lobbyId={null}
              />
            </FrameBody>
          </Frame>
        </div>
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
        onSelectFixture={handleSelectFixture}
        tournamentStarted
      />
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={(open) => {
          if (!open) setSelectedFixtureId(null);
        }}
        phase="leaguephase"
        tournamentStarted
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/home/HomeLandingLoggedInStarted.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/home/HomeLandingLoggedInStarted.tsx src/home/HomeLandingLoggedInStarted.test.tsx
git commit -m "Add HomeLandingLoggedInStarted composition"
```

---

## Task 4: Build `LoggedInHomeStarted` data wrapper

**Files:**
- Create: `src/home/LoggedInHomeStarted.tsx`
- Create: `src/home/LoggedInHomeStarted.test.tsx`

**Interfaces:**
- Consumes: `HomeLandingLoggedInStarted` (Task 3, exact prop shape above); existing hooks `useAuth` (`../auth/AuthProvider`), `useProfile` (`../profile/useProfile`), `useMessages` (`../chat/useMessages`), `usePresenceHeartbeat`/`useOnlineCount` (`../chat/usePresence`), `useTypingUsers` (`../chat/useTypingStatus`), `usePosts` (`../forum/usePosts`), `buildLikesByPost`/`setPostLiked` (`../forum/postLikes`), `deletePost` (`../forum/deletePost`), `editPost` (`../forum/editPost`), `resolveMentionedUids` (`../chat/chatMentions`) — all with the same signatures `LoggedInHome.tsx` already uses.
- Produces: `LoggedInHomeStarted({ players: Player[], results: Record<string, TeamResult>, entries: LeaderboardEntry[] }): JSX.Element`. Task 5 renders this with these exact prop names.

- [ ] **Step 1: Write the failing tests**

Create `src/home/LoggedInHomeStarted.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoggedInHomeStarted } from "./LoggedInHomeStarted";
import { Player } from "../profile/usePlayers";
import { PostWithId } from "../forum/postTypes";

function makePost(overrides: Partial<PostWithId> = {}): PostWithId {
  return {
    id: "p1",
    uid: "uid1",
    text: "Merhaba",
    imageURL: null,
    parentId: null,
    createdAt: 1,
    editedAt: null,
    mentionedUids: [],
    quotedPostId: null,
    quotedAuthorUid: null,
    quotedText: null,
    likedByUids: [],
    ...overrides,
  };
}

const mockUseAuth = vi.fn();
const mockUseProfile = vi.fn();
const mockUseMessages = vi.fn();
const mockUsePresenceHeartbeat = vi.fn();
const mockUseOnlineCount = vi.fn();
const mockUseTypingUsers = vi.fn();
const mockUsePosts = vi.fn();
const mockSetPostLiked = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("../profile/useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));
vi.mock("../chat/useMessages", () => ({
  useMessages: () => mockUseMessages(),
}));
vi.mock("../chat/usePresence", () => ({
  usePresenceHeartbeat: (uid: string | null) => mockUsePresenceHeartbeat(uid),
  useOnlineCount: () => mockUseOnlineCount(),
}));
vi.mock("../chat/useTypingStatus", () => ({
  useTypingUsers: (excludeUid: string) => mockUseTypingUsers(excludeUid),
}));
vi.mock("../forum/usePosts", () => ({
  usePosts: () => mockUsePosts(),
}));
vi.mock("../forum/postLikes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../forum/postLikes")>();
  return {
    ...actual,
    setPostLiked: (...args: unknown[]) => mockSetPostLiked(...args),
  };
});

vi.mock("./HomeLandingLoggedInStarted", () => ({
  HomeLandingLoggedInStarted: ({
    me,
    likesByPost,
    loadingOlderMessages,
    hasMoreOlderMessages,
    onlineCount,
    typingUids,
    onLoadOlderMessages,
    onToggleLike,
    likeError,
  }: {
    me: Player;
    likesByPost: Map<string, Set<string>>;
    loadingOlderMessages: boolean;
    hasMoreOlderMessages: boolean;
    onlineCount: number;
    typingUids: string[];
    onLoadOlderMessages: () => void;
    onToggleLike: (postId: string) => void;
    likeError: string | null;
  }) => (
    <div>
      <p>
        home-landing-loggedin-started:{me.uid}:{likesByPost.get("p1")?.size ?? 0}:
        {String(loadingOlderMessages)}:{String(hasMoreOlderMessages)}:{onlineCount}:{typingUids.length}
      </p>
      {likeError && <p role="alert">{likeError}</p>}
      <button onClick={() => onToggleLike("p1")}>toggle-like</button>
      <button onClick={onLoadOlderMessages}>load-older</button>
    </div>
  ),
}));

const players: Player[] = [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 }];

describe("LoggedInHomeStarted", () => {
  const mockLoadOlder = vi.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
      loading: false,
    });
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadOlder: mockLoadOlder,
      loadingOlder: false,
      hasMoreOlder: true,
    });
    mockUsePresenceHeartbeat.mockReset();
    mockUseOnlineCount.mockReturnValue(4);
    mockUseTypingUsers.mockReturnValue([]);
    mockUsePosts.mockReturnValue({ posts: [], loading: false, refetch: vi.fn() });
    mockSetPostLiked.mockReset();
  });

  it("renders nothing while there's no signed-in user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing if the profile hasn't loaded yet (shouldn't normally happen post-ProfileGate)", () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    const { container } = render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("combines the auth uid with the fetched profile into `me` and renders the view", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(screen.getByText("home-landing-loggedin-started:uid1:0:false:true:4:0")).toBeInTheDocument();
  });

  it("sends a presence heartbeat for the signed-in uid", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(mockUsePresenceHeartbeat).toHaveBeenCalledWith("uid1");
  });

  it("excludes the current user from their own typing-users list", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(mockUseTypingUsers).toHaveBeenCalledWith("uid1");
  });

  it("wires the loadOlder callback from useMessages through to the view", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    fireEvent.click(screen.getByText("load-older"));
    expect(mockLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("calls setPostLiked with true when liking a post nobody's uid has liked yet", async () => {
    mockSetPostLiked.mockResolvedValue(undefined);
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", true));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error when the like write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSetPostLiked.mockRejectedValue(new Error("permission-denied"));
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi, tekrar deneyin."));
    consoleErrorSpy.mockRestore();
  });

  it("calls setPostLiked with false when the post is already liked by this uid, per the live posts data", async () => {
    mockUsePosts.mockReturnValue({ posts: [makePost({ id: "p1", likedByUids: ["uid1"] })], loading: false, refetch: vi.fn() });
    mockSetPostLiked.mockResolvedValue(undefined);
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);

    expect(screen.getByText("home-landing-loggedin-started:uid1:1:false:true:4:0")).toBeInTheDocument();
    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", false));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/home/LoggedInHomeStarted.test.tsx`
Expected: FAIL — `Cannot find module './LoggedInHomeStarted'`.

- [ ] **Step 3: Create `LoggedInHomeStarted.tsx`**

```tsx
import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../profile/useProfile";
import { useMessages } from "../chat/useMessages";
import { usePresenceHeartbeat, useOnlineCount } from "../chat/usePresence";
import { useTypingUsers } from "../chat/useTypingStatus";
import { usePosts } from "../forum/usePosts";
import { buildLikesByPost, setPostLiked } from "../forum/postLikes";
import { deletePost } from "../forum/deletePost";
import { editPost } from "../forum/editPost";
import { resolveMentionedUids } from "../chat/chatMentions";
import { HomeLandingLoggedInStarted } from "./HomeLandingLoggedInStarted";
import type { Player } from "../profile/usePlayers";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";

interface LoggedInHomeStartedProps {
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
}

/**
 * Data-fetching wrapper around HomeLandingLoggedInStarted, mirroring
 * LoggedInHome.tsx's role for the not-started page: useMessages() is
 * gated on `request.auth != null` by firestore.rules, so it must only ever
 * mount for a signed-in visitor, which HomePage.tsx guarantees by only
 * rendering this component on the loggedin_leaguephase branch. Unlike
 * LoggedInHome, this page has no Katılımcılar/lobby-switching UI at all, so
 * none of the lobby or prediction-submitter hooks are fetched here (design
 * spec 2026-08-03).
 */
export function LoggedInHomeStarted({ players, results, entries }: LoggedInHomeStartedProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { messages, loading: messagesLoading, loadOlder, loadingOlder, hasMoreOlder } = useMessages();
  const { posts, loading: postsLoading, refetch: refetchPosts } = usePosts();

  usePresenceHeartbeat(user?.uid ?? null);
  const onlineCount = useOnlineCount();
  const typingUids = useTypingUsers(user?.uid ?? "");

  const likesByPost = useMemo(() => buildLikesByPost(posts), [posts]);

  const [likeError, setLikeError] = useState<string | null>(null);
  const [forumActionError, setForumActionError] = useState<string | null>(null);

  async function handleToggleLike(postId: string) {
    if (!user) return;
    const uid = user.uid;
    const wasLiked = likesByPost.get(postId)?.has(uid) ?? false;
    setLikeError(null);
    try {
      await setPostLiked(postId, uid, !wasLiked);
    } catch (err) {
      console.error("Failed to toggle post like", err);
      setLikeError("Beğeni kaydedilemedi, tekrar deneyin.");
    }
  }

  async function handleDeletePost(postId: string) {
    setForumActionError(null);
    const replies = posts.filter((p) => p.parentId === postId);
    const replyIds = replies.map((p) => p.id);
    const imageURLs = [posts.find((p) => p.id === postId)?.imageURL ?? null, ...replies.map((p) => p.imageURL)];
    try {
      await deletePost(postId, replyIds, imageURLs);
      refetchPosts();
    } catch (err) {
      console.error("Failed to delete post", err);
      setForumActionError("Gönderi silinemedi, tekrar deneyin.");
    }
  }

  async function handleSaveEdit(postId: string, text: string) {
    setForumActionError(null);
    try {
      await editPost(postId, text, resolveMentionedUids(text, players));
      refetchPosts();
    } catch (err) {
      console.error("Failed to edit post", err);
      setForumActionError("Gönderi güncellenemedi, tekrar deneyin.");
    }
  }

  if (!user || profileLoading || messagesLoading || postsLoading || !profile) {
    return null;
  }

  return (
    <HomeLandingLoggedInStarted
      me={{ uid: user.uid, ...profile }}
      players={players}
      results={results}
      entries={entries}
      messages={messages}
      onLoadOlderMessages={loadOlder}
      loadingOlderMessages={loadingOlder}
      hasMoreOlderMessages={hasMoreOlder}
      onlineCount={onlineCount}
      typingUids={typingUids}
      posts={posts}
      likesByPost={likesByPost}
      onToggleLike={handleToggleLike}
      likeError={likeError}
      onDeletePost={handleDeletePost}
      onSaveEdit={handleSaveEdit}
      onRefetchPosts={refetchPosts}
      forumActionError={forumActionError}
    />
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/home/LoggedInHomeStarted.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/home/LoggedInHomeStarted.tsx src/home/LoggedInHomeStarted.test.tsx
git commit -m "Add LoggedInHomeStarted data wrapper"
```

---

## Task 5: Wire `loggedin_leaguephase` routing into `HomePage.tsx`

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `LoggedInHomeStarted` (Task 4, `{ players: Player[], results: Record<string, TeamResult>, entries: LeaderboardEntry[] }`).

- [ ] **Step 1: Write the failing test**

In `src/pages/HomePage.test.tsx`, add this mock alongside the existing `vi.mock("../home/HomeLandingLoggedOutStarted", ...)` block:

```tsx
vi.mock("../home/LoggedInHomeStarted", () => ({
  LoggedInHomeStarted: ({ players }: { players: unknown[] }) => (
    <div>logged-in-home-started:{players.length}</div>
  ),
}));
```

Add this test after the `"loggedout_leaguephase: ..."` test:

```tsx
  it("loggedin_leaguephase: renders the dedicated started/logged-in landing page instead of the shared skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }, { uid: "c" }, { uid: "d" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("logged-in-home-started:4")).toBeInTheDocument();
    expect(screen.queryByText("team-table")).not.toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — the new test finds `team-table` still rendered (falls through to the shared skeleton) instead of `logged-in-home-started:4`.

- [ ] **Step 3: Update `HomePage.tsx`**

Add the import, alongside the existing ones:

```tsx
import { LoggedInHomeStarted } from "../home/LoggedInHomeStarted";
```

Remove `loggedin_leaguephase: STARTED_LOGGEDIN_BLURB,` from the `BLURB` object (it now has its own dedicated composition and never reaches the code that reads `BLURB`):

```tsx
const BLURB: Partial<Record<VisibilityState, string>> = {
  loggedout_preknockout: STARTED_LOGGEDOUT_BLURB,
  loggedin_preknockout: STARTED_LOGGEDIN_BLURB,
  loggedout_knockout: STARTED_LOGGEDOUT_BLURB,
  loggedin_knockout: STARTED_LOGGEDIN_BLURB,
};
```

Add the new early return immediately after the existing `loggedout_leaguephase` one:

```tsx
  if (state === "loggedout_leaguephase") {
    return <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} />;
  }
  if (state === "loggedin_leaguephase") {
    return <LoggedInHomeStarted results={results} players={players} entries={entries} />;
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run test`
Expected: PASS, full suite green.

Run: `npx tsc -b`
Expected: clean, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "Route loggedin_leaguephase to the new Home composition"
```

---

## Task 6: Manual verification

Not TDD — a manual/Playwright check, since `loggedin_leaguephase` requires a genuinely signed-in DevPanel session (PROJECT_STATE §6.9's documented auth gate) that can't be scripted into the automated suite.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in with a real Google account, then open `/dev`**

Force the tournament phase to `leaguephase` via the DevPanel.

- [ ] **Step 3: Navigate to `/` and visually verify**

- Welcome banner renders with the real signed-in name/photo, and shows **no** "Tahminini Yap" CTA regardless of whether this account has a submitted prediction.
- Three columns render: [upcoming matches / forum] | hero carousel | [nearby standings / chat] — no navy header band on any of the five cells.
- Clicking an upcoming-fixture row opens the Matchup Popup; clicking a team crest within it opens the Team Popup.
- Clicking a row in the nearby-standings widget opens the Participant Popup.
- Chat sends/receives a message with no lobby switcher or management gear visible anywhere in that cell, and shows the online-count line above the transcript.
- No console errors.

- [ ] **Step 4: Report findings**

If anything looks wrong, note it — do not fix silently; surface it for a follow-up decision.
