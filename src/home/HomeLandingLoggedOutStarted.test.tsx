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
