import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProfilePage } from "./ProfilePage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUseProfile = vi.fn();
const mockUpdateProfilePhoto = vi.fn();
const mockDeleteProfile = vi.fn();
const mockUsePrediction = vi.fn();
const mockSavePrediction = vi.fn();
const mockDeletePrediction = vi.fn();
const mockUseSurveyResponse = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();
const mockSignOut = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../profile/useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
  updateProfilePhoto: (...args: unknown[]) => mockUpdateProfilePhoto(...args),
  deleteProfile: (...args: unknown[]) => mockDeleteProfile(...args),
}));

vi.mock("../predictions/usePrediction", () => ({
  usePrediction: (uid: string | null) => mockUsePrediction(uid),
  savePrediction: (...args: unknown[]) => mockSavePrediction(...args),
  deletePrediction: (...args: unknown[]) => mockDeletePrediction(...args),
}));

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...actual,
    signOut: (...args: unknown[]) => mockSignOut(...args),
  };
});

vi.mock("../predictions/useSurveyResponse", () => ({
  useSurveyResponse: (uid: string | null) => mockUseSurveyResponse(uid),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );
}

const PROFILE = { firstName: "Mert", lastName: "G", photoURL: "photo-url", createdAt: 1 };
const SURVEY = {
  age: 30,
  footballKnowledge: 5,
  messiOrRonaldo: "messi" as const,
  superLigTeam: "Fenerbahçe",
  uclTeam: null,
  device: "phone" as const,
  submittedAt: 1,
};

describe("ProfilePage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockUseProfile.mockReturnValue({ profile: PROFILE, loading: false });
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false, error: false });
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    mockUseResults.mockReturnValue({ results: {}, loading: false });
    mockUpdateProfilePhoto.mockReset();
    mockSavePrediction.mockReset();
    mockDeleteProfile.mockReset();
    mockDeletePrediction.mockReset();
    mockSignOut.mockReset();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    renderPage();
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("shows a loading skeleton while profile or prediction is loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseProfile.mockReturnValue({ profile: null, loading: true });
    renderPage();
    expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument();
  });

  it("shows the profile's name and photo", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    expect(screen.getByText("Mert G")).toBeInTheDocument();
  });

  it("uploads a new photo when a file is selected", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUpdateProfilePhoto.mockResolvedValue({ ...PROFILE, photoURL: "new-photo-url" });
    renderPage();

    const file = new File(["data"], "new.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(mockUpdateProfilePhoto).toHaveBeenCalledWith("uid1", PROFILE, file)
    );
  });

  it("shows survey answers when a response exists", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseSurveyResponse.mockReturnValue({ response: SURVEY, loading: false, error: false });
    renderPage();
    expect(screen.getByText("Fenerbahçe.")).toBeInTheDocument();
    expect(screen.getByText("Messi.")).toBeInTheDocument();
  });

  it("shows a not-filled-in message when there's no survey response", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    expect(screen.getByText("Anketi henüz doldurmadınız.")).toBeInTheDocument();
  });

  it("shows an error message when the survey read fails", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false, error: true });
    renderPage();
    expect(screen.getByText("Anket cevapları görüntülenemiyor.")).toBeInTheDocument();
  });

  it("points to /predictions when there's no prediction yet", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    const link = screen.getByText("Tahmininizi gönderin");
    expect(link.closest("a")).toHaveAttribute("href", "/predictions");
  });

  it("shows the ranking with an edit button when unlocked, and lets you revise it", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 2 });
    renderPage();

    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Düzenle")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Düzenle"));
    fireEvent.click(screen.getByText("submit-ranking"));
    expect(
      screen.getByText("Bu tahmini üzerine yazmak istediğinize emin misiniz?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Evet, kaydet"));
    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
  });

  it("shows the ranking without an edit button once locked", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    renderPage();
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.queryByText("Düzenle")).not.toBeInTheDocument();
  });

  it("opens that team's popup when a ranked row is clicked", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    renderPage();
    fireEvent.click(screen.getByText("Arsenal"));
    expect(screen.getByText(/takım dosyası/)).toBeInTheDocument();
  });

  it("shows the average position everyone predicted for each team", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal", "barcelona"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    mockUseLeaderboard.mockReturnValue({
      entries: [
        { uid: "a", firstName: "A", lastName: "A", photoURL: "", points: 0, ranking: ["arsenal", "barcelona"] },
        { uid: "b", firstName: "B", lastName: "B", photoURL: "", points: 0, ranking: ["barcelona", "arsenal"] },
      ],
      loading: false,
    });
    renderPage();
    // arsenal: predicted 1st then 2nd -> average 1.5; barcelona: 2nd then 1st -> average 1.5
    expect(screen.getAllByText("1.5")).toHaveLength(2);
  });

  it("glows a row whose pick is currently landing correct", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal", "barcelona"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    mockUseResults.mockReturnValue({
      results: { arsenal: { position: 1 }, barcelona: { position: 30 } },
      loading: false,
    });
    renderPage();
    const arsenalRow = screen.getByText("Arsenal").closest("li");
    const barcelonaRow = screen.getByText("Barcelona").closest("li");
    expect(arsenalRow?.className).toContain("shadow-");
    expect(barcelonaRow?.className).not.toContain("shadow-");
  });

  it("opens a confirm dialog when the delete-profile button is clicked", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Profili sil" }));
    expect(
      screen.getByText("Profilini silmek istediğine emin misin?")
    ).toBeInTheDocument();
  });

  it("deletes the profile and prediction, then signs out, on confirm", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockDeleteProfile.mockResolvedValue(undefined);
    mockDeletePrediction.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Profili sil" }));
    fireEvent.click(screen.getByText("Evet, sil"));

    await waitFor(() => expect(mockDeleteProfile).toHaveBeenCalledWith("uid1"));
    expect(mockDeletePrediction).toHaveBeenCalledWith("uid1");
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByText("Profilini silmek istediğine emin misin?")
      ).not.toBeInTheDocument()
    );
  });

  it("shows an error and keeps the dialog open when deletion fails", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockDeleteProfile.mockRejectedValue(new Error("permission-denied"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Profili sil" }));
    fireEvent.click(screen.getByText("Evet, sil"));

    expect(
      await screen.findByText("Profil silinemedi, tekrar deneyin.")
    ).toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(
      screen.getByText("Profilini silmek istediğine emin misin?")
    ).toBeInTheDocument();
  });
});
