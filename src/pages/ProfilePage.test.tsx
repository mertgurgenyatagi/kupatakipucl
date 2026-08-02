import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProfilePage } from "./ProfilePage";
import { TEAMS } from "../predictions/teams";
import { FIXTURES } from "../devpanel/fixtures";

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
const mockUseTournamentPhase = vi.fn();
const mockSignOut = vi.fn();
// TeamPopup/MatchupPopup both call useDevMatches (getDocs against the real
// "devMatches" collection) unconditionally on every render, regardless of
// whether their own dialog is open. Left unmocked, that's a real network
// call to Firestore on every test in this file — flaky and noisy (observed
// "permission-denied" console errors during development of this test).
// Mocking the hook itself (rather than raw firebase/firestore, which
// usePlayers.ts also depends on via onSnapshot and isn't otherwise mocked
// in this file) keeps this scoped to just the match-outcomes data.
const mockUseDevMatches = vi.fn();
vi.mock("../devpanel/useDevMatches", () => ({
  useDevMatches: () => mockUseDevMatches(),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
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
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
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
    mockUseTournamentPhase.mockReturnValue("notstarted");
    mockUseDevMatches.mockReturnValue({ outcomes: {}, loading: false, refetch: () => {} });
    mockUpdateProfilePhoto.mockReset();
    mockSavePrediction.mockReset();
    mockDeleteProfile.mockReset();
    mockDeletePrediction.mockReset();
    mockSignOut.mockReset();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    renderPage();
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
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

  it("hides the rank/points header section before the tournament starts", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    expect(screen.queryByText("Sıra")).not.toBeInTheDocument();
    expect(screen.queryByText("Puan")).not.toBeInTheDocument();
  });

  it("shows the rank/points header section once the tournament has started", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    renderPage();
    expect(screen.getByText("Sıra")).toBeInTheDocument();
    expect(screen.getByText("Puan")).toBeInTheDocument();
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

    fireEvent.click(screen.getByText("Tamam"));
    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
  });

  it("backing out of the overwrite confirmation with Geri leaves the original prediction unchanged", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    renderPage();

    fireEvent.click(screen.getByText("Düzenle"));
    fireEvent.click(screen.getByText("submit-ranking"));
    fireEvent.click(screen.getByText("Geri"));

    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(mockSavePrediction).not.toHaveBeenCalled();
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

  it("opens the Matchup Popup when a match row is clicked inside TeamPopup", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    const fixture = FIXTURES[0];
    const homeTeam = TEAMS.find((t) => t.id === fixture.homeTeamId)!;
    const awayTeam = TEAMS.find((t) => t.id === fixture.awayTeamId)!;
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: [fixture.homeTeamId, fixture.awayTeamId], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    renderPage();

    fireEvent.click(await screen.findByText(homeTeam.name));
    // TeamPopup is now open on the home team; its match-history row for
    // this fixture is the row itself, not the nested opponent-team button.
    const opponentTeamButton = (await screen.findByText(awayTeam.shortName)).closest("button")!;
    const row = opponentTeamButton.closest('[role="button"]')!;
    fireEvent.click(row);

    expect(await screen.findAllByRole("dialog")).toHaveLength(1);
  });

  it("shows the average position everyone predicted for each team, once the tournament has started", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
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

  it("hides the average position while logged-in-not-started", () => {
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
    expect(screen.queryByText("1.5")).not.toBeInTheDocument();
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

    await waitFor(() => expect(mockDeleteProfile).toHaveBeenCalledWith("uid1", "photo-url"));
    expect(mockDeletePrediction).toHaveBeenCalledWith("uid1");
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("home-page")).toBeInTheDocument());
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
