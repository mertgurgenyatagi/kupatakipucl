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
  MatchupPopup: ({ fixtureId, phase }: { fixtureId: string | null; phase: string }) => (
    <div>matchup-popup:{fixtureId ?? "closed"}:{phase}</div>
  ),
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
      phase="leaguephase"
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
    expect(screen.getByText("matchup-popup:closed:leaguephase")).toBeInTheDocument();

    fireEvent.click(screen.getByText("upcoming-preview-fixture"));
    expect(screen.getByText("matchup-popup:fixture-1:leaguephase")).toBeInTheDocument();

    fireEvent.click(screen.getByText("team-popup-select-fixture"));
    expect(screen.getByText("matchup-popup:fixture-2:leaguephase")).toBeInTheDocument();
  });

  it("passes the real current phase through to MatchupPopup, e.g. for the knockout reuse", () => {
    renderPage({ phase: "knockout" });
    expect(screen.getByText("matchup-popup:closed:knockout")).toBeInTheDocument();
  });
});
