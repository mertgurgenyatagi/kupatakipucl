import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockUseDevConfig = vi.fn();
const mockSetTournamentActive = vi.fn();
const mockSetCurrentDateOverride = vi.fn();
const mockSetLoggedInOverride = vi.fn();
const mockUseDevMatches = vi.fn();
const mockSetMatchOutcome = vi.fn();

vi.mock("./useDevConfig", () => ({
  useDevConfig: () => mockUseDevConfig(),
  setTournamentActive: (...args: unknown[]) => mockSetTournamentActive(...args),
  setCurrentDateOverride: (...args: unknown[]) => mockSetCurrentDateOverride(...args),
  setLoggedInOverride: (...args: unknown[]) => mockSetLoggedInOverride(...args),
}));

vi.mock("./useDevMatches", () => ({
  useDevMatches: () => mockUseDevMatches(),
  setMatchOutcome: (...args: unknown[]) => mockSetMatchOutcome(...args),
}));

import { DevPanel } from "./DevPanel";
import { FIXTURES } from "./fixtures";

describe("DevPanel", () => {
  beforeEach(() => {
    mockSetTournamentActive.mockReset();
    mockSetCurrentDateOverride.mockReset();
    mockSetLoggedInOverride.mockReset();
    mockSetMatchOutcome.mockReset();
    mockUseDevConfig.mockReturnValue({
      config: { tournamentActive: null, currentDateOverride: null, loggedInOverride: null },
      loading: false,
    });
    mockUseDevMatches.mockReturnValue({ outcomes: {}, loading: false, refetch: vi.fn() });
  });

  it("renders nothing while config or matches are loading", () => {
    mockUseDevConfig.mockReturnValue({
      config: { tournamentActive: null, currentDateOverride: null, loggedInOverride: null },
      loading: true,
    });
    const { container } = render(<DevPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls setLoggedInOverride(true) when 'Giriş yapılmış' is clicked", () => {
    render(<DevPanel />);
    fireEvent.click(screen.getByText("Giriş yapılmış"));
    expect(mockSetLoggedInOverride).toHaveBeenCalledWith(true);
  });

  it("renders all 8 matchdays and 144 total match selects", () => {
    render(<DevPanel />);
    for (let md = 1; md <= 8; md++) {
      expect(screen.getByText(`${md}. Hafta`)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("combobox")).toHaveLength(144);
  });

  it("calls setTournamentActive(true) when 'Başladı' is clicked", () => {
    render(<DevPanel />);
    fireEvent.click(screen.getByText("Başladı"));
    expect(mockSetTournamentActive).toHaveBeenCalledWith(true);
  });

  it("shows the auto-derived current date as 'not played yet' when nothing is decided", () => {
    render(<DevPanel />);
    expect(screen.getByText("Henüz hiçbir maç oynanmadı")).toBeInTheDocument();
  });

  it("shows the latest decided match's date as the auto current date", () => {
    mockUseDevMatches.mockReturnValue({
      outcomes: { [FIXTURES[0].id]: "homewin" },
      loading: false,
      refetch: vi.fn(),
    });
    render(<DevPanel />);
    expect(screen.getByText(FIXTURES[0].kickoffUtc.slice(0, 10))).toBeInTheDocument();
  });

  it("only enables the first fixture's real outcomes, not the second's, when nothing is decided", () => {
    render(<DevPanel />);
    const selects = screen.getAllByRole("combobox");
    const firstOptions = Array.from(selects[0].querySelectorAll("option")) as HTMLOptionElement[];
    const secondOptions = Array.from(selects[1].querySelectorAll("option")) as HTMLOptionElement[];
    expect(firstOptions.find((o) => o.value === "homewin")!.disabled).toBe(false);
    expect(secondOptions.find((o) => o.value === "homewin")!.disabled).toBe(true);
    // "notplayed" is never disabled, even when locked.
    expect(secondOptions.find((o) => o.value === "notplayed")!.disabled).toBe(false);
  });

  it("calls setMatchOutcome with the fixture id and refetches on success", async () => {
    mockSetMatchOutcome.mockResolvedValue(undefined);
    const refetch = vi.fn();
    mockUseDevMatches.mockReturnValue({ outcomes: {}, loading: false, refetch });
    render(<DevPanel />);
    const firstSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(firstSelect, { target: { value: "homewin" } });
    await waitFor(() => expect(mockSetMatchOutcome).toHaveBeenCalledWith({}, FIXTURES[0].id, "homewin"));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it("shows an inline error when setMatchOutcome rejects", async () => {
    mockSetMatchOutcome.mockRejectedValue(new Error("All earlier matches must be decided first."));
    render(<DevPanel />);
    const someLaterSelect = screen.getAllByRole("combobox")[5];
    fireEvent.change(someLaterSelect, { target: { value: "homewin" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("All earlier matches must be decided first.");
  });
});
