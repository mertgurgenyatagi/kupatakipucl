import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MobileHomeStartedLoggedOut } from "./MobileHomeStartedLoggedOut";

const mockUseGracePeriodOpen = vi.fn();
const mockUseMobilePopups = vi.fn();

vi.mock("../useGracePeriodOpen", () => ({
  useGracePeriodOpen: () => mockUseGracePeriodOpen(),
}));

vi.mock("../../shell/MobilePopupHost", () => ({
  useMobilePopups: () => mockUseMobilePopups(),
}));

vi.mock("../../mobile/MobileStandingsPair", () => ({
  MobileStandingsPair: ({ children }: { children: React.ReactNode }) => (
    <div>
      <span>standings-pair</span>
      {children}
    </div>
  ),
}));

vi.mock("../../leaderboard/LeagueTableList", () => ({
  LeagueTableList: () => <div>league-table-list</div>,
}));

const player = { uid: "player-1", firstName: "Ada", photoURL: "", createdAt: 1 };

function renderPage(overrides: Partial<Parameters<typeof MobileHomeStartedLoggedOut>[0]> = {}) {
  return render(
    <MemoryRouter>
      <MobileHomeStartedLoggedOut results={{}} players={[player]} entries={[]} phase="leaguephase" {...overrides} />
    </MemoryRouter>
  );
}

describe("MobileHomeStartedLoggedOut", () => {
  beforeEach(() => {
    mockUseGracePeriodOpen.mockReturnValue(false);
    mockUseMobilePopups.mockReturnValue({ openTeam: vi.fn(), openParticipant: vi.fn() });
  });

  it("renders the standings pair and league table normally", () => {
    renderPage();
    expect(screen.getByText("standings-pair")).toBeInTheDocument();
    expect(screen.getByText("league-table-list")).toBeInTheDocument();
  });

  it("shows the grace-period banner during leaguephase while the window is open", () => {
    mockUseGracePeriodOpen.mockReturnValue(true);
    renderPage();
    expect(screen.getByText("Google ile giriş yap")).toBeInTheDocument();
  });

  it("hides the grace-period banner outside leaguephase even if the window is open", () => {
    mockUseGracePeriodOpen.mockReturnValue(true);
    renderPage({ phase: "knockout" });
    expect(screen.queryByText("Google ile giriş yap")).not.toBeInTheDocument();
  });

  it("hides the grace-period banner once the window is closed", () => {
    mockUseGracePeriodOpen.mockReturnValue(false);
    renderPage();
    expect(screen.queryByText("Google ile giriş yap")).not.toBeInTheDocument();
  });
});
