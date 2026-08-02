# Great Leap: Started-Phase Home + Registration Closing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `HomePage.tsx`'s placeholder `BLURB` skeleton with real compositions for all six started `VisibilityState`s (`loggedin_leaguephase`, `loggedin_preknockout`, `loggedin_knockout`, `loggedout_leaguephase`, `loggedout_preknockout`, `loggedout_knockout`), and close new-account registration once the tournament starts.

**Architecture:** Two new top-level Home compositions — `StartedHomeLoggedIn.tsx` (a six-widget jigsaw grid: league table/bracket-widget swap, rank-history graph, chat, forum, mini-leaderboard, upcoming matches) and `StartedHomeLoggedOut.tsx` (a `LeaderboardPage.tsx`-style composition with the same bracket swap, built as its own component rather than a shared extraction from `LeaderboardPage.tsx` — GREAT_LEAP_SPEC.md §5.4 is explicit that the bracket widget only ever appears in *two* places, "this compact home widget, plus the read-only Profile view," so the real `/leaderboard` route must stay untouched). `LoggedInHome.tsx` (already the sole data-wrapper for the not-started logged-in home) is generalized into the sole data-wrapper for *every* logged-in home state, branching internally on phase. Three widgets are pulled out of existing components into standalone, reusable pieces so both the not-started and started homes share one implementation instead of two: `ChatCell`/`ForumCell` (extracted from `HomeLandingLoggedIn.tsx`) and `FixtureRow` (extracted from `UpcomingMatchesDrawer.tsx`). Two widgets are new pure-derivation + presentational pairs: the mini-leaderboard (a sliding 5-row window over `useLeaderboard()`'s already-ranked entries) and the rank-history graph (a hand-rolled SVG line over Plan 1's `useRankSnapshots()`, with a league→bracket handoff mark derived from comparing a snapshot's matchday against the league phase's own fixed matchday count — no new data-layer field needed). Registration closing is a small, self-contained addition to `ProfileGate.tsx`: a never-onboarded account in a started phase sees a dedicated `RegistrationClosedScreen` (embedding `StartedHomeLoggedOut` itself) instead of `SignupFlow`, fully containing the blast radius to one new component so no other existing page needs to be made defensive against an authenticated-but-profile-less user.

**Tech Stack:** React 18.3 + TypeScript 5.5 (strict), react-router-dom v6 `HashRouter`, Tailwind v4, shadcn `base-nova`/`@base-ui/react`, `motion`, Firebase v10 client SDK, Vitest 2 + `@testing-library/react`. No charting library — hand-rolled SVG, matching the codebase's existing convention (confirmed: no chart dependency anywhere in `package.json`'s neighborhood of files touched by this plan).

## Global Constraints

- No admin UI, no real results/live-data integration, no Stats redesign, no security/optimization pass, no automatic calendar-driven phase timer, no mobile/responsive work, no real crests (GREAT_LEAP_SPEC.md §1.2) — all out of scope, unchanged by this plan.
- Do not touch `src/pages/StatsPage.tsx` or its widgets (§1.2).
- `src/pages/PlaceholderPage.tsx`, `src/predictions/SubmissionCounter.tsx`, `src/leaderboard/LeaderboardCells.tsx`, `team_logos/` stay untouched — confirmed dead but Mert said keep them (§1.3).
- The real `/leaderboard` route (`src/pages/LeaderboardPage.tsx`) is **not modified** by this plan — GREAT_LEAP_SPEC.md §5.4 restricts the bracket widget to exactly two surfaces (Home, Profile), so `StartedHomeLoggedOut.tsx` is a standalone component, not a shared extraction from `LeaderboardPage.tsx`.
- Desktop-only, fixed-viewport app shell — no responsive breakpoints added, nothing should introduce page-level scrolling (PROJECT_STATE.md §9).
- Every new logic file (hooks, derivation helpers, scoring functions) gets its own co-located `.test.ts`/`.test.tsx` file. Pure type-only files do not.
- This plan depends on Plan 1 (`docs/superpowers/plans/2026-08-02-great-leap-data-layer.md`) for `useRankSnapshots`, `RankSnapshot`/`RankSnapshotEntry`, `useBracketState`, `useBracketPrediction`, `useCurrentMatchday`, and on Plan 2 (`docs/superpowers/plans/2026-08-02-great-leap-bracket-feature.md`) for `BracketCtaBanner`, `BracketWidget`, `BracketState`, `bracketStructure.ts`'s `Round`/`ROUND_ORDER`/`matchupsForRound`. Both plans' exact produced interfaces are trusted as-is (reproduced inline in each task below where consumed) — this plan does not re-derive or re-verify them.
- The registration-closing behavior (§4) is Mert's explicit "your call" delegation, not a firm spec — this plan documents the implementer's-judgment calls made (see Task 13) so Mert can veto them once built, per §4's own instruction.

---

## File Structure

**New files:**
- `src/home/ChatCell.tsx` — the chat widget, extracted from `HomeLandingLoggedIn.tsx`'s fourth cell (`ChatRoom` + `LobbySwitcher` + online-count badge + management-panel trigger), parametrized so both the not-started and started homes can render it.
- `src/home/ChatCell.test.tsx`
- `src/home/ForumCell.tsx` — the forum widget, extracted from `HomeLandingLoggedIn.tsx`'s second cell (`RecentPostsPreview` + `ForumPreviewFooter`).
- `src/home/ForumCell.test.tsx`
- `src/leaderboard/FixtureRow.tsx` — one fixture's row markup (home crest/name/place, date/time, away crest/name/place), extracted from `UpcomingMatchesDrawer.tsx`'s `.map()` body, plus the `place()` helper it needs.
- `src/leaderboard/FixtureRow.test.tsx`
- `src/leaderboard/miniLeaderboardWindow.ts` — `selectMiniLeaderboardWindow`, pure.
- `src/leaderboard/miniLeaderboardWindow.test.ts`
- `src/home/MiniLeaderboardWidget.tsx` — always-5-rows leaderboard widget for the started Home grid.
- `src/home/MiniLeaderboardWidget.test.tsx`
- `src/home/UpcomingMatchesWidget.tsx` — 3-row, always-visible-inline fixtures widget (no drawer), built on `FixtureRow`.
- `src/home/UpcomingMatchesWidget.test.tsx`
- `src/bracket/deriveCurrentRound.ts` — `deriveCurrentRound`, pure, derives the bracket's "current live round" from `BracketState` for `BracketWidget`'s `currentRound` prop.
- `src/bracket/deriveCurrentRound.test.ts`
- `src/leaderboard/rankHistoryChart.ts` — `buildRankHistoryPoints` + `findBracketHandoffMatchday`, pure, data prep for the rank-history graph.
- `src/leaderboard/rankHistoryChart.test.ts`
- `src/home/RankHistoryGraph.tsx` — the wide-short SVG line-chart widget (§2.7).
- `src/home/RankHistoryGraph.test.tsx`
- `src/home/StartedHomeLoggedIn.tsx` — the six-widget jigsaw grid for `loggedin_leaguephase`/`preknockout`/`knockout`.
- `src/home/StartedHomeLoggedIn.test.tsx`
- `src/home/StartedHomeLoggedOut.tsx` — the `LeaderboardPage`-style composition (with bracket swap) for `loggedout_leaguephase`/`preknockout`/`knockout`.
- `src/home/StartedHomeLoggedOut.test.tsx`
- `src/profile/RegistrationClosedScreen.tsx` — the self-contained "registration closed" spectator screen for §4.
- `src/profile/RegistrationClosedScreen.test.tsx`

**Modified files:**
- `src/home/HomeLandingLoggedIn.tsx` — refactored to render the new `ChatCell`/`ForumCell` in place of its own inline JSX (behavior-preserving).
- `src/leaderboard/UpcomingMatchesDrawer.tsx` — refactored to render `FixtureRow` in its `.map()` (behavior-preserving), importing `place` from the new file instead of defining it locally.
- `src/leaderboard/TeamTable.tsx` — gains a `className?: string` prop (threaded onto its outer wrapper, confirmed at `src/leaderboard/TeamTable.tsx:264` and `:364` — both of its two return branches share the same `<div className="relative h-full">` outer shape) and a `data-testid="team-table"` on that same wrapper, needed by Task 10/11 to size it inside their grids and to distinguish it from `BracketWidget` in tests. Confirmed neither prop exists on it today.
- `src/home/LoggedInHome.tsx` — generalized from "not-started-only data wrapper" into "every logged-in state's data wrapper," fetching the additional started-phase data (`useTournamentPhase`, `useBracketState`, `useBracketPrediction`, `useRankSnapshots`) and branching between `HomeLandingLoggedIn` and `StartedHomeLoggedIn`.
- `src/pages/HomePage.tsx` — the `BLURB`-based shared skeleton is deleted; `HomePage` becomes a pure router over `loggedIn`/`started` delegating to `LoggedInHome`, `StartedHomeLoggedOut`, or `HomeLandingLoggedOut`.
- `src/profile/ProfileGate.tsx` — gains the phase-aware registration-closing branch (§4), ahead of the existing `SignupFlow` branch.

---

### Task 1: Extract `ChatCell`

**Files:**
- Create: `src/home/ChatCell.tsx`
- Test: `src/home/ChatCell.test.tsx`
- Modify: `src/home/HomeLandingLoggedIn.tsx:264-341` (its fourth `CELL_ROW` cell)

**Interfaces:**
- Consumes: `ChatRoom` from `../chat/ChatRoom` (`ChatRoomProps {uid, players, mentionCandidates?, messages, onLoadOlder, loadingOlder, hasMoreOlder, typingUids, onSelectParticipant, lobbyId?}`, confirmed at `src/chat/ChatRoom.tsx:17-36`); `LobbySwitcher`, `getLobbySwitcherLabel` from `../lobbies/LobbySwitcher`; `buildPlayersByUid` from `../profile/playersByUid`; `Settings` icon from `lucide-react`; `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` from `@/components/ui/frame`; types `MyLobby` from `../lobbies/useMyLobbies`, `LobbyMember` from `../lobbies/lobbyTypes`, `Player` from `../profile/usePlayers`, `MessageWithId` from `../chat/useMessages`, `ReturnType<typeof useLobbyMessages>` from `../lobbies/useLobbyMessages`.
- Produces: `ChatCell(props)` — a `Frame` with the exact same header (lobby-switcher label, settings gear when a Special Lobby is active, online-count badge, `LobbySwitcher`) and body (`ChatRoom`) as `HomeLandingLoggedIn.tsx`'s current fourth cell. Deliberately excludes lobby *creation* (no "Özel lobi oluştur" button, no create-dialog wiring) — that UI lives in `HomeLandingLoggedIn.tsx`'s separate Katılımcılar cell (lines 227-262), which §2.2's "identical to the chat cell" scope never included in the first place, and which the started-phase Home (Task 10) has no equivalent of (see Task 10's note). `className`/`style` are forwarded so each parent controls its own grid sizing. Task 10 (`StartedHomeLoggedIn.tsx`) and the refactored `HomeLandingLoggedIn.tsx` both render this.

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/ChatCell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatCell } from "./ChatCell";
import type { MyLobby } from "../lobbies/useMyLobbies";

const PLAYERS = [
  { uid: "uid1", firstName: "A", lastName: "B", photoURL: "", createdAt: 1 },
  { uid: "uid2", firstName: "C", lastName: "D", photoURL: "", createdAt: 1 },
];

const LOBBY_MESSAGES = {
  messages: [],
  loadOlder: vi.fn(),
  loadingOlder: false,
  hasMoreOlder: false,
};

function baseProps() {
  return {
    myUid: "uid1",
    players: PLAYERS,
    myLobbies: [] as MyLobby[],
    sohbetLobbyId: null,
    onChangeSohbetLobby: vi.fn(),
    onOpenLobbyManagement: vi.fn(),
    sohbetLobbyMembers: [],
    sohbetLobbyMessages: LOBBY_MESSAGES,
    messages: [],
    onLoadOlderMessages: vi.fn(),
    loadingOlderMessages: false,
    hasMoreOlderMessages: false,
    onlineCount: 3,
    typingUids: [],
    onSelectParticipant: vi.fn(),
  };
}

describe("ChatCell", () => {
  it("shows the online count", () => {
    render(<ChatCell {...baseProps()} />);
    expect(screen.getByText(/3 çevrimiçi/)).toBeInTheDocument();
  });

  it("shows the Genel (global chat) label when no Special Lobby is active", () => {
    render(<ChatCell {...baseProps()} />);
    expect(screen.getByText("Genel")).toBeInTheDocument();
  });

  it("does not render a settings gear when no Special Lobby is active", () => {
    render(<ChatCell {...baseProps()} />);
    expect(screen.queryByLabelText("Özel lobi ayarları")).not.toBeInTheDocument();
  });

  it("shows the settings gear once a Special Lobby is active", () => {
    const lobby: MyLobby = { id: "lobby1", name: "Arkadaşlar", createdByUid: "uid1", createdAt: 1, myJoinedAt: 1 };
    render(<ChatCell {...baseProps()} myLobbies={[lobby]} sohbetLobbyId="lobby1" />);
    expect(screen.getByLabelText("Özel lobi ayarları")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ChatCell`
Expected: FAIL with "Cannot find module './ChatCell'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/home/ChatCell.tsx
import { CSSProperties } from "react";
import { Settings } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { ChatRoom } from "../chat/ChatRoom";
import { LobbySwitcher, getLobbySwitcherLabel } from "../lobbies/LobbySwitcher";
import { buildPlayersByUid } from "../profile/playersByUid";
import type { MyLobby } from "../lobbies/useMyLobbies";
import type { useLobbyMessages } from "../lobbies/useLobbyMessages";
import type { LobbyMember } from "../lobbies/lobbyTypes";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";

interface ChatCellProps {
  className?: string;
  style?: CSSProperties;
  myUid: string;
  players: Player[];
  myLobbies: MyLobby[];
  sohbetLobbyId: string | null;
  onChangeSohbetLobby: (id: string | null) => void;
  onOpenLobbyManagement: (id: string) => void;
  sohbetLobbyMembers: LobbyMember[];
  sohbetLobbyMessages: ReturnType<typeof useLobbyMessages>;
  messages: MessageWithId[];
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  onlineCount: number;
  typingUids: string[];
  onSelectParticipant: (uid: string) => void;
}

/**
 * GREAT_LEAP_SPEC.md §2.2: identical chat cell for both the not-started and
 * started logged-in homes. Extracted from HomeLandingLoggedIn.tsx's fourth
 * cell so both callers share one implementation. No lobby-creation UI here —
 * that lived in HomeLandingLoggedIn.tsx's separate Katılımcılar cell, which
 * this chat cell was never part of.
 */
export function ChatCell({
  className,
  style,
  myUid,
  players,
  myLobbies,
  sohbetLobbyId,
  onChangeSohbetLobby,
  onOpenLobbyManagement,
  sohbetLobbyMembers,
  sohbetLobbyMessages,
  messages,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreOlderMessages,
  onlineCount,
  typingUids,
  onSelectParticipant,
}: ChatCellProps) {
  const playersByUid = buildPlayersByUid(players);
  const sohbetDisplayPlayers = sohbetLobbyId
    ? sohbetLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
    : players;

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">
          {getLobbySwitcherLabel(myLobbies, sohbetLobbyId)}
        </FrameTitle>
        <div className="flex items-center gap-2">
          {sohbetLobbyId && (
            <button
              type="button"
              onClick={() => onOpenLobbyManagement(sohbetLobbyId)}
              aria-label="Özel lobi ayarları"
              className="cursor-pointer text-color_textsecondary hover:text-color_accent"
            >
              <Settings className="size-3.5" aria-hidden />
            </button>
          )}
          <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.1em] text-color_text/70 uppercase tnum">
            <span className="size-1.5 rounded-full bg-color_accent" aria-hidden />
            {onlineCount} çevrimiçi
          </span>
          <LobbySwitcher options={myLobbies} current={sohbetLobbyId} onChange={onChangeSohbetLobby} />
        </div>
      </FrameHeader>
      <FrameBody>
        <ChatRoom
          uid={myUid}
          players={players}
          mentionCandidates={sohbetDisplayPlayers}
          messages={sohbetLobbyId ? sohbetLobbyMessages.messages : messages}
          onLoadOlder={sohbetLobbyId ? sohbetLobbyMessages.loadOlder : onLoadOlderMessages}
          loadingOlder={sohbetLobbyId ? sohbetLobbyMessages.loadingOlder : loadingOlderMessages}
          hasMoreOlder={sohbetLobbyId ? sohbetLobbyMessages.hasMoreOlder : hasMoreOlderMessages}
          typingUids={sohbetLobbyId ? [] : typingUids}
          onSelectParticipant={onSelectParticipant}
          lobbyId={sohbetLobbyId}
        />
      </FrameBody>
    </Frame>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ChatCell`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/home/ChatCell.tsx src/home/ChatCell.test.tsx
git commit -m "feat: extract ChatCell for reuse across not-started and started Home"
```

- [ ] **Step 6: Refactor `HomeLandingLoggedIn.tsx` to use `ChatCell`**

Replace the fourth `Frame` in `HomeLandingLoggedIn.tsx`'s `CELL_ROW` (currently lines 295-341, the one with `getLobbySwitcherLabel(myLobbies, sohbetLobbyId)` as its title) with:

```tsx
<ChatCell
  className={CELL}
  style={{ animationDelay: "240ms" }}
  myUid={me.uid}
  players={players}
  myLobbies={myLobbies}
  sohbetLobbyId={sohbetLobbyId}
  onChangeSohbetLobby={onChangeSohbetLobby}
  onOpenLobbyManagement={onOpenLobbyManagement}
  sohbetLobbyMembers={sohbetLobbyMembers}
  sohbetLobbyMessages={sohbetLobbyMessages}
  messages={messages}
  onLoadOlderMessages={onLoadOlderMessages}
  loadingOlderMessages={loadingOlderMessages}
  hasMoreOlderMessages={hasMoreOlderMessages}
  onlineCount={onlineCount}
  typingUids={typingUids}
  onSelectParticipant={setSelectedPlayerUid}
/>
```

Add `import { ChatCell } from "./ChatCell";` alongside the file's existing imports. The now-unused `Settings` icon import, `getLobbySwitcherLabel` import, and `buildPlayersByUid`/`sohbetDisplayPlayers` local computation become dead in this file **only if** nothing else in it still needs them — `buildPlayersByUid`/`katilimcilarDisplayPlayers` (used by the Katılımcılar cell) still needs `buildPlayersByUid`, so keep that import; drop `Settings` and `getLobbySwitcherLabel` only if the Katılımcılar cell's own header (which also calls `getLobbySwitcherLabel(myLobbies, katilimcilarLobbyId)` and its own `Settings` gear) doesn't also need them — it does (confirmed at lines 231, 241), so **keep both imports**, they're still used by the Katılımcılar cell.

- [ ] **Step 7: Run the existing `HomeLandingLoggedIn` test suite to confirm no regression**

Run: `npm test -- HomeLandingLoggedIn`
Expected: PASS — every existing test in `HomeLandingLoggedIn.test.tsx` still passes unchanged, confirming the extraction didn't alter rendered behavior.

- [ ] **Step 8: Commit**

```bash
git add src/home/HomeLandingLoggedIn.tsx
git commit -m "refactor: HomeLandingLoggedIn renders the extracted ChatCell"
```

---

### Task 2: Extract `ForumCell`

**Files:**
- Create: `src/home/ForumCell.tsx`
- Test: `src/home/ForumCell.test.tsx`
- Modify: `src/home/HomeLandingLoggedIn.tsx:264-291` (its second `CELL_ROW` cell)

**Interfaces:**
- Consumes: `RecentPostsPreview`, `ForumPreviewFooter` from `../forum/RecentPostsPreview`; `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` from `@/components/ui/frame`; `Link` from `react-router-dom`; types `Player` from `../profile/usePlayers`, `PostWithId` from `../forum/postTypes`.
- Produces: `ForumCell(props)` — the exact same header (`Link to="/forum"`, title "Forum") and body (`RecentPostsPreview` + inline like/action error + `ForumPreviewFooter`) as `HomeLandingLoggedIn.tsx`'s current second cell. No phase-awareness — GREAT_LEAP_SPEC.md §2.3 is explicit that started phases show the identical forum cell, no "posts about today's matches" filtering. Task 10 and the refactored `HomeLandingLoggedIn.tsx` both render this.

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/ForumCell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForumCell } from "./ForumCell";

function baseProps() {
  return {
    posts: [],
    players: [],
    myUid: "uid1",
    likesByPost: new Map(),
    onToggleLike: vi.fn(),
    onSelectParticipant: vi.fn(),
    onDeletePost: vi.fn(),
    onSaveEdit: vi.fn(),
    onRefetchPosts: vi.fn(),
    likeError: null,
    forumActionError: null,
  };
}

describe("ForumCell", () => {
  it("links its title to /forum", () => {
    render(
      <MemoryRouter>
        <ForumCell {...baseProps()} />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Forum" })).toHaveAttribute("href", "/forum");
  });

  it("surfaces a like error when one is passed", () => {
    render(
      <MemoryRouter>
        <ForumCell {...baseProps()} likeError="Beğeni kaydedilemedi, tekrar deneyin." />
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ForumCell`
Expected: FAIL with "Cannot find module './ForumCell'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/home/ForumCell.tsx
import { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import type { Player } from "../profile/usePlayers";
import type { PostWithId } from "../forum/postTypes";

interface ForumCellProps {
  className?: string;
  style?: CSSProperties;
  posts: PostWithId[];
  players: Player[];
  myUid: string;
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  onSelectParticipant: (uid: string) => void;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  likeError: string | null;
  forumActionError: string | null;
}

/**
 * GREAT_LEAP_SPEC.md §2.3: identical forum cell for both the not-started and
 * started logged-in homes — no phase-aware filtering. Extracted from
 * HomeLandingLoggedIn.tsx's second cell so both callers share one
 * implementation.
 */
export function ForumCell({
  className,
  style,
  posts,
  players,
  myUid,
  likesByPost,
  onToggleLike,
  onSelectParticipant,
  onDeletePost,
  onSaveEdit,
  onRefetchPosts,
  likeError,
  forumActionError,
}: ForumCellProps) {
  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">
          <Link to="/forum" className="cursor-pointer no-underline hover:underline">
            Forum
          </Link>
        </FrameTitle>
      </FrameHeader>
      <FrameBody>
        <RecentPostsPreview
          posts={posts}
          players={players}
          uid={myUid}
          likesByPost={likesByPost}
          onToggleLike={onToggleLike}
          onSelectParticipant={onSelectParticipant}
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
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ForumCell`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/home/ForumCell.tsx src/home/ForumCell.test.tsx
git commit -m "feat: extract ForumCell for reuse across not-started and started Home"
```

- [ ] **Step 6: Refactor `HomeLandingLoggedIn.tsx` to use `ForumCell`**

Replace the second `Frame` in `HomeLandingLoggedIn.tsx`'s `CELL_ROW` (lines 264-291, the "Forum" one) with:

```tsx
<ForumCell
  className={CELL}
  style={{ animationDelay: "120ms" }}
  posts={posts}
  players={players}
  myUid={me.uid}
  likesByPost={likesByPost}
  onToggleLike={onToggleLike}
  onSelectParticipant={setSelectedPlayerUid}
  onDeletePost={onDeletePost}
  onSaveEdit={onSaveEdit}
  onRefetchPosts={onRefetchPosts}
  likeError={likeError}
  forumActionError={forumActionError}
/>
```

Add `import { ForumCell } from "./ForumCell";`. Remove the now-unused `RecentPostsPreview, ForumPreviewFooter` import from `../forum/RecentPostsPreview` — nothing else in this file uses those two components directly anymore.

- [ ] **Step 7: Run the existing `HomeLandingLoggedIn` test suite to confirm no regression**

Run: `npm test -- HomeLandingLoggedIn`
Expected: PASS — no behavior change.

- [ ] **Step 8: Commit**

```bash
git add src/home/HomeLandingLoggedIn.tsx
git commit -m "refactor: HomeLandingLoggedIn renders the extracted ForumCell"
```

---

### Task 3: Extract `FixtureRow`

**Files:**
- Create: `src/leaderboard/FixtureRow.tsx`
- Test: `src/leaderboard/FixtureRow.test.tsx`
- Modify: `src/leaderboard/UpcomingMatchesDrawer.tsx:147-202` (its `.map()` body)

**Interfaces:**
- Consumes: `Fixture` from `../devpanel/fixtures`; `TEAM_BY_ID` from `../predictions/teams`; `TeamResult` from `./teamResultTypes`; `TeamCrest` from `./TeamCrest`.
- Produces: `FixtureRow({fixture, results}: {fixture: Fixture; results: Record<string, TeamResult>})` and `place(results, teamId): string` (exported, so `UpcomingMatchesDrawer.tsx` doesn't need its own copy). Renders one fixture: home place/crest/name, date/time, away crest/name/place — pixel-identical to `UpcomingMatchesDrawer.tsx`'s current row markup, including its intentionally-inert click handlers ("clickable but does nothing yet," Mert's own spec — team-crest/name clicks stop propagation but do not open `TeamPopup`; this plan does not change that). Task 6 (`UpcomingMatchesWidget.tsx`) and the refactored `UpcomingMatchesDrawer.tsx` both render this.

- [ ] **Step 1: Write the failing test**

```tsx
// src/leaderboard/FixtureRow.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FixtureRow, place } from "./FixtureRow";
import type { Fixture } from "../devpanel/fixtures";

const FIXTURE: Fixture = {
  id: "md1-athletic-club-arsenal",
  matchday: 1,
  order: 1,
  homeTeamId: "athletic-club",
  awayTeamId: "arsenal",
  kickoffUtc: "2026-09-16T16:45:00Z",
};

describe("place", () => {
  it("returns the team's table position as a string", () => {
    expect(place({ arsenal: { position: 4 } as any }, "arsenal")).toBe("4");
  });

  it("returns a dash for a team with no recorded result", () => {
    expect(place({}, "arsenal")).toBe("-");
  });
});

describe("FixtureRow", () => {
  it("renders both teams' short names", () => {
    render(<FixtureRow fixture={FIXTURE} results={{}} />);
    expect(screen.getByText("Athletic")).toBeInTheDocument();
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
  });

  it("renders each team's table position", () => {
    render(<FixtureRow fixture={FIXTURE} results={{ arsenal: { position: 4 } as any }} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- FixtureRow`
Expected: FAIL with "Cannot find module './FixtureRow'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/leaderboard/FixtureRow.tsx
import type { KeyboardEvent, MouseEvent } from "react";
import { Fixture } from "../devpanel/fixtures";
import { TEAM_BY_ID } from "../predictions/teams";
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

const ROW_GRID_COLUMNS = "1.25rem minmax(0,1fr) 5rem minmax(0,1fr) 1.25rem";

export function place(results: Record<string, TeamResult>, teamId: string): string {
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
function handleTeamClick(e: MouseEvent) {
  e.stopPropagation();
}

/**
 * One fixture's row: place · home crest+name | date/time | away crest+name ·
 * place. Extracted from UpcomingMatchesDrawer.tsx so the drawer and the
 * always-visible-inline Home widget (GREAT_LEAP_SPEC.md §2.6) share one
 * implementation instead of two.
 */
export function FixtureRow({ fixture, results }: { fixture: Fixture; results: Record<string, TeamResult> }) {
  const home = TEAM_BY_ID[fixture.homeTeamId];
  const away = TEAM_BY_ID[fixture.awayTeamId];
  const kickoff = new Date(fixture.kickoffUtc);

  return (
    <div className="h-24 px-2">
      {/* A div, not a <button> — a real <button> can't contain the home/away
          crest+name buttons below (invalid nesting). */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleMatchClick}
        onKeyDown={handleMatchKeyDown}
        className="grid h-full w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 transition-colors duration-150 ease-[var(--ease-cotton)] outline-none hover:bg-color_hoverfill focus-visible:bg-color_hoverfill"
        style={{ gridTemplateColumns: ROW_GRID_COLUMNS }}
      >
        <span className="font-mono text-xs text-color_textsecondary tnum">{place(results, home.id)}</span>
        <button type="button" onClick={handleTeamClick} className="group flex cursor-pointer flex-col items-center gap-1">
          <TeamCrest teamId={home.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {home.shortName}
          </span>
        </button>

        <span className="flex flex-col items-center justify-center leading-tight">
          <span className="font-mono text-sm text-color_text tnum">{DATE_FMT.format(kickoff)}</span>
          <span className="font-mono text-sm text-color_textsecondary tnum">{TIME_FMT.format(kickoff)}</span>
        </span>

        <button type="button" onClick={handleTeamClick} className="group flex cursor-pointer flex-col items-center gap-1">
          <TeamCrest teamId={away.id} className="size-7" />
          <span className="truncate font-display text-sm font-medium text-color_text group-hover:underline">
            {away.shortName}
          </span>
        </button>
        <span className="font-mono text-xs text-color_textsecondary tnum">{place(results, away.id)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- FixtureRow`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/FixtureRow.tsx src/leaderboard/FixtureRow.test.tsx
git commit -m "feat: extract FixtureRow for reuse across the drawer and inline Home widget"
```

- [ ] **Step 6: Refactor `UpcomingMatchesDrawer.tsx` to use `FixtureRow`**

In `src/leaderboard/UpcomingMatchesDrawer.tsx`, replace the `.map()` body (lines 147-202: `const home = ...` through the closing `);` of the mapped `<div key={fixture.id}>`) with:

```tsx
{shown.map((fixture) => (
  <FixtureRow key={fixture.id} fixture={fixture} results={results} />
))}
```

Add `import { FixtureRow } from "./FixtureRow";`. Remove the now-duplicated local definitions this file no longer needs: the `place()` function, `handleMatchClick`/`handleMatchKeyDown`/`handleTeamClick`, `DATE_FMT`/`TIME_FMT`/`ROW_GRID_COLUMNS`, and the `TEAM_BY_ID`/`TeamCrest` imports they required — all now live in `FixtureRow.tsx`. Keep everything else in this file (the collapsible-panel `open`/`visibleCount`/infinite-scroll logic) unchanged.

- [ ] **Step 7: Add a small regression test, since none exists yet**

Confirmed: `src/leaderboard/UpcomingMatchesDrawer.tsx` has no existing test file at all (unlike `HomeLandingLoggedIn.tsx`, which does — Task 1/2's "run the existing suite" checkpoint doesn't apply here). Rather than backfilling full coverage for this file's pre-existing, unrelated logic (the collapsible open/close state, the infinite-scroll batching) — out of scope for this refactor — add one small, targeted test confirming the `FixtureRow` integration itself didn't break rendering:

```tsx
// src/leaderboard/UpcomingMatchesDrawer.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";

describe("UpcomingMatchesDrawer", () => {
  it("renders real upcoming fixtures via FixtureRow once opened", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    fireEvent.click(screen.getByRole("button", { name: /yaklaşan maçları göster/i }));
    // FIXTURES' real matchday-1 schedule always has upcoming fixtures for
    // any realistic `now` this test suite runs at — Athletic Club vs
    // Arsenal is the first fixture in src/devpanel/fixtures.ts.
    expect(screen.getByText("Athletic")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- UpcomingMatchesDrawer`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/leaderboard/UpcomingMatchesDrawer.tsx src/leaderboard/UpcomingMatchesDrawer.test.tsx
git commit -m "refactor: UpcomingMatchesDrawer renders the extracted FixtureRow"
```

---

### Task 4: Mini-leaderboard windowing

**Files:**
- Create: `src/leaderboard/miniLeaderboardWindow.ts`
- Test: `src/leaderboard/miniLeaderboardWindow.test.ts`

**Interfaces:**
- Consumes: `RankedEntry` from `./ranking`.
- Produces: `MINI_LEADERBOARD_SIZE = 5`, `selectMiniLeaderboardWindow(rankedEntries: RankedEntry[], currentUid: string | null): RankedEntry[]`. Task 5 (`MiniLeaderboardWidget.tsx`) consumes both.

- [ ] **Step 1: Write the failing test**

```ts
// src/leaderboard/miniLeaderboardWindow.test.ts
import { describe, it, expect } from "vitest";
import { selectMiniLeaderboardWindow, MINI_LEADERBOARD_SIZE } from "./miniLeaderboardWindow";
import { RankedEntry } from "./ranking";

function entry(uid: string, rank: number): RankedEntry {
  return { entry: { uid, firstName: uid, lastName: "", photoURL: "", points: 100 - rank, ranking: [] }, rank };
}

const TEN_ENTRIES: RankedEntry[] = Array.from({ length: 10 }, (_, i) => entry(`uid${i + 1}`, i + 1));

describe("selectMiniLeaderboardWindow", () => {
  it("returns every entry unchanged when there are 5 or fewer", () => {
    const three = TEN_ENTRIES.slice(0, 3);
    expect(selectMiniLeaderboardWindow(three, "uid1")).toEqual(three);
  });

  it("shows ranks 1-5 when the current user is at rank 1", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid1");
    expect(window.map((w) => w.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows the last 5 ranks when the current user is at the bottom", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid10");
    expect(window.map((w) => w.rank)).toEqual([6, 7, 8, 9, 10]);
  });

  it("centers a window of exactly MINI_LEADERBOARD_SIZE around a middle-ranked user", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid5");
    expect(window).toHaveLength(MINI_LEADERBOARD_SIZE);
    expect(window.map((w) => w.rank)).toContain(5);
  });

  it("still includes the current user's row even near an edge (not off-window)", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid2");
    expect(window.some((w) => w.entry.uid === "uid2")).toBe(true);
  });

  it("falls back to the top 5 when the current uid isn't in the list (e.g. signed-out)", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, null);
    expect(window.map((w) => w.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- miniLeaderboardWindow`
Expected: FAIL with "Cannot find module './miniLeaderboardWindow'".

- [ ] **Step 3: Write the implementation**

```ts
// src/leaderboard/miniLeaderboardWindow.ts
import { RankedEntry } from "./ranking";

export const MINI_LEADERBOARD_SIZE = 5;

/**
 * GREAT_LEAP_SPEC.md §2.5: always show exactly 5 rows, sliding near the top
 * or bottom of the full list rather than centering the current user (that
 * "2 above, 2 below" idea was explicitly walked back) — this just clamps a
 * centered window into range, which produces the same "slides near the
 * edges" behavior for free.
 */
export function selectMiniLeaderboardWindow(rankedEntries: RankedEntry[], currentUid: string | null): RankedEntry[] {
  if (rankedEntries.length <= MINI_LEADERBOARD_SIZE) return rankedEntries;

  const myIndex = currentUid ? rankedEntries.findIndex((r) => r.entry.uid === currentUid) : -1;
  if (myIndex === -1) return rankedEntries.slice(0, MINI_LEADERBOARD_SIZE);

  const half = Math.floor(MINI_LEADERBOARD_SIZE / 2);
  const start = Math.max(0, Math.min(myIndex - half, rankedEntries.length - MINI_LEADERBOARD_SIZE));
  return rankedEntries.slice(start, start + MINI_LEADERBOARD_SIZE);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- miniLeaderboardWindow`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/miniLeaderboardWindow.ts src/leaderboard/miniLeaderboardWindow.test.ts
git commit -m "feat: add mini-leaderboard sliding-window selector"
```

---

### Task 5: `MiniLeaderboardWidget`

**Files:**
- Create: `src/home/MiniLeaderboardWidget.tsx`
- Test: `src/home/MiniLeaderboardWidget.test.tsx`

**Interfaces:**
- Consumes: `LeaderboardEntry` from `../leaderboard/leaderboardTypes`; `assignRanks`, `RankedEntry` from `../leaderboard/ranking`; `selectMiniLeaderboardWindow` from `../leaderboard/miniLeaderboardWindow` (Task 4); `Avatar`/`AvatarImage`/`AvatarFallback` from `@/components/ui/avatar`; `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` from `@/components/ui/frame`.
- Produces: `MiniLeaderboardWidget({className, style, entries, currentUid, onSelectParticipant}: {className?: string; style?: CSSProperties; entries: LeaderboardEntry[]; currentUid: string | null; onSelectParticipant: (uid: string) => void})`. Task 10 (`StartedHomeLoggedIn.tsx`) renders this, passing the same `entries` from `useLeaderboard()` that feeds the main Leaderboard page (§2.5: "always reflects the same points/rank as the main Leaderboard page").

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/MiniLeaderboardWidget.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniLeaderboardWidget } from "./MiniLeaderboardWidget";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";

function entry(uid: string, points: number): LeaderboardEntry {
  return { uid, firstName: uid, lastName: "X", photoURL: "", points, ranking: [] };
}

const ENTRIES: LeaderboardEntry[] = [entry("uid1", 30), entry("uid2", 20), entry("uid3", 10)];

describe("MiniLeaderboardWidget", () => {
  it("renders exactly 5 rows worth of markup when 5+ entries exist", () => {
    const many = Array.from({ length: 10 }, (_, i) => entry(`uid${i + 1}`, 100 - i));
    render(<MiniLeaderboardWidget entries={many} currentUid="uid1" onSelectParticipant={vi.fn()} />);
    expect(screen.getAllByTestId("mini-leaderboard-row")).toHaveLength(5);
  });

  it("renders one row per entry when fewer than 5 exist, no padding", () => {
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid1" onSelectParticipant={vi.fn()} />);
    expect(screen.getAllByTestId("mini-leaderboard-row")).toHaveLength(3);
  });

  it("shows each row's full name, points, and rank", () => {
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid1" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("uid1 X")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("visually distinguishes the current user's own row", () => {
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid2" onSelectParticipant={vi.fn()} />);
    const rows = screen.getAllByTestId("mini-leaderboard-row");
    expect(rows[1]).toHaveClass("bg-color_hoverfill");
  });

  it("calls onSelectParticipant when a row is clicked", () => {
    const onSelectParticipant = vi.fn();
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid1" onSelectParticipant={onSelectParticipant} />);
    screen.getAllByTestId("mini-leaderboard-row")[0].click();
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MiniLeaderboardWidget`
Expected: FAIL with "Cannot find module './MiniLeaderboardWidget'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/home/MiniLeaderboardWidget.tsx
import { CSSProperties } from "react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { assignRanks } from "../leaderboard/ranking";
import { selectMiniLeaderboardWindow } from "../leaderboard/miniLeaderboardWindow";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface MiniLeaderboardWidgetProps {
  className?: string;
  style?: CSSProperties;
  entries: LeaderboardEntry[];
  currentUid: string | null;
  onSelectParticipant: (uid: string) => void;
}

/**
 * GREAT_LEAP_SPEC.md §2.5: always exactly 5 rows (or fewer if the whole
 * leaderboard has fewer than 5 people — no padding to a fixed 5), sliding
 * near the top/bottom rather than centered, current user visually
 * distinguished, static (no movement indicators).
 */
export function MiniLeaderboardWidget({
  className,
  style,
  entries,
  currentUid,
  onSelectParticipant,
}: MiniLeaderboardWidgetProps) {
  const ranked = assignRanks(entries);
  const window = selectMiniLeaderboardWindow(ranked, currentUid);

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">Lider Tablosu</FrameTitle>
      </FrameHeader>
      <FrameBody className="flex flex-col gap-1 px-3 py-2">
        {window.map(({ entry, rank }) => (
          <button
            key={entry.uid}
            type="button"
            data-testid="mini-leaderboard-row"
            onClick={() => onSelectParticipant(entry.uid)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill ${
              entry.uid === currentUid ? "bg-color_hoverfill font-semibold" : ""
            }`}
          >
            <span className="w-5 shrink-0 font-mono text-xs text-color_textsecondary tnum">{rank}</span>
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={entry.photoURL} alt="" />
              <AvatarFallback className="text-[0.6rem]">{initials(entry.firstName, entry.lastName)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm text-color_text">
              {entry.firstName} {entry.lastName}
            </span>
            <span className="font-mono text-xs text-color_text tnum">{entry.points}</span>
          </button>
        ))}
      </FrameBody>
    </Frame>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MiniLeaderboardWidget`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/home/MiniLeaderboardWidget.tsx src/home/MiniLeaderboardWidget.test.tsx
git commit -m "feat: add always-5-rows mini-leaderboard widget"
```

---

### Task 6: `UpcomingMatchesWidget`

**Files:**
- Create: `src/home/UpcomingMatchesWidget.tsx`
- Test: `src/home/UpcomingMatchesWidget.test.tsx`

**Interfaces:**
- Consumes: `getUpcomingFixtures` from `../leaderboard/upcomingFixtures`; `resolveNow` from `../tournament/now`; `FixtureRow` from `../leaderboard/FixtureRow` (Task 3); `TeamResult` from `../leaderboard/teamResultTypes`; `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` from `@/components/ui/frame`.
- Produces: `UpcomingMatchesWidget({className, style, results}: {className?: string; style?: CSSProperties; results: Record<string, TeamResult>})` — shows the next 3 upcoming fixtures, always inline (no drawer/collapse), reusing `FixtureRow`'s exact row rendering (§2.6). Task 10 renders this.

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/UpcomingMatchesWidget.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../tournament/now", () => ({ resolveNow: () => new Date("2026-09-01T00:00:00Z") }));

import { UpcomingMatchesWidget } from "./UpcomingMatchesWidget";

describe("UpcomingMatchesWidget", () => {
  it("shows exactly 3 fixtures", () => {
    render(<UpcomingMatchesWidget results={{}} />);
    expect(screen.getAllByRole("button", { name: /çevrimiçi|.*/ }).length).toBeGreaterThan(0);
    // Each fixture row renders 2 team buttons (home + away) — 3 rows = 6 buttons.
    expect(document.querySelectorAll("[class*='h-24']")).toHaveLength(3);
  });

  it("shows real team short names, not devMatches placeholders", () => {
    render(<UpcomingMatchesWidget results={{}} />);
    expect(screen.getAllByText(/Arsenal|Athletic|PSV/).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- UpcomingMatchesWidget`
Expected: FAIL with "Cannot find module './UpcomingMatchesWidget'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/home/UpcomingMatchesWidget.tsx
import { CSSProperties, useMemo } from "react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { getUpcomingFixtures } from "../leaderboard/upcomingFixtures";
import { resolveNow } from "../tournament/now";
import { FixtureRow } from "../leaderboard/FixtureRow";
import { TeamResult } from "../leaderboard/teamResultTypes";

const VISIBLE_COUNT = 3;

/**
 * GREAT_LEAP_SPEC.md §2.6: same fixture-row content/treatment as
 * UpcomingMatchesDrawer, but 3 at a time and always visible inline, not
 * behind a collapsible drawer.
 */
export function UpcomingMatchesWidget({
  className,
  style,
  results,
}: {
  className?: string;
  style?: CSSProperties;
  results: Record<string, TeamResult>;
}) {
  const upcoming = useMemo(() => getUpcomingFixtures(resolveNow()).slice(0, VISIBLE_COUNT), []);

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">Yaklaşan Maçlar</FrameTitle>
      </FrameHeader>
      <FrameBody className="flex flex-col">
        {upcoming.map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} results={results} />
        ))}
      </FrameBody>
    </Frame>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- UpcomingMatchesWidget`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/home/UpcomingMatchesWidget.tsx src/home/UpcomingMatchesWidget.test.tsx
git commit -m "feat: add always-visible 3-fixture upcoming-matches widget"
```

---

### Task 7: `deriveCurrentRound`

**Files:**
- Create: `src/bracket/deriveCurrentRound.ts`
- Test: `src/bracket/deriveCurrentRound.test.ts`

**Interfaces:**
- Consumes: `Round`, `ROUND_ORDER`, `matchupsForRound` from `./bracketStructure` (Plan 1 Task 1); `BracketState` from `./bracketState` (Plan 1 Task 2).
- Produces: `deriveCurrentRound(bracketState: BracketState): Round`. Task 10 and Task 11 both call this to derive `BracketWidget`'s `currentRound` prop (Plan 2 Task 10) from live `bracketState`.

- [ ] **Step 1: Write the failing test**

```ts
// src/bracket/deriveCurrentRound.test.ts
import { describe, it, expect } from "vitest";
import { deriveCurrentRound } from "./deriveCurrentRound";
import { BracketState } from "./bracketState";

describe("deriveCurrentRound", () => {
  it("returns ro16 when no matchups have been decided yet", () => {
    const state: BracketState = { ro16Teams: {}, winners: {} };
    expect(deriveCurrentRound(state)).toBe("ro16");
  });

  it("returns ro16 while any RO16 matchup is still undecided", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "ro16-2": "Real Madrid" },
    };
    expect(deriveCurrentRound(state)).toBe("ro16");
  });

  it("returns qf once all 8 RO16 matchups are decided but no QF is", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("qf");
  });

  it("returns sf once RO16 and QF are fully decided", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    for (let i = 1; i <= 4; i++) winners[`qf-${i}`] = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("sf");
  });

  it("returns final once RO16, QF, and SF are fully decided", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    for (let i = 1; i <= 4; i++) winners[`qf-${i}`] = "Team";
    winners["sf-1"] = "Team";
    winners["sf-2"] = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("final");
  });

  it("still returns final once the champion is decided (nothing further to advance to)", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    for (let i = 1; i <= 4; i++) winners[`qf-${i}`] = "Team";
    winners["sf-1"] = "Team";
    winners["sf-2"] = "Team";
    winners.final = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("final");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- deriveCurrentRound`
Expected: FAIL with "Cannot find module './deriveCurrentRound'".

- [ ] **Step 3: Write the implementation**

```ts
// src/bracket/deriveCurrentRound.ts
import { Round, ROUND_ORDER, matchupsForRound } from "./bracketStructure";
import { BracketState } from "./bracketState";

/**
 * GREAT_LEAP_SPEC.md §5.4: the "current live round" is the earliest round
 * that doesn't yet have every one of its matchups decided — matches the
 * worked examples directly (during RO16, not every RO16 matchup is decided
 * yet, so current=ro16; once all 8 are, current becomes qf; and so on).
 * Falls through to "final" once everything (including the Final itself) is
 * decided, since there's no round after it to advance to.
 */
export function deriveCurrentRound(bracketState: BracketState): Round {
  for (const round of ROUND_ORDER) {
    const allDecided = matchupsForRound(round).every((matchup) => bracketState.winners[matchup.id] !== undefined);
    if (!allDecided) return round;
  }
  return "final";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- deriveCurrentRound`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/bracket/deriveCurrentRound.ts src/bracket/deriveCurrentRound.test.ts
git commit -m "feat: derive the bracket's current live round from bracketState"
```

---

### Task 8: Rank-history data prep

**Files:**
- Create: `src/leaderboard/rankHistoryChart.ts`
- Test: `src/leaderboard/rankHistoryChart.test.ts`

**Interfaces:**
- Consumes: `RankSnapshot` from `./rankSnapshotTypes` (Plan 1 Task — `RankSnapshotEntry {uid, points, rank}`, `RankSnapshot {matchday, entries: RankSnapshotEntry[], computedAt}`); `FIXTURES` from `../devpanel/fixtures`.
- Produces: `RankHistoryPoint {matchday: number; rank: number}`, `buildRankHistoryPoints(snapshots: RankSnapshot[], uid: string): RankHistoryPoint[]` (one point per matchday the given uid appears in, sorted ascending by matchday), `findBracketHandoffMatchday(points: RankHistoryPoint[]): number | null` (see note below). Task 9 (`RankHistoryGraph.tsx`) consumes both.

**Note on the handoff mark (§2.7):** there is no dedicated field anywhere recording "which matchday bracket scoring started counting at." This plan derives it instead of adding one: `FIXTURES` (the real league-phase schedule) tops out at matchday 8 — confirmed by inspecting every `matchday` value in `src/devpanel/fixtures.ts`, which only defines the league phase's fixtures (144 matches, matchdays 1-8; the play-off round and knockout rounds aren't modeled as `Fixture`s at all, per GREAT_LEAP_SPEC.md §5.1). Per Plan 1 §7.1's recommended mechanism, `tournamentState/current.currentMatchday` is a single hand-bumped counter — for the rank-history line to "keep going continuously through the knockout rounds" (§2.7) at all, Mert has to keep bumping that same counter past 8 as knockout rounds are decided (RO16=9, QF=10, SF=11, Final=12, or similar — the exact numbering is his call when he does it). Since any `RankSnapshot` with `matchday > 8` can therefore only exist once the league phase's own fixture list is exhausted, i.e., once the knockout stage (and therefore bracket scoring) has begun, the first such snapshot is the correct handoff point — with no new Plan 1 data-model changes required.

- [ ] **Step 1: Write the failing test**

```ts
// src/leaderboard/rankHistoryChart.test.ts
import { describe, it, expect } from "vitest";
import { buildRankHistoryPoints, findBracketHandoffMatchday } from "./rankHistoryChart";
import { RankSnapshot } from "./rankSnapshotTypes";

const SNAPSHOTS: RankSnapshot[] = [
  { matchday: 1, entries: [{ uid: "uid1", points: 3, rank: 2 }, { uid: "uid2", points: 6, rank: 1 }], computedAt: 1 },
  { matchday: 2, entries: [{ uid: "uid1", points: 6, rank: 1 }, { uid: "uid2", points: 6, rank: 1 }], computedAt: 2 },
  { matchday: 3, entries: [{ uid: "uid2", points: 9, rank: 1 }], computedAt: 3 },
];

describe("buildRankHistoryPoints", () => {
  it("returns one point per matchday the uid appears in, sorted ascending", () => {
    expect(buildRankHistoryPoints(SNAPSHOTS, "uid1")).toEqual([
      { matchday: 1, rank: 2 },
      { matchday: 2, rank: 1 },
    ]);
  });

  it("returns an empty array for a uid that never appears in any snapshot", () => {
    expect(buildRankHistoryPoints(SNAPSHOTS, "uid-never-scored")).toEqual([]);
  });

  it("skips matchdays where the uid is absent (e.g. dropped from a later cache)", () => {
    const points = buildRankHistoryPoints(SNAPSHOTS, "uid1");
    expect(points.find((p) => p.matchday === 3)).toBeUndefined();
  });
});

describe("findBracketHandoffMatchday", () => {
  it("returns null when every point is within the league phase's 8 matchdays", () => {
    const points = [{ matchday: 1, rank: 2 }, { matchday: 8, rank: 1 }];
    expect(findBracketHandoffMatchday(points)).toBeNull();
  });

  it("returns the first matchday beyond the league phase's own fixture list", () => {
    const points = [{ matchday: 7, rank: 2 }, { matchday: 8, rank: 1 }, { matchday: 9, rank: 3 }, { matchday: 10, rank: 2 }];
    expect(findBracketHandoffMatchday(points)).toBe(9);
  });

  it("returns null for an empty points list", () => {
    expect(findBracketHandoffMatchday([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- rankHistoryChart`
Expected: FAIL with "Cannot find module './rankHistoryChart'".

- [ ] **Step 3: Write the implementation**

```ts
// src/leaderboard/rankHistoryChart.ts
import { RankSnapshot } from "./rankSnapshotTypes";
import { FIXTURES } from "../devpanel/fixtures";

const LEAGUE_PHASE_MATCHDAY_COUNT = Math.max(...FIXTURES.map((f) => f.matchday));

export interface RankHistoryPoint {
  matchday: number;
  rank: number;
}

export function buildRankHistoryPoints(snapshots: RankSnapshot[], uid: string): RankHistoryPoint[] {
  return snapshots
    .map((snapshot) => {
      const entry = snapshot.entries.find((e) => e.uid === uid);
      return entry ? { matchday: snapshot.matchday, rank: entry.rank } : null;
    })
    .filter((point): point is RankHistoryPoint => point !== null)
    .sort((a, b) => a.matchday - b.matchday);
}

/**
 * See this file's "Note on the handoff mark" in the plan this was built
 * from: FIXTURES only models the league phase (matchdays 1-8), so any point
 * beyond that can only exist once the knockout stage — and therefore bracket
 * scoring — has begun.
 */
export function findBracketHandoffMatchday(points: RankHistoryPoint[]): number | null {
  const firstKnockoutPoint = points.find((p) => p.matchday > LEAGUE_PHASE_MATCHDAY_COUNT);
  return firstKnockoutPoint ? firstKnockoutPoint.matchday : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- rankHistoryChart`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboard/rankHistoryChart.ts src/leaderboard/rankHistoryChart.test.ts
git commit -m "feat: add rank-history point-building and bracket-handoff derivation"
```

---

### Task 9: `RankHistoryGraph`

**Files:**
- Create: `src/home/RankHistoryGraph.tsx`
- Test: `src/home/RankHistoryGraph.test.tsx`

**Interfaces:**
- Consumes: `RankHistoryPoint` from `../leaderboard/rankHistoryChart` (Task 8); `Frame`/`FrameHeader`/`FrameTitle`/`FrameBody` from `@/components/ui/frame`.
- Produces: `RankHistoryGraph({className, style, points, maxRank, handoffMatchday}: {className?: string; style?: CSSProperties; points: RankHistoryPoint[]; maxRank: number; handoffMatchday: number | null})`. Task 10 renders this, computing `points`/`handoffMatchday` via Task 8's helpers from `useRankSnapshots()` and passing `maxRank = entries.length` (the current total participant count, from `useLeaderboard()`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/RankHistoryGraph.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RankHistoryGraph } from "./RankHistoryGraph";

const POINTS = [
  { matchday: 1, rank: 5 },
  { matchday: 2, rank: 3 },
  { matchday: 3, rank: 4 },
];

describe("RankHistoryGraph", () => {
  it("renders one point per matchday", () => {
    render(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={null} />);
    expect(screen.getAllByTestId("rank-history-point")).toHaveLength(3);
  });

  it("shows a placeholder message with no crash when there is no history yet", () => {
    render(<RankHistoryGraph points={[]} maxRank={10} handoffMatchday={null} />);
    expect(screen.getByText(/Henüz veri yok/)).toBeInTheDocument();
  });

  it("reveals the exact rank at a point on hover", () => {
    render(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={null} />);
    fireEvent.mouseEnter(screen.getAllByTestId("rank-history-point")[1]);
    expect(screen.getByTestId("rank-history-tooltip")).toHaveTextContent("3");
  });

  it("renders a handoff mark when a handoff matchday is given, and none when it isn't", () => {
    const { rerender } = render(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={2} />);
    expect(screen.getByTestId("rank-history-handoff-mark")).toBeInTheDocument();

    rerender(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={null} />);
    expect(screen.queryByTestId("rank-history-handoff-mark")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RankHistoryGraph`
Expected: FAIL with "Cannot find module './RankHistoryGraph'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/home/RankHistoryGraph.tsx
import { CSSProperties, useState } from "react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { RankHistoryPoint } from "../leaderboard/rankHistoryChart";

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 100;
const PADDING = 12;

interface RankHistoryGraphProps {
  className?: string;
  style?: CSSProperties;
  points: RankHistoryPoint[];
  maxRank: number;
  handoffMatchday: number | null;
}

/**
 * GREAT_LEAP_SPEC.md §2.7: one line, rank (not points) over time, one point
 * per matchday, continues through the knockout rounds, hover reveals the
 * exact rank, a small subtle mark at the league->bracket scoring handoff.
 * Hand-rolled SVG — no charting library in this codebase's dependency tree.
 */
export function RankHistoryGraph({ className, style, points, maxRank, handoffMatchday }: RankHistoryGraphProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const body =
    points.length === 0 ? (
      <p className="flex h-full items-center justify-center font-display text-sm text-color_textsecondary italic">
        Henüz veri yok.
      </p>
    ) : (
      (() => {
        const minMatchday = points[0].matchday;
        const maxMatchday = points[points.length - 1].matchday;
        const matchdaySpan = Math.max(1, maxMatchday - minMatchday);

        const usableWidth = VIEWBOX_WIDTH - PADDING * 2;
        const usableHeight = VIEWBOX_HEIGHT - PADDING * 2;

        function x(matchday: number): number {
          return PADDING + ((matchday - minMatchday) / matchdaySpan) * usableWidth;
        }
        // Rank 1 (best) plots at the top; maxRank (worst) at the bottom.
        function y(rank: number): number {
          const clampedMax = Math.max(maxRank, 1);
          return PADDING + ((rank - 1) / clampedMax) * usableHeight;
        }

        const linePoints = points.map((p) => `${x(p.matchday)},${y(p.rank)}`).join(" ");
        const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

        return (
          <div className="relative h-full w-full">
            <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full" preserveAspectRatio="none">
              <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
              {handoffMatchday !== null && (
                <line
                  data-testid="rank-history-handoff-mark"
                  x1={x(handoffMatchday)}
                  x2={x(handoffMatchday)}
                  y1={PADDING}
                  y2={VIEWBOX_HEIGHT - PADDING}
                  stroke="var(--color-textsecondary)"
                  strokeWidth={0.75}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
              {points.map((p, index) => (
                <circle
                  key={p.matchday}
                  data-testid="rank-history-point"
                  cx={x(p.matchday)}
                  cy={y(p.rank)}
                  r={3}
                  fill="var(--color-accent)"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>
            {hovered && (
              <div
                data-testid="rank-history-tooltip"
                className="pointer-events-none absolute top-1 left-1 rounded-md bg-color_text px-2 py-1 font-mono text-[0.65rem] text-background"
              >
                {hovered.matchday}. hafta — #{hovered.rank}
              </div>
            )}
          </div>
        );
      })()
    );

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">Sıralama Geçmişi</FrameTitle>
      </FrameHeader>
      <FrameBody className="px-4 py-3">{body}</FrameBody>
    </Frame>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RankHistoryGraph`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/home/RankHistoryGraph.tsx src/home/RankHistoryGraph.test.tsx
git commit -m "feat: add hand-rolled SVG rank-history graph with hover and handoff mark"
```

---

### Task 10: `StartedHomeLoggedIn`

**Files:**
- Create: `src/home/StartedHomeLoggedIn.tsx`
- Test: `src/home/StartedHomeLoggedIn.test.tsx`
- Modify: `src/leaderboard/TeamTable.tsx:12-22,254,264,364` (add `className`/`data-testid`, see File Structure)

**Interfaces:**
- Consumes: `ChatCell` (Task 1), `ForumCell` (Task 2), `MiniLeaderboardWidget` (Task 5), `UpcomingMatchesWidget` (Task 6), `RankHistoryGraph` (Task 9), `buildRankHistoryPoints`/`findBracketHandoffMatchday` (Task 8), `deriveCurrentRound` (Task 7); `TeamTable` from `../leaderboard/TeamTable` (`{results, highlightedTeamIds?, onSelectTeam?}`); `TeamPopup` from `../leaderboard/TeamPopup` (full contract: `teamId, entries, results, onOpenChange, onSelectParticipant, onSelectTeam, tournamentStarted`, confirmed at `src/leaderboard/TeamPopup.tsx:32-52`); `ParticipantPopup` from `../leaderboard/ParticipantPopup` (`ranked, entries, results, onOpenChange, onSelectTeam, tournamentStarted`, confirmed at `src/leaderboard/ParticipantPopup.tsx:26-46`); `assignRanks` from `../leaderboard/ranking`; `BracketCtaBanner`, `BracketWidget` from `../bracket/BracketCtaBanner` / `../bracket/BracketWidget` (Plan 2 Tasks 9/10 — `BracketWidget({bracketState, currentRound, onSelectTeam})`); `BracketState` from `../bracket/bracketState`; `BracketPrediction` from `../bracket/bracketPredictionTypes`; `RankSnapshot` from `../leaderboard/rankSnapshotTypes`; `TournamentPhase` from `../tournament/tournamentPhase`; types `Player`, `LeaderboardEntry`, `MessageWithId`, `PostWithId`, `MyLobby`, `LobbyMember`, `TeamResult`, and `ReturnType<typeof useLobbyMessages>` (same set `HomeLandingLoggedIn.tsx` already threads through).
- Produces: `StartedHomeLoggedIn(props)` — the six-widget jigsaw grid (§2.1: league table/bracket-widget large, rank-history wide-short, chat/forum/mini-leaderboard/upcoming-matches roughly equal). No lobby-creation UI (see Task 1's note — the not-started home's Katılımcılar cell, the only place that UI lives, has no equivalent widget in this six-widget set per §2.1's closed list). Task 12 (`LoggedInHome.tsx`) renders this for every started `loggedin_*` state.

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/StartedHomeLoggedIn.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TEAMS } from "../predictions/teams";

vi.mock("../tournament/now", () => ({ resolveNow: () => new Date("2026-09-01T00:00:00Z") }));

import { StartedHomeLoggedIn } from "./StartedHomeLoggedIn";

const ME = { uid: "uid1", firstName: "Mert", lastName: "Y", photoURL: "", createdAt: 1 };
const ENTRIES = [{ uid: "uid1", firstName: "Mert", lastName: "Y", photoURL: "", points: 30, ranking: [] }];
const LOBBY_MESSAGES = { messages: [], loadOlder: vi.fn(), loadingOlder: false, hasMoreOlder: false };

function baseProps() {
  return {
    me: ME,
    players: [ME],
    results: {},
    entries: ENTRIES,
    phase: "leaguephase" as const,
    bracketState: { ro16Teams: {}, winners: {} },
    bracketPrediction: null,
    snapshots: [],
    messages: [],
    onLoadOlderMessages: vi.fn(),
    loadingOlderMessages: false,
    hasMoreOlderMessages: false,
    onlineCount: 1,
    typingUids: [],
    posts: [],
    likesByPost: new Map(),
    onToggleLike: vi.fn(),
    likeError: null,
    onDeletePost: vi.fn(),
    onSaveEdit: vi.fn(),
    onRefetchPosts: vi.fn(),
    forumActionError: null,
    myLobbies: [],
    sohbetLobbyId: null,
    onChangeSohbetLobby: vi.fn(),
    sohbetLobbyMembers: [],
    sohbetLobbyMessages: LOBBY_MESSAGES,
    onOpenLobbyManagement: vi.fn(),
  };
}

describe("StartedHomeLoggedIn", () => {
  it("shows the league table during leaguephase", () => {
    render(<StartedHomeLoggedIn {...baseProps()} />);
    expect(screen.getByTestId("team-table")).toBeInTheDocument();
  });

  it("swaps the league table for the bracket widget during knockout", () => {
    render(<StartedHomeLoggedIn {...baseProps()} phase="knockout" />);
    expect(screen.queryByTestId("team-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("bracket-widget-round-ro16")).toBeInTheDocument();
  });

  it("shows the bracket CTA during preknockout when no bracket prediction exists yet", () => {
    render(<StartedHomeLoggedIn {...baseProps()} phase="preknockout" />);
    expect(screen.getByRole("link", { name: /eleme turu tahminini yap/i })).toBeInTheDocument();
  });

  it("hides the bracket CTA once a bracket prediction has been submitted", () => {
    render(
      <StartedHomeLoggedIn
        {...baseProps()}
        phase="preknockout"
        bracketPrediction={{ picks: {} as any, submittedAt: 1 }}
      />
    );
    expect(screen.queryByRole("link", { name: /eleme turu tahminini yap/i })).not.toBeInTheDocument();
  });

  it("renders the mini-leaderboard, upcoming matches, chat, and forum widgets", () => {
    render(<StartedHomeLoggedIn {...baseProps()} />);
    expect(screen.getAllByTestId("mini-leaderboard-row").length).toBeGreaterThan(0);
    expect(screen.getByText("Yaklaşan Maçlar")).toBeInTheDocument();
    expect(screen.getByText("Genel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forum" })).toBeInTheDocument();
  });

  it("opens the team popup when a league-table row is clicked", () => {
    render(<StartedHomeLoggedIn {...baseProps()} />);
    // TeamTable's rows have no data-testid (confirmed against the real
    // component) — click bubbles from the team's own short-name text up to
    // the row's onClick, same as a real user interaction.
    fireEvent.click(screen.getByText(TEAMS[0].shortName));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- StartedHomeLoggedIn`
Expected: FAIL with "Cannot find module './StartedHomeLoggedIn'".

- [ ] **Step 3: Add `className`/`data-testid` to `TeamTable.tsx`**

`TeamTable.tsx` has no `className` prop and no `data-testid` today (confirmed) — both branches of its return (lines 264 and 364) share the identical outer shape `<div className="relative h-full">...</div>`. In `src/leaderboard/TeamTable.tsx`, add `className?: string` to `TeamTableProps` (after `onSelectTeam?`, around line 22):

```ts
  className?: string;
```

Then in the function signature (line 254), destructure it:

```ts
export function TeamTable({ results, highlightedTeamIds, onSelectTeam, className }: TeamTableProps) {
```

Then change **both** outer `<div className="relative h-full">` occurrences (lines 264 and 364) to:

```tsx
<div className={cn("relative h-full", className)} data-testid="team-table">
```

(`cn` is already imported in this file, confirmed at its top-level imports.)

- [ ] **Step 4: Write the `StartedHomeLoggedIn` implementation**

```tsx
// src/home/StartedHomeLoggedIn.tsx
import { useCallback, useState } from "react";
import { Frame, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamTable } from "../leaderboard/TeamTable";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { assignRanks } from "../leaderboard/ranking";
import { buildRankHistoryPoints, findBracketHandoffMatchday } from "../leaderboard/rankHistoryChart";
import { RankHistoryGraph } from "./RankHistoryGraph";
import { ChatCell } from "./ChatCell";
import { ForumCell } from "./ForumCell";
import { MiniLeaderboardWidget } from "./MiniLeaderboardWidget";
import { UpcomingMatchesWidget } from "./UpcomingMatchesWidget";
import { BracketCtaBanner } from "../bracket/BracketCtaBanner";
import { BracketWidget } from "../bracket/BracketWidget";
import { deriveCurrentRound } from "../bracket/deriveCurrentRound";
import { BracketState } from "../bracket/bracketState";
import { BracketPrediction } from "../bracket/bracketPredictionTypes";
import { RankSnapshot } from "../leaderboard/rankSnapshotTypes";
import { TournamentPhase } from "../tournament/tournamentPhase";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import type { RankedEntry } from "../leaderboard/ranking";
import type { MyLobby } from "../lobbies/useMyLobbies";
import type { useLobbyMessages } from "../lobbies/useLobbyMessages";
import type { LobbyMember } from "../lobbies/lobbyTypes";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface StartedHomeLoggedInProps {
  me: Player;
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  phase: TournamentPhase;
  bracketState: BracketState;
  bracketPrediction: BracketPrediction | null;
  snapshots: RankSnapshot[];
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
  myLobbies: MyLobby[];
  sohbetLobbyId: string | null;
  onChangeSohbetLobby: (id: string | null) => void;
  sohbetLobbyMembers: LobbyMember[];
  sohbetLobbyMessages: ReturnType<typeof useLobbyMessages>;
  onOpenLobbyManagement: (id: string) => void;
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Three columns: the league table/bracket widget (fixed, tall — left,
// spanning every row per §2.1's "treat its size as fixed/given" rule), the
// rank-history graph (wide+short, spanning the remaining width in row 1),
// and a 2x2 of the four "roughly equal" widgets beneath it.
const GRID =
  "grid min-w-0 flex-1 grid-cols-[minmax(540px,1fr)_1fr_1fr] grid-rows-[auto_1fr_1fr] gap-4 sm:gap-5 lg:h-full lg:min-h-0 [&>*]:min-h-0 [&>*]:min-w-0";
const LEAGUE_CELL = "col-start-1 row-start-1 row-span-3 h-[26rem] lg:h-full";
const RANK_CELL = "col-start-2 col-span-2 row-start-1";
const CHAT_CELL = "col-start-2 row-start-2 h-[20rem] lg:h-full";
const FORUM_CELL = "col-start-3 row-start-2 h-[20rem] lg:h-full";
const MINI_CELL = "col-start-2 row-start-3 h-[20rem] lg:h-full";
const UPCOMING_CELL = "col-start-3 row-start-3 h-[20rem] lg:h-full";

/**
 * GREAT_LEAP_SPEC.md §2: the six-widget jigsaw for loggedin_leaguephase /
 * preknockout / knockout, replacing HomePage.tsx's old BLURB skeleton.
 */
export function StartedHomeLoggedIn({
  me,
  players,
  results,
  entries,
  phase,
  bracketState,
  bracketPrediction,
  snapshots,
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
  myLobbies,
  sohbetLobbyId,
  onChangeSohbetLobby,
  sohbetLobbyMembers,
  sohbetLobbyMessages,
  onOpenLobbyManagement,
}: StartedHomeLoggedInProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Same cross-linked-popup pattern as LeaderboardPage.tsx/ProfilePage.tsx:
  // selecting one clears the other.
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);

  const rankedEntries = assignRanks(entries);
  const selectedRanked: RankedEntry | null = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  const rankHistoryPoints = buildRankHistoryPoints(snapshots, me.uid);
  const handoffMatchday = findBracketHandoffMatchday(rankHistoryPoints);
  const currentRound = deriveCurrentRound(bracketState);

  return (
    <div className={PAGE_SHELL}>
      <Frame className="shrink-0 animate-cotton-rise">
        <FrameBody className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="size-14 shrink-0">
              <AvatarImage src={me.photoURL} alt="" />
              <AvatarFallback className="font-mono text-sm text-color_textsecondary">
                {initials(me.firstName, me.lastName)}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 truncate font-display text-xl text-color_text sm:text-2xl">
              Hoş geldin, <span className="font-bold">{me.firstName}</span>.
            </p>
          </div>
          {/* GREAT_LEAP_SPEC.md §5.2: bracket CTA once the window opens
              (preknockout), same pattern as the not-started home's
              "Tahminini Yap" CTA — no countdown (§1.2 forbids calendar-
              driven timers; the bracket window is phase-boundary-driven). */}
          {phase === "preknockout" && !bracketPrediction && <BracketCtaBanner />}
        </FrameBody>
      </Frame>

      <div className={GRID}>
        {phase === "knockout" ? (
          <div className={LEAGUE_CELL}>
            <BracketWidget bracketState={bracketState} currentRound={currentRound} onSelectTeam={handleSelectTeam} />
          </div>
        ) : (
          <TeamTable
            className={LEAGUE_CELL}
            results={results}
            onSelectTeam={handleSelectTeam}
          />
        )}

        <RankHistoryGraph
          className={RANK_CELL}
          points={rankHistoryPoints}
          maxRank={Math.max(entries.length, 1)}
          handoffMatchday={handoffMatchday}
        />

        <ChatCell
          className={CHAT_CELL}
          myUid={me.uid}
          players={players}
          myLobbies={myLobbies}
          sohbetLobbyId={sohbetLobbyId}
          onChangeSohbetLobby={onChangeSohbetLobby}
          onOpenLobbyManagement={onOpenLobbyManagement}
          sohbetLobbyMembers={sohbetLobbyMembers}
          sohbetLobbyMessages={sohbetLobbyMessages}
          messages={messages}
          onLoadOlderMessages={onLoadOlderMessages}
          loadingOlderMessages={loadingOlderMessages}
          hasMoreOlderMessages={hasMoreOlderMessages}
          onlineCount={onlineCount}
          typingUids={typingUids}
          onSelectParticipant={handleSelectParticipant}
        />

        <ForumCell
          className={FORUM_CELL}
          posts={posts}
          players={players}
          myUid={me.uid}
          likesByPost={likesByPost}
          onToggleLike={onToggleLike}
          onSelectParticipant={handleSelectParticipant}
          onDeletePost={onDeletePost}
          onSaveEdit={onSaveEdit}
          onRefetchPosts={onRefetchPosts}
          likeError={likeError}
          forumActionError={forumActionError}
        />

        <MiniLeaderboardWidget
          className={MINI_CELL}
          entries={entries}
          currentUid={me.uid}
          onSelectParticipant={handleSelectParticipant}
        />

        <UpcomingMatchesWidget className={UPCOMING_CELL} results={results} />
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- StartedHomeLoggedIn` and `npm test -- TeamTable`
Expected: Both PASS — `StartedHomeLoggedIn`'s all 6 tests green, and `TeamTable.test.tsx`'s existing tests still green (confirming Step 3's `className`/`data-testid` addition didn't change its default rendering).

- [ ] **Step 6: Commit**

```bash
git add src/home/StartedHomeLoggedIn.tsx src/home/StartedHomeLoggedIn.test.tsx src/leaderboard/TeamTable.tsx
git commit -m "feat: add six-widget jigsaw Home for started, logged-in states"
```

---

### Task 11: `StartedHomeLoggedOut`

**Files:**
- Create: `src/home/StartedHomeLoggedOut.tsx`
- Test: `src/home/StartedHomeLoggedOut.test.tsx`

**Interfaces:**
- Consumes: `TeamTable`, `LeaderboardHero`, `LeaderboardTable`, `ParticipantPopup`, `TeamPopup` from `../leaderboard/*` (same imports `LeaderboardPage.tsx` uses); `assignRanks` from `../leaderboard/ranking`; `BracketWidget` from `../bracket/BracketWidget` (Plan 2 Task 10); `deriveCurrentRound` from `../bracket/deriveCurrentRound` (Task 7); `BracketState` from `../bracket/bracketState`; `LeaderboardEntry` from `../leaderboard/leaderboardTypes`; `TeamResult` from `../leaderboard/teamResultTypes`; `TournamentPhase` from `../tournament/tournamentPhase`.
- Produces: `StartedHomeLoggedOut({results, entries, phase, bracketState}: {results: Record<string, TeamResult>; entries: LeaderboardEntry[]; phase: TournamentPhase; bracketState: BracketState})` — visually mirrors `LeaderboardPage.tsx`'s composition (§3: "almost a copy of the logged-in league leaderboard page") but swaps the league table for `BracketWidget` during `knockout` (§3's "signed-out visitor can see the bracket too"). This is a standalone component, **not** a shared extraction from `LeaderboardPage.tsx` — see Global Constraints. Task 12 (`HomePage.tsx`) renders this for every started, logged-out `VisibilityState`; Task 13 (`RegistrationClosedScreen.tsx`) also renders it.

- [ ] **Step 1: Write the failing test**

```tsx
// src/home/StartedHomeLoggedOut.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StartedHomeLoggedOut } from "./StartedHomeLoggedOut";

const ENTRIES = [{ uid: "uid1", firstName: "A", lastName: "B", photoURL: "", points: 10, ranking: [] }];
const EMPTY_BRACKET = { ro16Teams: {}, winners: {} };

describe("StartedHomeLoggedOut", () => {
  it("shows the league table during leaguephase", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="leaguephase" bracketState={EMPTY_BRACKET} />);
    expect(screen.getByTestId("team-table")).toBeInTheDocument();
  });

  it("shows the league table during preknockout too", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="preknockout" bracketState={EMPTY_BRACKET} />);
    expect(screen.getByTestId("team-table")).toBeInTheDocument();
  });

  it("swaps the league table for the bracket widget during knockout", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="knockout" bracketState={EMPTY_BRACKET} />);
    expect(screen.queryByTestId("team-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("bracket-widget-round-ro16")).toBeInTheDocument();
  });

  it("shows the standings table", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="leaguephase" bracketState={EMPTY_BRACKET} />);
    expect(screen.getByText("A B")).toBeInTheDocument();
  });

  it("opens the participant popup when a standings row is clicked (revealCorrectness must gate this open, not closed)", () => {
    const withRanking = [{ ...ENTRIES[0], ranking: ["a", "b"] }];
    render(<StartedHomeLoggedOut results={{}} entries={withRanking} phase="leaguephase" bracketState={EMPTY_BRACKET} />);
    fireEvent.click(screen.getByText("A B"));
    // ParticipantPopup/TeamPopup have no data-testid (confirmed against the
    // real components) — both are @base-ui/react Dialogs, which render with
    // role="dialog" when open (same pattern already proven in this codebase
    // at src/forum/RecentPostsPreview.test.tsx:144).
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- StartedHomeLoggedOut`
Expected: FAIL with "Cannot find module './StartedHomeLoggedOut'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/home/StartedHomeLoggedOut.tsx
import { useCallback, useState } from "react";
import { TeamTable } from "../leaderboard/TeamTable";
import { LeaderboardHero } from "../leaderboard/LeaderboardHero";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { assignRanks } from "../leaderboard/ranking";
import { BracketWidget } from "../bracket/BracketWidget";
import { deriveCurrentRound } from "../bracket/deriveCurrentRound";
import { BracketState } from "../bracket/bracketState";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { TournamentPhase } from "../tournament/tournamentPhase";
import type { RankedEntry } from "../leaderboard/ranking";

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
const MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(540px,1.3fr)_300px_minmax(340px,1fr)] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

/**
 * GREAT_LEAP_SPEC.md §3: "almost a copy of the logged-in league leaderboard
 * page" for loggedout_leaguephase / preknockout / knockout — same TeamTable
 * + LeaderboardHero + LeaderboardTable composition as LeaderboardPage.tsx,
 * but with the same knockout league-table-to-bracket-widget swap §2.4 gives
 * the signed-in six-widget grid (§3's "a signed-out visitor can see the
 * bracket too"). A standalone component rather than sharing code with
 * LeaderboardPage.tsx — see this plan's Global Constraints for why the real
 * /leaderboard route must never show the bracket.
 */
export function StartedHomeLoggedOut({
  results,
  entries,
  phase,
  bracketState,
}: {
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  phase: TournamentPhase;
  bracketState: BracketState;
}) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);

  const rankedEntries = assignRanks(entries);
  const selectedRanked: RankedEntry | null = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;
  const currentRound = deriveCurrentRound(bracketState);

  return (
    <div className={PAGE_SHELL}>
      <div className={MAIN_ROW}>
        {phase === "knockout" ? (
          <div className="min-h-0 lg:h-full">
            <BracketWidget bracketState={bracketState} currentRound={currentRound} onSelectTeam={handleSelectTeam} />
          </div>
        ) : (
          <TeamTable results={results} onSelectTeam={handleSelectTeam} />
        )}
        <LeaderboardHero results={results} />
        {/* revealCorrectness gates more than the hover highlight — confirmed
            at LeaderboardTable.tsx:90/97, it also gates whether row clicks
            fire onSelectEntry at all. This composition only ever renders for
            started phases, so it's unconditionally true here (matching
            LeaderboardPage.tsx's own `phase !== "notstarted"`, which is
            always true in this context too) rather than false — false would
            silently make every row unclickable. */}
        <LeaderboardTable entries={entries} revealCorrectness={true} onSelectEntry={handleSelectParticipant} />
      </div>
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
    </div>
  );
}
```

`revealCorrectness={true}` here (confirmed against `src/leaderboard/LeaderboardTable.tsx:16-29,53-58`, which is exactly the `{entries, revealCorrectness?, onHoverEntry?, onSelectEntry?}` shape this task assumed): this component only ever renders for started phases, so it's unconditionally `true` — matching `LeaderboardPage.tsx`'s own `revealCorrectness={phase !== "notstarted"}`, which evaluates to `true` in that same set of phases. `onHoverEntry` is deliberately left unwired (no prop passed) — §3's "doesn't need to be personalized" means no hover-driven team-highlight wiring is needed here, but `revealCorrectness` must still be `true` since it's *also* the gate on `onSelectEntry`'s row-click behavior (`LeaderboardTable.tsx:90,97`), which this composition does need — a signed-out visitor must still be able to click a row to open `ParticipantPopup`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- StartedHomeLoggedOut`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/home/StartedHomeLoggedOut.tsx src/home/StartedHomeLoggedOut.test.tsx
git commit -m "feat: add leaderboard-style Home for started, logged-out states"
```

---

### Task 12: Wire `LoggedInHome.tsx` and `HomePage.tsx`

**Files:**
- Modify: `src/home/LoggedInHome.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/home/LoggedInHome.test.tsx` (create if it doesn't already exist; extend if it does)
- Test: `src/pages/HomePage.test.tsx` (extend the existing file)

**Interfaces:**
- Consumes: `StartedHomeLoggedIn` (Task 10), `StartedHomeLoggedOut` (Task 11), `HomeLandingLoggedIn` (unchanged), `HomeLandingLoggedOut` (unchanged); `useTournamentPhase` from `../tournament/useTournamentPhase`; `useBracketState` from `../bracket/useBracketState` (Plan 1 Task 3); `useBracketPrediction` from `../bracket/useBracketPrediction` (Plan 1 Task 4); `useRankSnapshots` from `../leaderboard/useRankSnapshots` (Plan 1).
- Produces: `LoggedInHome({players, results, entries}: {players: Player[]; results: Record<string, TeamResult>; entries: LeaderboardEntry[]})` now handles every `loggedin_*` state, not just `loggedin_notstarted`. `HomePage()` becomes a pure `loggedIn`/`started` router with no `BLURB` skeleton left.

- [ ] **Step 1: Rewrite the failing `HomePage` test**

`src/pages/HomePage.test.tsx` already exists (confirmed, 5 tests) and needs real changes, not just an appended block:

- Its mock function names are `mockUseVisibilityState`/`mockUseResults`/`mockUsePlayers`/`mockUseLeaderboard` — reuse those exactly, don't introduce new ones for the same hooks.
- It mocks `TeamTable`/`PlayerList`/`LeaderboardTable` directly, because the *current* `HomePage.tsx` renders them itself for the shared `BLURB` skeleton. Step 3 deletes that skeleton entirely, so those three mocks (and the two tests that depend on them, `"loggedout_leaguephase: shows the team table..."` and `"loggedin_knockout: shows the team table..."`, lines 89-103) are testing code this plan removes — they must be **replaced**, not left in place, since Step 3's new `HomePage.tsx` doesn't call `TeamTable`/`PlayerList`/`LeaderboardTable` at all anymore for those states.
- Two new hooks need mocking that the current file never calls: `useTournamentPhase` (also independently used by `useVisibilityState` internally, per the established convention already used by `LeaderboardPage.test.tsx:10,24-26,32` — a separate `mockUseTournamentPhase`, not derived from the visibility-state mock) and `useBracketState` (Plan 1 Task 3). Every hook in this file executes on every render regardless of which branch a given test is asserting on, so both need `beforeEach` defaults, or tests that don't otherwise care about phase/bracket state will crash instead of hitting the intended branch.

Replace the whole file:

```tsx
// src/pages/HomePage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseVisibilityState = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUseBracketState = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));

vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

vi.mock("../bracket/useBracketState", () => ({
  useBracketState: () => mockUseBracketState(),
}));

vi.mock("../home/HomeLandingLoggedOut", () => ({
  HomeLandingLoggedOut: ({ players }: { players: unknown[] }) => (
    <div>home-landing-loggedout:{players.length}</div>
  ),
}));

vi.mock("../home/LoggedInHome", () => ({
  LoggedInHome: ({ players }: { players: unknown[] }) => <div>logged-in-home:{players.length}</div>,
}));

vi.mock("../home/StartedHomeLoggedOut", () => ({
  StartedHomeLoggedOut: () => <div>started-home-loggedout</div>,
}));

const emptyResults = { results: {}, loading: false };
const emptyPlayers = { players: [], loading: false };
const emptyLeaderboard = { entries: [], loading: false };
const emptyBracketState = { bracketState: { ro16Teams: {}, winners: {} }, loading: false };

describe("HomePage", () => {
  beforeEach(() => {
    mockUseResults.mockReturnValue(emptyResults);
    mockUsePlayers.mockReturnValue(emptyPlayers);
    mockUseLeaderboard.mockReturnValue(emptyLeaderboard);
    mockUseTournamentPhase.mockReturnValue("notstarted");
    mockUseBracketState.mockReturnValue(emptyBracketState);
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loggedout_notstarted: renders the dedicated landing page instead of any started composition", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("home-landing-loggedout:2")).toBeInTheDocument();
    expect(screen.queryByText("started-home-loggedout")).not.toBeInTheDocument();
  });

  it("loggedin_notstarted: renders the dedicated logged-in landing page", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }, { uid: "c" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("logged-in-home:3")).toBeInTheDocument();
  });

  it("loggedout_leaguephase: routes to StartedHomeLoggedOut, not the old BLURB skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    render(<HomePage />);
    expect(screen.getByText("started-home-loggedout")).toBeInTheDocument();
  });

  it("loggedin_knockout: routes to LoggedInHome, not the old BLURB skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_knockout");
    mockUseTournamentPhase.mockReturnValue("knockout");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("logged-in-home:1")).toBeInTheDocument();
  });

  it("waits for bracketState before rendering the signed-out started composition", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    mockUseBracketState.mockReturnValue({ bracketState: { ro16Teams: {}, winners: {} }, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- HomePage`
Expected: FAIL — `StartedHomeLoggedOut` isn't wired in yet for `loggedout_leaguephase`/`loggedin_knockout` (current code still shows the shared `BLURB` skeleton for those), and `useTournamentPhase`/`useBracketState` aren't called by the current `HomePage.tsx` at all yet.

- [ ] **Step 3: Rewrite `HomePage.tsx`**

`StartedHomeLoggedOut` needs live `bracketState` to know when to swap in `BracketWidget` (§3's "once the bracket exists... should not be gated behind login" means this must be a real, live subscription, not a static empty object). `useBracketState()` (Plan 1 Task 3) has no auth requirement — `bracketState/current` is a public-read Firestore document per Plan 1's rules (handover: "public read, authed write") — so it's safe to call directly in `HomePage.tsx` for the signed-out branch. `LoggedInHome.tsx` fetches its own copy independently in Step 8 below, so `HomePage.tsx`'s loading gate for it is scoped to only the branch that needs it (`!loggedIn`), not the logged-in one.

Replace the whole file:

```tsx
// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";
import { LoggedInHome } from "../home/LoggedInHome";
import { StartedHomeLoggedOut } from "../home/StartedHomeLoggedOut";

export function HomePage() {
  const state = useVisibilityState();
  const phase = useTournamentPhase();
  const loggedIn = state.startsWith("loggedin_");

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { bracketState, loading: bracketLoading } = useBracketState();

  const needsBracketState = !loggedIn && phase !== "notstarted";
  if (resultsLoading || playersLoading || leaderboardLoading || (needsBracketState && bracketLoading)) {
    return null;
  }

  // LoggedInHome is the single data-wrapper for every logged-in state now
  // (not just loggedin_notstarted) — it branches internally between
  // HomeLandingLoggedIn and StartedHomeLoggedIn.
  if (loggedIn) {
    return <LoggedInHome players={players} results={results} entries={entries} />;
  }

  if (phase === "notstarted") {
    return <HomeLandingLoggedOut players={players} />;
  }

  // GREAT_LEAP_SPEC.md §3.
  return <StartedHomeLoggedOut results={results} entries={entries} phase={phase} bracketState={bracketState} />;
}
```

- [ ] **Step 4: Run the `HomePage` test to verify it passes**

Run: `npm test -- HomePage`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: route started-phase Home states to their real compositions"
```

- [ ] **Step 6: Update the existing `LoggedInHome` test**

`src/home/LoggedInHome.test.tsx` already exists (confirmed, 14 tests, all exercising the not-started path only — none mock any phase/bracket hook, since the current `LoggedInHome.tsx` doesn't call any). Every one of those 14 tests calls `render(<LoggedInHome players={players} />)` (two of them via `rerender`) — once `results`/`entries` become required props (Step 8), every one of those call sites needs updating, and four new hooks this file has never had to mock (`useTournamentPhase`, `useBracketState`, `useBracketPrediction`, `useRankSnapshots`) need mocks with defaults that keep all 14 existing tests exercising exactly the not-started path they already test (same "keep it green with a safe default" reasoning as Task 13's `ProfileGate.test.tsx` fix).

Make these changes to the existing file:

1. Add four new mock declarations alongside the existing ones (after `mockCreateLobby`):

```ts
const mockUseTournamentPhase = vi.fn();
const mockUseBracketState = vi.fn();
const mockUseBracketPrediction = vi.fn();
const mockUseRankSnapshots = vi.fn();
```

2. Add four new `vi.mock` calls alongside the existing ones (after the `createLobby` mock):

```ts
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));
vi.mock("../bracket/useBracketState", () => ({
  useBracketState: () => mockUseBracketState(),
}));
vi.mock("../bracket/useBracketPrediction", () => ({
  useBracketPrediction: (uid: string | null) => mockUseBracketPrediction(uid),
}));
vi.mock("../leaderboard/useRankSnapshots", () => ({
  useRankSnapshots: () => mockUseRankSnapshots(),
}));
```

3. Add a mock for the new `StartedHomeLoggedIn` component, alongside the existing `HomeLandingLoggedIn` mock — kept deliberately minimal (just enough to confirm routing), since Task 10's own test file already exhaustively covers `StartedHomeLoggedIn`'s internals:

```ts
vi.mock("./StartedHomeLoggedIn", () => ({
  StartedHomeLoggedIn: () => <div>started-home-loggedin</div>,
}));
```

4. Add four new lines to the existing `beforeEach` (after `mockCreateLobby.mockReset();`), defaulting to exactly what today's behavior already assumes (not-started, nothing bracket-related yet):

```ts
    mockUseTournamentPhase.mockReturnValue("notstarted");
    mockUseBracketState.mockReturnValue({ bracketState: { ro16Teams: {}, winners: {} }, loading: false });
    mockUseBracketPrediction.mockReturnValue({ prediction: null, loading: false });
    mockUseRankSnapshots.mockReturnValue({ snapshots: [], loading: false });
```

5. Add a render helper right after the `players` constant, and replace **every** `render(<LoggedInHome players={players} />)` call in the file (13 occurrences, across every existing `it` block) with `renderLoggedInHome()`, and the one `rerender(<LoggedInHome players={players} />)` call (in the "clears the managed lobby id once that lobby disappears from myLobbies" test) with `rerender(<LoggedInHome players={players} results={{}} entries={[]} />)`:

```ts
function renderLoggedInHome() {
  return render(<LoggedInHome players={players} results={{}} entries={[]} />);
}
```

6. Append two new tests to the end of the `describe` block, before its closing `});`:

```tsx
  it("renders HomeLandingLoggedIn (unchanged) when the phase is notstarted", () => {
    render(<LoggedInHome players={players} results={{}} entries={[]} />);
    expect(screen.getByText(/home-landing-loggedin/)).toBeInTheDocument();
    expect(screen.queryByText("started-home-loggedin")).not.toBeInTheDocument();
  });

  it("renders StartedHomeLoggedIn instead, for every started phase", () => {
    mockUseTournamentPhase.mockReturnValue("knockout");
    render(<LoggedInHome players={players} results={{}} entries={[]} />);
    expect(screen.getByText("started-home-loggedin")).toBeInTheDocument();
    expect(screen.queryByText(/home-landing-loggedin/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- LoggedInHome`
Expected: FAIL — `LoggedInHome.tsx` doesn't accept `results`/`entries` props yet, and never renders `StartedHomeLoggedIn`. The 14 pre-existing tests should still pass at this point (their behavior is unchanged; only the two new tests and the prop-signature mismatch fail), confirming the new mocks' defaults are doing their job even before `LoggedInHome.tsx` itself changes.

- [ ] **Step 8: Modify `LoggedInHome.tsx`**

Add the new imports and hooks, and branch the return. In `src/home/LoggedInHome.tsx`:

```tsx
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { useBracketPrediction } from "../bracket/useBracketPrediction";
import { useRankSnapshots } from "../leaderboard/useRankSnapshots";
import { StartedHomeLoggedIn } from "./StartedHomeLoggedIn";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { TeamResult } from "../leaderboard/teamResultTypes";
```

Change the function signature to accept the two new props:

```tsx
export function LoggedInHome({
  players,
  results,
  entries,
}: {
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
}) {
```

Add the new hooks alongside the existing ones (after the `useMyLobbies` line):

```tsx
  const phase = useTournamentPhase();
  const started = phase !== "notstarted";
  const { bracketState } = useBracketState();
  const { prediction: bracketPrediction } = useBracketPrediction(started ? (user?.uid ?? null) : null);
  const { snapshots } = useRankSnapshots();
```

Replace the final `return (<HomeLandingLoggedIn ... />);` with a phase branch:

```tsx
  if (started) {
    return (
      <StartedHomeLoggedIn
        me={{ uid: user.uid, ...profile }}
        players={players}
        results={results}
        entries={entries}
        phase={phase}
        bracketState={bracketState}
        bracketPrediction={bracketPrediction}
        snapshots={snapshots}
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
        myLobbies={myLobbies}
        sohbetLobbyId={sohbetLobbyId}
        onChangeSohbetLobby={setSohbetLobbyId}
        sohbetLobbyMembers={sohbetLobbyMembers.members}
        sohbetLobbyMessages={sohbetLobbyMessages}
        onOpenLobbyManagement={setManagingLobbyId}
      />
    );
  }

  return (
    <HomeLandingLoggedIn
      me={{ uid: user.uid, ...profile }}
      players={players}
      submitterUids={submitterUids}
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
      myLobbies={myLobbies}
      sohbetLobbyId={sohbetLobbyId}
      onChangeSohbetLobby={setSohbetLobbyId}
      sohbetLobbyMessages={sohbetLobbyMessages}
      sohbetLobbyMembers={sohbetLobbyMembers.members}
      katilimcilarLobbyId={katilimcilarLobbyId}
      onChangeKatilimcilarLobby={setKatilimcilarLobbyId}
      katilimcilarLobbyMembers={katilimcilarLobbyMembers.members}
      managingLobbyId={managingLobbyId}
      onOpenLobbyManagement={setManagingLobbyId}
      onCloseLobbyManagement={() => setManagingLobbyId(null)}
      onLeftManagedLobby={() => {
        setManagingLobbyId(null);
        if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
        if (katilimcilarLobbyId === managingLobbyId) setKatilimcilarLobbyId(null);
      }}
      onDeletedManagedLobby={() => {
        setManagingLobbyId(null);
        if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
        if (katilimcilarLobbyId === managingLobbyId) setKatilimcilarLobbyId(null);
      }}
      canCreateLobby={canCreateLobby}
      createDialogOpen={createDialogOpen}
      onOpenCreateDialog={() => setCreateDialogOpen(true)}
      onCloseCreateDialog={() => setCreateDialogOpen(false)}
      onCreateLobby={handleCreateLobby}
      createError={createError}
    />
  );
}
```

The `if (!user || profileLoading || submittersLoading || messagesLoading || postsLoading || !profile) return null;` guard stays exactly where it already is, above both branches — unchanged, since every field both branches read comes from the same set of hooks already gated by it.

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- LoggedInHome`
Expected: PASS, all 16 tests green (14 pre-existing + 2 new).

- [ ] **Step 10: Commit**

```bash
git add src/home/LoggedInHome.tsx src/home/LoggedInHome.test.tsx
git commit -m "feat: generalize LoggedInHome to branch between not-started and started compositions"
```

- [ ] **Step 11: Manually verify in the browser**

Run: `npm run dev`, sign in, use the dev panel to set `tournamentState/current.phase` to `leaguephase`, then `preknockout`, then `knockout`.
Expected: the six-widget grid renders for each started phase with no console errors; the league table swaps for the bracket widget only during `knockout`; sign out and confirm `StartedHomeLoggedOut`'s leaderboard-style composition renders instead, with the header's sign-in control still visible.

- [ ] **Step 12: Commit**

```bash
git commit --allow-empty -m "chore: manual verification checkpoint for started-phase Home"
```

---

### Task 13: Registration closing

**Files:**
- Create: `src/profile/RegistrationClosedScreen.tsx`
- Test: `src/profile/RegistrationClosedScreen.test.tsx`
- Modify: `src/profile/ProfileGate.tsx`
- Test: `src/profile/ProfileGate.test.tsx` (extend the existing file)

**Interfaces:**
- Consumes (`RegistrationClosedScreen.tsx`): `useResults` from `../leaderboard/useResults`; `useLeaderboard` from `../leaderboard/useLeaderboard`; `useTournamentPhase` from `../tournament/useTournamentPhase`; `useBracketState` from `../bracket/useBracketState` (Plan 1 Task 3); `StartedHomeLoggedOut` from `../home/StartedHomeLoggedOut` (Task 11).
- Produces (`RegistrationClosedScreen.tsx`): `RegistrationClosedScreen()` — a message plus the exact `StartedHomeLoggedOut` spectator composition, self-contained (fetches its own data). `ProfileGate.tsx` renders this.
- Consumes (`ProfileGate.tsx`, new): `useTournamentPhase` from `../tournament/useTournamentPhase`; `RegistrationClosedScreen` from `./RegistrationClosedScreen`.
- Produces (`ProfileGate.tsx`): unchanged public contract (`ProfileGate({children})`), new internal branch per GREAT_LEAP_SPEC.md §4 (see this task's implementer's-judgment note below).

**Implementer's-judgment note (§4 was explicitly delegated to "your call"):**
1. **Blocking condition:** `!profile && !survey` (both missing), not the existing gate's `!profile || !survey` (either missing). GREAT_LEAP_SPEC.md §4 states the blocking condition should be "no `profiles/{uid}` doc, no `surveyResponses/{uid}` doc," but also claims this is "exactly the condition `ProfileGate.tsx` currently uses" — which conflicts with the live code (`ProfileGate.tsx:34` is an OR, not an AND). Flagging this conflict per the spec's own preamble ("if anything in this document conflicts with something you observe in the live code... flag the conflict rather than silently resolving it either way"): the spec's stated *intent* — block only genuinely brand-new accounts, never touch an account with any onboarding progress — is what's implemented, using the AND condition, not the OR the spec mistakenly attributed to the current code. This also matches Mert's own terminology in the same section: "'Signing in' = logging into an account that already has a profile. Signing in never closes" — an account with a profile but no survey (abandoned mid-quiz) already has a profile, so it must never be blocked, which `!profile && !survey` guarantees (and which is behaviorally equivalent to using `!profile` alone, since `SignupFlow` always saves a profile before the survey — a survey can never exist without a profile in this app).
2. **What they see:** GREAT_LEAP_SPEC.md §4 offers two options — "the same [experience] a signed-out visitor sees, or a near-identical logged-in-but-no-profile variant." This plan takes the first, literally reusing `StartedHomeLoggedOut` (Task 11), rather than inventing a third variant, and rather than trying to make every other existing page (`/profile`, `/predictions`, etc.) defensive against an authenticated-but-profile-less visitor — none of which GREAT_LEAP_SPEC.md §1.2/§8 asks this plan to touch. `ProfileGate.tsx` fully replacing `children` with this screen (rather than rendering the message as a banner above `children` and letting `HashRouter` render normally) mirrors the exact pattern the existing `SignupFlow` branch immediately below it already uses — a signed-in user mid-onboarding today *also* doesn't see `AppShell`/routing, so this isn't new inconsistent behavior, it's the same established convention.
3. Per §4's own instruction, flag this decision back to Mert once built so he can veto it if it's not what he pictured — this is not a request to ask him now, just a note that the choice was made and should be surfaced at review/handoff time.

- [ ] **Step 1: Write the failing `RegistrationClosedScreen` test**

```tsx
// src/profile/RegistrationClosedScreen.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../leaderboard/useResults", () => ({ useResults: () => ({ results: {}, loading: false }) }));
vi.mock("../leaderboard/useLeaderboard", () => ({ useLeaderboard: () => ({ entries: [], loading: false }) }));
vi.mock("../tournament/useTournamentPhase", () => ({ useTournamentPhase: () => "leaguephase" }));
vi.mock("../bracket/useBracketState", () => ({
  useBracketState: () => ({ bracketState: { ro16Teams: {}, winners: {} }, loading: false }),
}));
vi.mock("../home/StartedHomeLoggedOut", () => ({
  StartedHomeLoggedOut: () => <div>spectator-composition</div>,
}));

import { RegistrationClosedScreen } from "./RegistrationClosedScreen";

describe("RegistrationClosedScreen", () => {
  it("shows a registration-closed message", () => {
    render(<RegistrationClosedScreen />);
    expect(screen.getByRole("status")).toHaveTextContent(/Kayıtlar kapandı/);
  });

  it("embeds the spectator composition beneath the message", () => {
    render(<RegistrationClosedScreen />);
    expect(screen.getByText("spectator-composition")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RegistrationClosedScreen`
Expected: FAIL with "Cannot find module './RegistrationClosedScreen'".

- [ ] **Step 3: Write the implementation**

```tsx
// src/profile/RegistrationClosedScreen.tsx
import { useResults } from "../leaderboard/useResults";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { StartedHomeLoggedOut } from "../home/StartedHomeLoggedOut";

/**
 * GREAT_LEAP_SPEC.md §4: shown instead of SignupFlow for a genuinely new
 * (never-onboarded) account once the tournament has started. Self-contained
 * — fetches its own data rather than relying on HashRouter/HomePage — so
 * this stays the only new surface this feature touches; no other existing
 * page needs to be made defensive against an authenticated user with no
 * profile. Embeds the exact spectator composition a signed-out visitor sees.
 */
export function RegistrationClosedScreen() {
  const { results, loading: resultsLoading } = useResults();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { bracketState, loading: bracketLoading } = useBracketState();
  const phase = useTournamentPhase();

  if (resultsLoading || leaderboardLoading || bracketLoading) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <p
        role="status"
        className="shrink-0 px-5 py-3 text-center font-display text-sm text-color_textsecondary sm:text-base"
      >
        Kayıtlar kapandı — turnuva başladı. İzleyici olarak devam edebilirsin.
      </p>
      <div className="min-h-0 flex-1">
        <StartedHomeLoggedOut results={results} entries={entries} phase={phase} bracketState={bracketState} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RegistrationClosedScreen`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/profile/RegistrationClosedScreen.tsx src/profile/RegistrationClosedScreen.test.tsx
git commit -m "feat: add self-contained registration-closed spectator screen"
```

- [ ] **Step 6: Write the failing `ProfileGate` test**

`src/profile/ProfileGate.test.tsx` already exists (confirmed, 6 tests, none of which currently mock any phase hook — `ProfileGate.tsx` doesn't call one yet). Once Step 8 below adds a real `useTournamentPhase()` call to `ProfileGate.tsx`, **every one of those 6 existing tests would otherwise start calling the real, unmocked hook** (which hits Firestore and isn't set up in this test file) unless a mock is added at module scope with a default that preserves today's behavior. Add the mock declaration alongside the file's existing three (`mockUseAuth`/`mockUseProfile`/`mockUseSurveyResponse`, confirmed at `ProfileGate.test.tsx:5-19`) — **not** inside a new `describe` block, since `vi.mock` calls must live at module scope for Vitest's hoisting to work, and give it a `"notstarted"` default so every pre-existing test (none of which sets a phase) keeps exercising exactly the pre-this-plan code path:

```tsx
// Add near the top of src/profile/ProfileGate.test.tsx, alongside the
// existing mockUseAuth/mockUseProfile/mockUseSurveyResponse declarations —
// defaults to "notstarted" so the file's 6 pre-existing tests (which never
// set a phase) keep exercising exactly today's behavior.
const mockUsePhase = vi.fn(() => "notstarted");

vi.mock("../tournament/useTournamentPhase", () => ({ useTournamentPhase: () => mockUsePhase() }));
vi.mock("./RegistrationClosedScreen", () => ({
  RegistrationClosedScreen: () => <div>registration-closed</div>,
}));
```

Then append this new `describe` block to the end of the file:

```tsx
describe("ProfileGate registration closing", () => {
  it("shows RegistrationClosedScreen for a never-onboarded user once the phase has started", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false });
    mockUsePhase.mockReturnValue("leaguephase");
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.getByText("registration-closed")).toBeInTheDocument();
    expect(screen.queryByText("real-app")).not.toBeInTheDocument();
  });

  it("still shows SignupFlow for a never-onboarded user while notstarted", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false });
    mockUsePhase.mockReturnValue("notstarted");
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.queryByText("registration-closed")).not.toBeInTheDocument();
  });

  it("does not block a user who has a profile but abandoned mid-quiz, even once started", () => {
    // Reuses the file's existing `hasProfile` constant (already declared
    // with a full, valid Profile shape including createdAt — see the top of
    // this file) rather than a fresh inline literal.
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(hasProfile);
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false });
    mockUsePhase.mockReturnValue("knockout");
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.queryByText("registration-closed")).not.toBeInTheDocument();
  });

  it("does not affect a fully onboarded user once started", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(hasProfile);
    mockUseSurveyResponse.mockReturnValue({ response: { messiOrRonaldo: "messi" }, loading: false });
    mockUsePhase.mockReturnValue("knockout");
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.getByText("real-app")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- ProfileGate`
Expected: FAIL — `ProfileGate.tsx` doesn't import `useTournamentPhase` yet, and never renders `RegistrationClosedScreen`. The 6 pre-existing tests should still pass at this point (only the new `describe` block fails), confirming the `"notstarted"` default is doing its job even before `ProfileGate.tsx` itself changes.

- [ ] **Step 8: Modify `ProfileGate.tsx`**

```tsx
// src/profile/ProfileGate.tsx
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./useProfile";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { SignupFlow } from "../signup/SignupFlow";
import { RegistrationClosedScreen } from "./RegistrationClosedScreen";

/**
 * Blocks the rest of the app until a signed-in user has both a profile
 * *and* a survey response — the quiz moved to be mandatory right after
 * sign-up (PAGEMAP_SPEC.md), so a profile alone is no longer enough to let
 * someone through.
 *
 * Deliberately does *not* treat "has a profile but no survey yet" as a
 * resumable state — abandoning mid-quiz (closing the tab, reloading)
 * cancels the whole signup rather than picking back up later (Mert's
 * explicit call). SignupFlow always starts at its welcome message; a stale
 * profile/photo from an abandoned attempt just gets overwritten once they
 * actually complete it, so there's nothing to explicitly clean up here.
 *
 * GREAT_LEAP_SPEC.md §4: once the tournament is no longer `notstarted`, a
 * genuinely never-onboarded account (no profile AND no survey — see this
 * feature's plan doc, Task 13, for why AND rather than the OR used just
 * below) can no longer start onboarding at all; it sees
 * RegistrationClosedScreen instead. An account with *any* onboarding
 * progress (a profile, even without a survey) is unaffected — "signing in
 * never closes."
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { response: survey, loading: surveyLoading } = useSurveyResponse(user?.uid ?? null);
  const phase = useTournamentPhase();
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(false);
  }, [user?.uid]);

  if (authLoading || (user && (profileLoading || surveyLoading))) {
    return null;
  }

  if (user && !profile && !survey && phase !== "notstarted") {
    return <RegistrationClosedScreen />;
  }

  if (user && (!profile || !survey) && !completed) {
    return <SignupFlow uid={user.uid} onDone={() => setCompleted(true)} />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- ProfileGate`
Expected: PASS, all 10 tests green (6 pre-existing + 4 new).

- [ ] **Step 10: Commit**

```bash
git add src/profile/ProfileGate.tsx src/profile/ProfileGate.test.tsx
git commit -m "feat: close registration for never-onboarded accounts once the tournament starts"
```

- [ ] **Step 11: Manually verify in the browser**

Run: `npm run dev`, use the dev panel to set `tournamentState/current.phase` to `leaguephase`, sign in with a Google account that has never completed onboarding on this project.
Expected: `RegistrationClosedScreen` renders (message + spectator Home) instead of `SignupFlow`; setting phase back to `notstarted` and reloading shows `SignupFlow` again as before.

- [ ] **Step 12: Commit**

```bash
git commit --allow-empty -m "chore: manual verification checkpoint for registration closing"
```

---

## Plan Complete

At the end of this plan: every started `VisibilityState` on Home shows real content instead of the `BLURB` placeholder — signed-in users get the six-widget jigsaw (league table/bracket swap, rank-history graph, chat, forum, mini-leaderboard, upcoming matches, plus a bracket CTA during `preknockout`), signed-out visitors get a leaderboard-style composition with the same bracket swap and an always-available sign-in affordance, and a genuinely new account can no longer start onboarding once the tournament has started, seeing a self-contained spectator screen instead. Combined with Plan 1 (data layer) and Plan 2 (bracket feature), GREAT_LEAP_SPEC.md's full scope (§2 through §7) is implemented.
