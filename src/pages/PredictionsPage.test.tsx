import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PredictionsPage } from "./PredictionsPage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUsePrediction = vi.fn();
const mockSavePrediction = vi.fn();
const mockSaveSurveyResponse = vi.fn();

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

vi.mock("../predictions/useSurveyResponse", () => ({
  saveSurveyResponse: (...args: unknown[]) => mockSaveSurveyResponse(...args),
}));

vi.mock("../predictions/SurveyForm", () => ({
  SurveyForm: ({ onComplete }: { onComplete: (r: unknown) => void }) => (
    <button onClick={() => onComplete({ age: 30 })}>complete-survey</button>
  ),
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
    mockSaveSurveyResponse.mockReset();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while the prediction is loading", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: true });
    const { container } = render(<PredictionsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the survey first when there's no existing prediction (pre-tournament)", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("complete-survey")).toBeInTheDocument();
  });

  it("moves to the ranker after the survey completes, then saves survey+prediction on submit", async () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 1 });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("complete-survey"));
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();

    fireEvent.click(screen.getByText("submit-ranking"));

    await waitFor(() => expect(mockSaveSurveyResponse).toHaveBeenCalledWith("uid1", { age: 30 }));
    expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]);
  });

  it("shows the current ranking with an edit button when a prediction already exists (pre-tournament)", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Düzenle")).toBeInTheDocument();
    expect(screen.getByText("submission-counter")).toBeInTheDocument();
  });

  it("editing skips the survey, requires overwrite confirmation, and discarding leaves the original unchanged", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("Düzenle"));
    expect(screen.queryByText("complete-survey")).not.toBeInTheDocument();
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
    mockUseVisibilityState.mockReturnValue("NST_LI");
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

  it("shows the locked read-only ranking post-tournament", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.queryByText("Düzenle")).not.toBeInTheDocument();
  });

  it("shows a not-submitted message post-tournament when there's no prediction", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("Bir tahmin göndermediniz.")).toBeInTheDocument();
  });
});
