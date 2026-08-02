import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../leaderboard/useResults", () => ({ useResults: () => ({ results: {}, loading: false }) }));
vi.mock("../leaderboard/useLeaderboard", () => ({ useLeaderboard: () => ({ entries: [], loading: false }) }));
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => ({ phase: "leaguephase", loading: false }),
}));
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
