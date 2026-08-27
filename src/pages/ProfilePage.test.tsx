import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
const mockDeleteSurveyResponse = vi.fn();
const mockDeleteKnockoutPrediction = vi.fn();
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

const mockUseKnockoutPrediction = vi.fn();
const mockSaveKnockoutPrediction = vi.fn();

vi.mock("../knockout/useKnockoutPrediction", () => ({
  useKnockoutPrediction: (uid: string | null) => mockUseKnockoutPrediction(uid),
  saveKnockoutPrediction: (...args: unknown[]) => mockSaveKnockoutPrediction(...args),
  deleteKnockoutPrediction: (...args: unknown[]) => mockDeleteKnockoutPrediction(...args),
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
  deleteSurveyResponse: (...args: unknown[]) => mockDeleteSurveyResponse(...args),
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

// The image-preload gate (useImagePreload) always resolves at least one
// microtask after mount, even though test/setup.ts's Image mock settles
// immediately — a real `<img>` load event is asynchronous by construction
// (Promise.all(...).then(...)), so every test that asserts on real page
// content (as opposed to the loading skeleton itself) needs to flush past
// that tick first.
async function renderPage() {
  const result = render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
    </MemoryRouter>
  );
  // A single microtask tick isn't enough — Image mock -> Promise.all ->
  // .then() chains through more than one microtask hop (same reasoning as
  // PredictionsPage.test.tsx's own flushMicrotasks helper).
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
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
    mockUseKnockoutPrediction.mockReturnValue({ prediction: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false, error: false });
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    mockUseResults.mockReturnValue({ results: {}, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    mockUseDevMatches.mockReturnValue({ outcomes: {}, loading: false, refetch: () => {} });
    mockUpdateProfilePhoto.mockReset();
    mockSavePrediction.mockReset();
    mockSaveKnockoutPrediction.mockReset();
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

  it("shows the profile's name and photo", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    await renderPage();
    expect(screen.getByText("Mert G")).toBeInTheDocument();
  });

  it("hides the rank/points header section before the tournament starts", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    expect(screen.queryByText("Sıra")).not.toBeInTheDocument();
    expect(screen.queryByText("Puan")).not.toBeInTheDocument();
  });

  it("shows the rank/points header section once the tournament has started", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    await renderPage();
    expect(screen.getByText("Sıra")).toBeInTheDocument();
    expect(screen.getByText("Puan")).toBeInTheDocument();
  });

  it("uploads a new photo when a file is selected", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUpdateProfilePhoto.mockResolvedValue({ ...PROFILE, photoURL: "new-photo-url" });
    await renderPage();

    const file = new File(["data"], "new.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(mockUpdateProfilePhoto).toHaveBeenCalledWith("uid1", PROFILE, file)
    );
  });

  it("shows survey answers when a response exists", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseSurveyResponse.mockReturnValue({ response: SURVEY, loading: false, error: false });
    await renderPage();
    expect(screen.getByText("Fenerbahçe.")).toBeInTheDocument();
    expect(screen.getByText("Messi.")).toBeInTheDocument();
  });

  // surveyResponses.uclTeam holds the id the crest picker produced. The page
  // printed it raw, so a Bayern supporter's own profile read "bayern-munich",
  // under a question that still said "(varsa yazın)" — copy for a free-text
  // box that had already been replaced by the picker.
  it("shows the UCL team as a real name rather than the stored id", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseSurveyResponse.mockReturnValue({
      response: { ...SURVEY, uclTeam: "bayern-munich" },
      loading: false,
      error: false,
    });
    await renderPage();
    expect(screen.getByText("Bayern Munich.")).toBeInTheDocument();
    expect(screen.queryByText("bayern-munich.")).not.toBeInTheDocument();
    expect(screen.getByText("Tuttuğunuz bir UCL takımı var mı?")).toBeInTheDocument();
    expect(screen.queryByText(/varsa yazın/)).not.toBeInTheDocument();
  });

  it("shows 'Yok' when no UCL team was picked", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseSurveyResponse.mockReturnValue({ response: SURVEY, loading: false, error: false });
    await renderPage();
    expect(screen.getByText("Yok.")).toBeInTheDocument();
  });

  it("shows a not-filled-in message when there's no survey response", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    await renderPage();
    expect(screen.getByText("Anketi henüz doldurmadınız.")).toBeInTheDocument();
  });

  it("shows an error message when the survey read fails", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false, error: true });
    await renderPage();
    expect(screen.getByText("Anket cevapları görüntülenemiyor.")).toBeInTheDocument();
  });

  it("points to /predictions when there's no prediction yet", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    await renderPage();
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
    await renderPage();

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

  it("backing out of the overwrite confirmation with Geri leaves the original prediction unchanged", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    await renderPage();

    fireEvent.click(screen.getByText("Düzenle"));
    fireEvent.click(screen.getByText("submit-ranking"));
    fireEvent.click(screen.getByText("Geri"));

    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(mockSavePrediction).not.toHaveBeenCalled();
  });

  it("shows the ranking without an edit button once locked", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    await renderPage();
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.queryByText("Düzenle")).not.toBeInTheDocument();
  });

  it("opens that team's popup when a ranked row is clicked", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    await renderPage();
    fireEvent.click(screen.getByText("Arsenal"));
    expect(await screen.findByText(/takım dosyası/)).toBeInTheDocument();
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

    // Dialog count alone can't tell TeamPopup and MatchupPopup apart (both
    // would leave exactly one dialog open — TeamPopup's own if the wiring
    // were broken and the click were a no-op, MatchupPopup's if it worked).
    // Assert on MatchupPopup's own matchday header text instead, which only
    // it renders, to prove it's specifically the popup that opened.
    expect(await screen.findByText(`${fixture.matchday}. HAFTA`)).toBeInTheDocument();
  });

  it("shows the average position everyone predicted for each team, once the tournament has started", async () => {
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
    await renderPage();
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

  it("opens a confirm dialog when the delete-profile button is clicked", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    await renderPage();
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
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Profili sil" }));
    fireEvent.click(screen.getByText("Evet, sil"));

    await waitFor(() => expect(mockDeleteProfile).toHaveBeenCalledWith("uid1", "photo-url"));
    expect(mockDeletePrediction).toHaveBeenCalledWith("uid1");
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("home-page")).toBeInTheDocument());
  });

  /**
   * Leaving the survey behind was not untidiness, it was a permanent
   * lockout: ProfileGate routes anyone missing a profile *or* a survey into
   * SignupFlow, and SignupFlow's final write is a setDoc that Firestore
   * treats as an update when the document already exists — which the rules
   * rejected. Deleting your account therefore meant you could never sign up
   * again. The knockout prediction was simply orphaned.
   */
  it("also deletes the survey response and knockout prediction, so signing up again works", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockDeleteProfile.mockResolvedValue(undefined);
    mockDeletePrediction.mockResolvedValue(undefined);
    mockDeleteSurveyResponse.mockResolvedValue(undefined);
    mockDeleteKnockoutPrediction.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Profili sil" }));
    fireEvent.click(screen.getByText("Evet, sil"));

    await waitFor(() => expect(mockDeleteSurveyResponse).toHaveBeenCalledWith("uid1"));
    expect(mockDeleteKnockoutPrediction).toHaveBeenCalledWith("uid1");
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });

  it("does not sign out if any part of the deletion fails", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockDeleteProfile.mockResolvedValue(undefined);
    mockDeletePrediction.mockResolvedValue(undefined);
    mockDeleteKnockoutPrediction.mockResolvedValue(undefined);
    mockDeleteSurveyResponse.mockRejectedValue(new Error("permission-denied"));
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Profili sil" }));
    fireEvent.click(screen.getByText("Evet, sil"));

    expect(
      await screen.findByText("Profil silinemedi, tekrar deneyin.")
    ).toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("shows an error and keeps the dialog open when deletion fails", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockDeleteProfile.mockRejectedValue(new Error("permission-denied"));
    await renderPage();

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

  it("renders prediction tabs and inline knockout bracket in preknockout phase", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_preknockout");
    mockUseKnockoutPrediction.mockReturnValue({
      prediction: {
        quarterFinalists: ["real-madrid", "bayern-munchen"],
        semiFinalists: ["real-madrid"],
        finalists: ["real-madrid"],
        champion: "real-madrid",
        submittedAt: 100,
        updatedAt: 100,
      },
      loading: false,
    });

    await renderPage();

    // Tab buttons rendered
    expect(screen.getByRole("button", { name: "Lig Tahmini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eleme Tahmini" })).toBeInTheDocument();

    // Click "Düzenle" button to enter edit mode
    const editBtn = screen.getByRole("button", { name: "Düzenle" });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    // In preknockout phase, interactive save button is present inside inline bracket after clicking edit
    expect(screen.getByRole("button", { name: "Tahmini Kaydet" })).toBeInTheDocument();

    // Bracket team pills rendered
    expect(screen.getAllByText("RMA").length).toBeGreaterThan(0);
  });

  it("renders read-only inline bracket during knockout phase (view-only locked mode)", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_knockout");
    mockUseKnockoutPrediction.mockReturnValue({
      prediction: {
        quarterFinalists: ["real-madrid"],
        semiFinalists: ["real-madrid"],
        finalists: ["real-madrid"],
        champion: "real-madrid",
        submittedAt: 100,
        updatedAt: 100,
      },
      loading: false,
    });

    await renderPage();

    // Bracket is rendered in read-only mode so save button is NOT present
    expect(screen.queryByRole("button", { name: "Tahmini Kaydet" })).not.toBeInTheDocument();
    expect(screen.getAllByText("RMA").length).toBeGreaterThan(0);
  });
});
