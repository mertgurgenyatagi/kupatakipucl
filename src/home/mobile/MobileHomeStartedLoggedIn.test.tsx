import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MobileHomeStartedLoggedIn } from "./MobileHomeStartedLoggedIn";
import type { Player } from "../../profile/usePlayers";

const mockUseGracePeriodOpen = vi.fn();

vi.mock("../useGracePeriodOpen", () => ({
  useGracePeriodOpen: () => mockUseGracePeriodOpen(),
}));

vi.mock("./MobileWelcomeBanner", () => ({
  MobileWelcomeBanner: ({ me }: { me: { firstName: string } }) => <div>welcome-banner:{me.firstName}</div>,
}));

vi.mock("../KnockoutPredictionWidget", () => ({
  KnockoutPredictionWidget: () => <div>knockout-prediction-widget</div>,
}));

vi.mock("../../leaderboard/NearbyStandingsList", () => ({
  NearbyStandingsList: () => <div>nearby-standings</div>,
}));

vi.mock("../../forum/RecentPostsPreview", () => ({
  RecentPostsPreview: () => <div>forum-widget</div>,
}));

const me: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };

function renderPage(overrides: Partial<Parameters<typeof MobileHomeStartedLoggedIn>[0]> = {}) {
  return render(
    <MemoryRouter>
      <MobileHomeStartedLoggedIn
        me={me}
        players={[me]}
        entries={[]}
        posts={[]}
        likesByPost={new Map()}
        onToggleLike={vi.fn()}
        onDeletePost={vi.fn()}
        onSaveEdit={vi.fn()}
        onRefetchPosts={vi.fn()}
        onSelectParticipant={vi.fn()}
        phase="leaguephase"
        {...overrides}
      />
    </MemoryRouter>
  );
}

describe("MobileHomeStartedLoggedIn", () => {
  beforeEach(() => {
    mockUseGracePeriodOpen.mockReturnValue(false);
  });

  it("renders the welcome banner, standings and forum normally", () => {
    renderPage();
    expect(screen.getByText("welcome-banner:Mert")).toBeInTheDocument();
    expect(screen.getByText("nearby-standings")).toBeInTheDocument();
    expect(screen.getByText("forum-widget")).toBeInTheDocument();
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
