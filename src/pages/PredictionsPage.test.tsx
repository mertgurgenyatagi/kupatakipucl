import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { PredictionsPage } from "./PredictionsPage";
import { PREDICTION_INTRO_BEATS } from "../predictions/predictionIntroCopy";

// Same reasoning as SignupFlow.test.tsx: AnimatePresence's exit animations
// never resolve under fake timers, so this step machine's own tests swap
// motion for an inert passthrough rather than fighting rAF vs. setTimeout.
vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  const passthrough =
    (tag: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ children, initial, animate, exit, variants, transition, whileInView, viewport, ...rest }: any) => {
      const Tag = tag as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      return <Tag {...rest}>{children}</Tag>;
    };
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({} as Record<string, ReturnType<typeof passthrough>>, {
      get: (_target, tag: string) => passthrough(tag),
    }),
  };
});

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUsePrediction = vi.fn();
const mockSavePrediction = vi.fn();
const mockUseSurveyResponse = vi.fn();

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
  useSurveyResponse: (uid: string | null) => mockUseSurveyResponse(uid),
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
      <span>ranker-initial-count:{initialOrder.length}</span>
      <button onClick={() => onSubmit(["z", "y", "x"])}>submit-ranking</button>
    </div>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/predictions"]}>
      <Routes>
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// The team-crest preload gate resolves a microtask after mount even with
// test/setup.ts's instant Image mock (Promise.all(...).then(...) is
// inherently async) — every test that asserts on real page content (not
// the loading skeleton or the blocked message, which both short-circuit
// ahead of the gate) needs to flush past it first. Reuses flushMicrotasks
// (defined below) once it exists in scope.

function reachRanker() {
  for (const beat of PREDICTION_INTRO_BEATS) {
    // Beats with boldTerms split their sentence across multiple inline
    // elements, so a plain getByText(fullSentence) won't match any single
    // node — match on the paragraph's reconstructed textContent instead.
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === beat.text)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Devam et"));
  }
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PredictionsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockSavePrediction.mockReset();
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false, error: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    renderPage();
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("shows a minimal loading skeleton while the prediction is loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: true });
    renderPage();
    expect(screen.getByTestId("predictions-skeleton")).toBeInTheDocument();
  });

  it("redirects home once a prediction already exists", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    renderPage();
    await flushMicrotasks();
    expect(screen.getByText("home-page")).toBeInTheDocument();
  });

  it("redirects home once the tournament has started, prediction or not", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    renderPage();
    await flushMicrotasks();
    expect(screen.getByText("home-page")).toBeInTheDocument();
  });

  it("starts at the first intro beat", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    renderPage();
    await flushMicrotasks();
    expect(screen.getByText(PREDICTION_INTRO_BEATS[0].text)).toBeInTheDocument();
  });

  it("shows the scoring-example diagram on the middle beat, using the quiz-picked favorite team", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: { uclTeam: "arsenal" }, loading: false, error: false });
    renderPage();
    await flushMicrotasks();
    fireEvent.click(screen.getByText("Devam et"));
    const beatText = PREDICTION_INTRO_BEATS[1].text;
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === beatText)).toBeInTheDocument();
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
  });

  it("advances through every intro beat on Devam et, landing on the ranker", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    renderPage();
    await flushMicrotasks();
    reachRanker();
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();
  });

  it("saves the submitted order, then shows the bounce confirmation, then lands on Home", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 1 });
    renderPage();
    await flushMicrotasks();
    reachRanker();

    fireEvent.click(screen.getByText("submit-ranking"));
    await flushMicrotasks();
    expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]);
    expect(screen.getByText("Tahminlerin kaydedildi!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("home-page")).toBeInTheDocument();
  });

  it("shows an inline error and stays on the ranker when the submission fails", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockSavePrediction.mockRejectedValue(new Error("network"));
    renderPage();
    await flushMicrotasks();
    reachRanker();

    fireEvent.click(screen.getByText("submit-ranking"));
    await flushMicrotasks();

    expect(screen.getByRole("alert")).toHaveTextContent("Tahmininiz kaydedilemedi, tekrar deneyin.");
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();
  });
});
