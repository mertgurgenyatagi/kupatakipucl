import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUseAuth = vi.fn();
const mockUseBracketState = vi.fn();
const mockUseBracketPrediction = vi.fn();
const mockSaveBracketPrediction = vi.fn();

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../bracket/useBracketState", () => ({ useBracketState: () => mockUseBracketState() }));
vi.mock("../bracket/useBracketPrediction", () => ({
  useBracketPrediction: (uid: string | null) => mockUseBracketPrediction(uid),
  saveBracketPrediction: (...args: unknown[]) => mockSaveBracketPrediction(...args),
}));
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => ({ phase: "preknockout", loading: false }),
}));

import { BracketPage } from "./BracketPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <BracketPage />
    </MemoryRouter>
  );
}

describe("BracketPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseBracketState.mockReset();
    mockUseBracketPrediction.mockReset();
    mockSaveBracketPrediction.mockReset();

    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockUseBracketState.mockReturnValue({
      bracketState: { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} },
      loading: false,
    });
    mockUseBracketPrediction.mockReturnValue({ prediction: null, loading: false });
  });

  it("redirects away when the user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { container } = renderPage();
    expect(container).not.toHaveTextContent("Tahminini Gönder");
  });

  it("redirects away when the user has already submitted a bracket prediction", () => {
    mockUseBracketPrediction.mockReturnValue({
      prediction: { picks: { "ro16-1": "Arsenal" }, submittedAt: 1 },
      loading: false,
    });
    const { container } = renderPage();
    expect(container).not.toHaveTextContent("Son 16");
  });

  it("shows the intro step first", () => {
    renderPage();
    expect(screen.getByText(/Şimdi eleme turu/)).toBeInTheDocument();
  });

  it("moves to the board after continuing from the intro", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /devam/i }));
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
  });

  it("calls saveBracketPrediction and shows the done step on successful submit", async () => {
    mockSaveBracketPrediction.mockResolvedValue({ picks: {}, submittedAt: 1 });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /devam/i }));
    expect(await screen.findByText("Arsenal")).toBeInTheDocument();
  });
});
