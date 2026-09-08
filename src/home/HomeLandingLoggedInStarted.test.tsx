import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomeLandingLoggedInStarted } from "./HomeLandingLoggedInStarted";
import { Player } from "../profile/usePlayers";

const mockUseGracePeriodOpen = vi.fn();

vi.mock("./useGracePeriodOpen", () => ({
  useGracePeriodOpen: () => mockUseGracePeriodOpen(),
}));

vi.mock("./HomeWelcomeVertical", () => ({
  HomeWelcomeVertical: ({ me }: { me: { firstName: string } }) => (
    <div>welcome-vertical:{me.firstName}</div>
  ),
}));

vi.mock("./HomeStartedHero", () => ({
  HomeStartedHero: ({
    onSelectFixture,
  }: {
    onSelectFixture?: (id: string) => void;
  }) => (
    <div>
      <span>home-started-hero</span>
      <button onClick={() => onSelectFixture?.("fixture-1")}>hero-select-fixture</button>
    </div>
  ),
}));

vi.mock("./KnockoutPredictionWidget", () => ({
  KnockoutPredictionWidget: () => <div>knockout-prediction-widget</div>,
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

// Removed HomeHero mock

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
    <MemoryRouter>
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
      myLobbies={[]}
      sohbetLobbyId={null}
      onChangeSohbetLobby={vi.fn()}
      sohbetLobbyMessages={{ messages: [], loading: false, loadOlder: vi.fn(), loadingOlder: false, hasMoreOlder: false }}
      sohbetLobbyMembers={[]}
      standingsLobbyId={null}
      onChangeStandingsLobby={vi.fn()}
      standingsLobbyMembers={[]}
      managingLobbyId={null}
      onOpenLobbyManagement={vi.fn()}
      onCloseLobbyManagement={vi.fn()}
      onLeftManagedLobby={vi.fn()}
      onDeletedManagedLobby={vi.fn()}
      {...overrides}
      />
    </MemoryRouter>
  );
}

describe("HomeLandingLoggedInStarted", () => {
  beforeEach(() => {
    mockUseGracePeriodOpen.mockReturnValue(false);
  });

  it("renders all widgets for leaguephase, without knockout widget", () => {
    renderPage();
    expect(screen.getByText("welcome-vertical:Mert")).toBeInTheDocument();
    expect(screen.getByText("nearby-standings")).toBeInTheDocument();
    expect(screen.getByText("forum-widget:me")).toBeInTheDocument();
    expect(screen.getByText("home-started-hero")).toBeInTheDocument();
    expect(screen.getByText("chat-room:me:null")).toBeInTheDocument();
    expect(screen.queryByText("knockout-prediction-widget")).not.toBeInTheDocument();
  });

  it("renders the knockout widget in preknockout phase", () => {
    renderPage({ phase: "preknockout" });
    expect(screen.getByText("knockout-prediction-widget")).toBeInTheDocument();
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

  it("opens the Matchup Popup when a fixture is selected from the hero or TeamPopup's match history", () => {
    renderPage();
    expect(screen.getByText("matchup-popup:closed:leaguephase")).toBeInTheDocument();

    fireEvent.click(screen.getByText("hero-select-fixture"));
    expect(screen.getByText("matchup-popup:fixture-1:leaguephase")).toBeInTheDocument();

    fireEvent.click(screen.getByText("team-popup-select-fixture"));
    expect(screen.getByText("matchup-popup:fixture-2:leaguephase")).toBeInTheDocument();
  });

  it("passes the real current phase through to MatchupPopup, e.g. for the knockout reuse", () => {
    renderPage({ phase: "knockout" });
    expect(screen.getByText("matchup-popup:closed:knockout")).toBeInTheDocument();
  });

  it("shows the grace-period banner during leaguephase, open window, no prediction yet", () => {
    mockUseGracePeriodOpen.mockReturnValue(true);
    renderPage({ entries: [] });
    expect(screen.getByText("Tahmininizi gönderin")).toBeInTheDocument();
  });

  it("hides the grace-period banner once me has a leaderboard entry (already submitted)", () => {
    mockUseGracePeriodOpen.mockReturnValue(true);
    renderPage({ entries: [{ uid: "me", firstName: "Mert", photoURL: "", points: 0, ranking: [] }] });
    expect(screen.queryByText("Tahmininizi gönderin")).not.toBeInTheDocument();
  });

  it("hides the grace-period banner outside leaguephase even if the window is open", () => {
    mockUseGracePeriodOpen.mockReturnValue(true);
    renderPage({ phase: "preknockout", entries: [] });
    expect(screen.queryByText("Tahmininizi gönderin")).not.toBeInTheDocument();
  });

  it("hides the grace-period banner once the window is closed", () => {
    mockUseGracePeriodOpen.mockReturnValue(false);
    renderPage({ entries: [] });
    expect(screen.queryByText("Tahmininizi gönderin")).not.toBeInTheDocument();
  });
});
