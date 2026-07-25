import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PredictionsPage } from "./PredictionsPage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUsePrediction = vi.fn();
const mockSavePrediction = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../predictions/usePrediction", () => ({
  usePrediction: (uid: string | null) => mockUsePrediction(uid),
  savePrediction: (...args: unknown[]) => mockSavePrediction(...args),
}));

vi.mock("../predictions/TeamRanker", () => ({
  TeamRanker: ({
    initialOrder,
    onSubmit,
  }: {
    initialOrder: string[];
    onSubmit: (order: string[]) => void;
  }) => (
    <div>
      <span>ranker-initial:{initialOrder.join(",")}</span>
      <button onClick={() => onSubmit(["z", "y", "x"])}>submit-ranking</button>
    </div>
  ),
}));

vi.mock("../predictions/SubmissionCounter", () => ({
  SubmissionCounter: () => <div>submission-counter</div>,
}));

describe("PredictionsPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockSavePrediction.mockReset();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while the prediction is loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: true });
    const { container } = render(<PredictionsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  // The survey used to gate this (see PredictionsPage.tsx's comment) — it's
  // mandatory at sign-up now (ProfileGate/SignupFlow), so reaching this page
  // with no prediction goes straight to the ranker.
  it("goes straight to the ranker when there's no existing prediction (pre-tournament)", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("ranker-initial:ajax,arsenal,atalanta,athletic-club,atletico-madrid,barcelona,bayer-leverkusen,bayern-munich,benfica,bodo-glimt,borussia-dortmund,chelsea,club-brugge,copenhagen,eintracht-frankfurt,galatasaray,inter-milan,juventus,kairat-almaty,liverpool,manchester-city,marseille,monaco,napoli,newcastle-united,olympiacos,pafos,paris-saint-germain,psv-eindhoven,qarabag,real-madrid,slavia-prague,sporting-cp,tottenham-hotspur,union-saint-gilloise,villarreal")).toBeInTheDocument();
  });

  it("saves the first-time prediction on submit", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 1 });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("submit-ranking"));

    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
  });

  it("shows an inline error and stays on the ranker when the first-time submission fails", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockSavePrediction.mockRejectedValue(new Error("network"));
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("submit-ranking"));

    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();
  });

  it("shows the current ranking with an edit button when a prediction already exists (pre-tournament)", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Düzenle")).toBeInTheDocument();
    expect(screen.getByText("submission-counter")).toBeInTheDocument();
  });

  it("editing requires overwrite confirmation, and discarding leaves the original unchanged", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("Düzenle"));
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();

    fireEvent.click(screen.getByText("submit-ranking"));
    expect(mockSavePrediction).not.toHaveBeenCalled();
    expect(
      screen.getByText("Bu tahmini üzerine yazmak istediğinize emin misiniz?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Vazgeç"));
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(mockSavePrediction).not.toHaveBeenCalled();
  });

  it("confirming the overwrite saves the new ranking", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 2 });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("Düzenle"));
    fireEvent.click(screen.getByText("submit-ranking"));
    fireEvent.click(screen.getByText("Evet, kaydet"));

    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
  });

  it("shows an inline error and keeps the confirm dialog open when the overwrite save fails, but Vazgeç still works", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    mockSavePrediction.mockRejectedValue(new Error("network"));
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("Düzenle"));
    fireEvent.click(screen.getByText("submit-ranking"));
    fireEvent.click(screen.getByText("Evet, kaydet"));

    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("Bu tahmini üzerine yazmak istediğinize emin misiniz?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Vazgeç"));
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the locked read-only ranking post-tournament", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.queryByText("Düzenle")).not.toBeInTheDocument();
  });

  it("shows a not-submitted message post-tournament when there's no prediction", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("Bir tahmin göndermediniz.")).toBeInTheDocument();
  });
});
