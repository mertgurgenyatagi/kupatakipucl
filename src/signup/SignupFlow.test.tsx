import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { SignupFlow } from "./SignupFlow";

// AnimatePresence's exit animations never resolve under fake timers (motion
// drives them off rAF, not setTimeout), which leaves the outgoing step
// stuck in the DOM mid-test. Swapped for an immediate passthrough — this
// test is about the step machine's logic, not motion's own animation
// timing.
vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  const passthrough =
    (tag: string) =>
    ({ children, initial, animate, exit, variants, transition, whileInView, viewport, ...rest }: any) => {
      const Tag = tag as any;
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

const mockSaveProfile = vi.fn();
const mockSaveSurveyResponse = vi.fn();

vi.mock("../profile/useProfile", () => ({
  saveProfile: (...args: unknown[]) => mockSaveProfile(...args),
}));

vi.mock("../predictions/useSurveyResponse", () => ({
  saveSurveyResponse: (...args: unknown[]) => mockSaveSurveyResponse(...args),
}));

vi.mock("./steps/PhotoStep", () => ({
  PhotoStep: ({ onSelect }: { onSelect: (file: File) => void }) => (
    <button onClick={() => onSelect(new File(["x"], "photo.png"))}>pick-photo</button>
  ),
}));

vi.mock("./steps/NameStep", () => ({
  NameStep: ({ onSubmit, disabled }: { onSubmit: (f: string, l: string) => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={() => onSubmit("Mert", "G")}>
      submit-name
    </button>
  ),
}));

vi.mock("./steps/AgeRollerStep", () => ({
  AgeRollerStep: ({ onConfirm }: { onConfirm: (v: number) => void }) => (
    <button onClick={() => onConfirm(30)}>confirm-age</button>
  ),
}));

vi.mock("./ChoiceStep", () => ({
  ChoiceStep: ({
    question,
    onSelect,
    disabled,
  }: {
    question: string;
    onSelect: (v: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <span>question:{question}</span>
      <button disabled={disabled} onClick={() => onSelect("test-value")}>
        choose
      </button>
    </div>
  ),
}));

vi.mock("./steps/UclTeamStep", () => ({
  UclTeamStep: ({ onSelect }: { onSelect: (teamId: string | null) => void }) => (
    <button onClick={() => onSelect("arsenal")}>pick-team</button>
  ),
}));

// waitFor/findBy poll via setTimeout internally, which never fires under
// fake timers — flushing the microtask queue directly and re-querying
// synchronously sidesteps that instead of fighting the two timer systems.
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function reachNameStep() {
  await act(async () => {
    vi.advanceTimersByTime(2600); // past the welcome message's AutoAdvance
  });
  fireEvent.click(screen.getByText("pick-photo"));
}

describe("SignupFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSaveProfile.mockReset();
    mockSaveSurveyResponse.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("always starts at the welcome message, then auto-advances to the photo step", async () => {
    render(<SignupFlow uid="uid1" onDone={vi.fn()} />);
    expect(screen.getByText(/hoş geldin/)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByText("pick-photo")).toBeInTheDocument();
  });

  it("saves the profile after the name step, then the survey after the last quiz question, then calls onDone", async () => {
    const onDone = vi.fn();
    mockSaveProfile.mockResolvedValue(undefined);
    mockSaveSurveyResponse.mockResolvedValue(undefined);
    render(<SignupFlow uid="uid1" onDone={onDone} />);

    await reachNameStep();
    fireEvent.click(screen.getByText("submit-name"));
    await flushMicrotasks();
    expect(mockSaveProfile).toHaveBeenCalledWith("uid1", "Mert", "G", expect.any(File));

    // bounce-profile
    expect(screen.getByText("Tamamdır! Şimdi sana birkaç sorumuz var.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // quiz-age
    fireEvent.click(screen.getByText("confirm-age"));
    // quiz-knowledge / quiz-messi / quiz-superlig
    expect(screen.getByText("question:Futbol bilgini nasıl değerlendirirsin?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("choose"));
    expect(screen.getByText("question:Messi mi Ronaldo mu?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("choose"));
    expect(screen.getByText("question:Süper Lig'de hangi takımı tutuyorsun?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("choose"));

    // quiz-uclteam
    fireEvent.click(screen.getByText("pick-team"));

    // quiz-device — the last question, triggers the survey save
    expect(screen.getByText(/telefonda mı masaüstünde mi/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("choose"));
    await flushMicrotasks();

    expect(mockSaveSurveyResponse).toHaveBeenCalledWith("uid1", {
      age: 30,
      footballKnowledge: NaN, // the "test-value" mock choice isn't a real number
      messiOrRonaldo: "test-value",
      superLigTeam: "test-value",
      uclTeam: "arsenal",
      device: "test-value",
      submittedAt: expect.any(Number),
    });

    // bounce-survey
    expect(screen.getByText("Kayıt başarılı!")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and stays on the name step when saving the profile fails", async () => {
    mockSaveProfile.mockRejectedValue(new Error("network"));
    render(<SignupFlow uid="uid1" onDone={vi.fn()} />);

    await reachNameStep();
    fireEvent.click(screen.getByText("submit-name"));
    await flushMicrotasks();

    expect(screen.getByRole("alert")).toHaveTextContent("Profil kaydedilemedi, tekrar deneyin.");
    expect(screen.getByText("submit-name")).toBeInTheDocument();
  });

  it("shows an inline error and stays on the last quiz question when saving the survey fails", async () => {
    mockSaveSurveyResponse.mockRejectedValue(new Error("network"));
    mockSaveProfile.mockResolvedValue(undefined);
    render(<SignupFlow uid="uid1" onDone={vi.fn()} />);

    await reachNameStep();
    fireEvent.click(screen.getByText("submit-name"));
    await flushMicrotasks();
    await act(async () => {
      vi.advanceTimersByTime(2000); // bounce-profile
    });

    fireEvent.click(screen.getByText("confirm-age"));
    fireEvent.click(screen.getByText("choose")); // knowledge
    fireEvent.click(screen.getByText("choose")); // messi
    fireEvent.click(screen.getByText("choose")); // superlig
    fireEvent.click(screen.getByText("pick-team"));
    fireEvent.click(screen.getByText("choose")); // device
    await flushMicrotasks();

    expect(screen.getByRole("alert")).toHaveTextContent("Cevapların kaydedilemedi, tekrar deneyin.");
    expect(screen.getByText(/telefonda mı masaüstünde mi/)).toBeInTheDocument();
  });
});
