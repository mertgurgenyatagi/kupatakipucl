import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { KnockoutPredictionsPage } from "./KnockoutPredictionsPage";
import { PAGE_UNAVAILABLE_MESSAGE } from "@/components/ui/page-unavailable";

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
const mockUseKnockoutPrediction = vi.fn();
const mockSaveKnockoutPrediction = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../knockout/useKnockoutPrediction", () => ({
  useKnockoutPrediction: (uid: string | null) => mockUseKnockoutPrediction(uid),
  saveKnockoutPrediction: (...args: unknown[]) => mockSaveKnockoutPrediction(...args),
}));

vi.mock("../knockout/KnockoutStagePicker", () => ({
  KnockoutStagePicker: ({
    onSubmit,
  }: {
    onSubmit: (data: {
      quarterFinalists: string[];
      semiFinalists: string[];
      finalists: string[];
      champion: string;
    }) => void;
  }) => (
    <div>
      <span>knockout-stage-picker</span>
      <button
        onClick={() =>
          onSubmit({
            quarterFinalists: ["real-madrid", "arsenal", "manchester-city", "barcelona", "slovan-bratislava", "roma", "real-betis", "stuttgart"],
            semiFinalists: ["real-madrid", "manchester-city", "slovan-bratislava", "real-betis"],
            finalists: ["real-madrid", "slovan-bratislava"],
            champion: "real-madrid",
          })
        }
      >
        submit-knockout-picker
      </button>
    </div>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/knockout-predictions"]}>
      <Routes>
        <Route path="/knockout-predictions" element={<KnockoutPredictionsPage />} />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("KnockoutPredictionsPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false });
    mockUseVisibilityState.mockReturnValue("loggedin_preknockout");
    mockUseKnockoutPrediction.mockReturnValue({ prediction: null, loading: false });
    mockSaveKnockoutPrediction.mockReset();
  });

  /**
   * The Round of 16 does not exist until the league phase ends, so before
   * 'preknockout' this page was offering people a draw that had not
   * happened. It is not linked from the nav, so this was URL-only — but the
   * document it wrote was real.
   */
  it("is unavailable before the knockout rounds are a real thing to predict", () => {
    for (const state of ["loggedin_notstarted", "loggedin_leaguephase"] as const) {
      mockUseVisibilityState.mockReturnValue(state);
      const { unmount } = renderPage();
      expect(screen.getByText(PAGE_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
      expect(screen.queryByText(/Sıra eleme tahminlerinde/)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("is available once the knockout rounds are set", () => {
    for (const state of ["loggedin_preknockout", "loggedin_knockout"] as const) {
      mockUseVisibilityState.mockReturnValue(state);
      const { unmount } = renderPage();
      expect(screen.getByText(/Sıra eleme tahminlerinde/)).toBeInTheDocument();
      unmount();
    }
  });

  /**
   * Matches /predictions, which is also a first-submission-only door.
   * Re-entering with a bracket already saved would have started a fresh
   * empty one and silently overwritten it on submit.
   */
  it("sends you home instead of restarting a bracket you already submitted", () => {
    mockUseKnockoutPrediction.mockReturnValue({
      prediction: {
        quarterFinalists: ["real-madrid", "arsenal", "manchester-city", "barcelona", "slovan-bratislava", "roma", "real-betis", "stuttgart"],
        semiFinalists: ["real-madrid", "manchester-city", "slovan-bratislava", "real-betis"],
        finalists: ["real-madrid", "slovan-bratislava"],
        champion: "real-madrid",
        submittedAt: 1,
        updatedAt: 1,
      },
      loading: false,
    });
    renderPage();
    expect(screen.getByText("home-page")).toBeInTheDocument();
  });

  it("shows skeleton while loading", () => {
    mockUseKnockoutPrediction.mockReturnValue({ prediction: null, loading: true });
    renderPage();
    expect(screen.getByTestId("knockout-skeleton")).toBeInTheDocument();
  });

  it("advances through intro beats to the picker stage", () => {
    renderPage();

    // Beat 1
    expect(screen.getByText(/Sıra eleme tahminlerinde/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Devam et"));

    // Beat 2
    expect(screen.getByText(/Bütün eleme turunu baştan sona seç/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Devam et"));

    // Beat 3
    expect(screen.getByText((_, element) => element?.tagName === "P" && (element?.textContent?.includes("doğru seçimlerin için 3 puan") ?? false))).toBeInTheDocument();
    fireEvent.click(screen.getByText("Devam et"));

    // Picker stage reached
    expect(screen.getByText("knockout-stage-picker")).toBeInTheDocument();
  });

  it("submits the prediction and displays completion screen", async () => {
    mockSaveKnockoutPrediction.mockResolvedValue({});
    renderPage();

    // Fast-forward through intro beats
    fireEvent.click(screen.getByText("Devam et"));
    fireEvent.click(screen.getByText("Devam et"));
    fireEvent.click(screen.getByText("Devam et"));

    // Submit from picker
    await act(async () => {
      fireEvent.click(screen.getByText("submit-knockout-picker"));
    });

    expect(mockSaveKnockoutPrediction).toHaveBeenCalledWith("user-1", expect.objectContaining({ champion: "real-madrid" }));
    expect(screen.getByText("Eleme tahminlerin kaydedildi!")).toBeInTheDocument();
  });
});
