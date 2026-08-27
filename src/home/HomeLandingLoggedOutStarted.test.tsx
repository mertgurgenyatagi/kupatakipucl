import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomeLandingLoggedOutStarted } from "./HomeLandingLoggedOutStarted";

const mockUsePosts = vi.fn();

vi.mock("../forum/usePosts", () => ({
  usePosts: () => mockUsePosts(),
}));

vi.mock("../leaderboard/LeagueTableList", () => ({
  LeagueTableList: ({ onSelectTeam }: { onSelectTeam: (id: string) => void }) => (
    <button onClick={() => onSelectTeam("aek-athens")}>league-table-list</button>
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
  ParticipantPopup: ({
    ranked,
    viewerLoggedIn,
  }: {
    ranked: { entry: { uid: string } } | null;
    viewerLoggedIn?: boolean;
  }) => (
    <div>participant-popup:{ranked ? ranked.entry.uid : "closed"}:{String(viewerLoggedIn)}</div>
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

const player = { uid: "player-1", firstName: "Ada", photoURL: "", createdAt: 1 };

function renderPage(overrides: Partial<Parameters<typeof HomeLandingLoggedOutStarted>[0]> = {}) {
  return render(
    <HomeLandingLoggedOutStarted results={{}} players={[player]} entries={[]} phase="leaguephase" {...overrides} />
  );
}

describe("HomeLandingLoggedOutStarted", () => {
  beforeEach(() => {
    mockUsePosts.mockReturnValue({ posts: [], loading: false, refetch: vi.fn(), loadOlder: vi.fn(), hasMore: false });
  });

  it("shows the whole-page bento skeleton while posts (and their images) are still loading", () => {
    // Posts are part of this page's own initial-load image-preload gate
    // (see the sitewide image-preload-gate spec) — the whole page now stays
    // on its shared skeleton until posts resolve, instead of revealing
    // everything but a per-cell forum skeleton.
    mockUsePosts.mockReturnValue({ posts: [], loading: true, refetch: vi.fn(), loadOlder: vi.fn(), hasMore: false });
    renderPage();
    expect(screen.getByTestId("home-bento-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("league-table-list")).not.toBeInTheDocument();
    expect(screen.queryByText("forum-widget:null")).not.toBeInTheDocument();
  });

  it("renders all four widgets once posts have loaded", () => {
    renderPage();
    expect(screen.getByText("league-table-list")).toBeInTheDocument();
    expect(screen.getByText("upcoming-preview")).toBeInTheDocument();
    expect(screen.getByText("forum-widget:null")).toBeInTheDocument();
    expect(screen.getByText("home-hero")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });

  it("selecting a team opens TeamPopup and closes ParticipantPopup", () => {
    renderPage();
    fireEvent.click(screen.getByText("league-table-list"));
    expect(screen.getByText("team-popup:aek-athens")).toBeInTheDocument();
    expect(screen.getByText("participant-popup:closed:false")).toBeInTheDocument();
  });

  it("selecting a team from the upcoming-matches widget also opens TeamPopup", () => {
    renderPage();
    fireEvent.click(screen.getByText("upcoming-preview"));
    expect(screen.getByText("team-popup:arsenal")).toBeInTheDocument();
  });

  it("selecting a participant (from the forum widget or the standings) opens ParticipantPopup and closes TeamPopup, with viewerLoggedIn always false", () => {
    renderPage({ entries: [{ uid: "player-1", firstName: "Ada", photoURL: "", points: 10, ranking: [] }] });
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:player-1:false")).toBeInTheDocument();
    expect(screen.getByText("team-popup:closed")).toBeInTheDocument();
  });

  it("opens the Matchup Popup when a fixture is selected from the upcoming-matches preview or from TeamPopup's match history", () => {
    renderPage({ players: [] });
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
