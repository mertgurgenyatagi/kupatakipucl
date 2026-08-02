import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { ProfileGate } from "./ProfileGate";

const mockUseAuth = vi.fn();
const mockUseProfile = vi.fn();
const mockUseSurveyResponse = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));

vi.mock("../predictions/useSurveyResponse", () => ({
  useSurveyResponse: (uid: string | null) => mockUseSurveyResponse(uid),
}));

vi.mock("../signup/SignupFlow", () => ({
  SignupFlow: ({ uid, onDone }: { uid: string; onDone: () => void }) => (
    <div>
      <span>signup-flow:{uid}</span>
      <button onClick={onDone}>finish</button>
    </div>
  ),
}));

// Defaults to "notstarted" so the file's 6 pre-existing tests (which never
// set a phase) keep exercising exactly today's behavior.
const mockUsePhase = vi.fn(() => ({ phase: "notstarted", loading: false }));

vi.mock("../tournament/useTournamentPhase", () => ({ useTournamentPhase: () => mockUsePhase() }));
vi.mock("./RegistrationClosedScreen", () => ({
  RegistrationClosedScreen: () => <div>registration-closed</div>,
}));

const noProfile = { profile: null, loading: false };
const noSurvey = { response: null, loading: false };
const hasProfile = { profile: { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 1 }, loading: false };

describe("ProfileGate", () => {
  it("renders nothing while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseProfile.mockReturnValue(noProfile);
    mockUseSurveyResponse.mockReturnValue(noSurvey);
    const { container } = render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children directly when logged out", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseProfile.mockReturnValue(noProfile);
    mockUseSurveyResponse.mockReturnValue(noSurvey);
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("renders SignupFlow when logged in with no profile yet", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(noProfile);
    mockUseSurveyResponse.mockReturnValue(noSurvey);
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("signup-flow:uid1")).toBeInTheDocument();
  });

  // A profile with no survey is an abandoned-mid-quiz attempt, not a
  // resumable one — still gated, not treated specially (see ProfileGate.tsx
  // and SignupFlow.tsx's header comments for why).
  it("still renders SignupFlow when a profile exists but the survey doesn't", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(hasProfile);
    mockUseSurveyResponse.mockReturnValue(noSurvey);
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("signup-flow:uid1")).toBeInTheDocument();
  });

  it("renders children when logged in with both a profile and a survey response", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(hasProfile);
    mockUseSurveyResponse.mockReturnValue({
      response: {
        age: 25,
        footballKnowledge: 4,
        messiOrRonaldo: "messi",
        superLigTeam: "Galatasaray",
        uclTeam: null,
        device: "both",
        submittedAt: 1,
      },
      loading: false,
    });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("does not leak a completed flow across a different user after a uid change", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(noProfile);
    mockUseSurveyResponse.mockReturnValue(noSurvey);
    const { rerender } = render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );

    fireEvent.click(screen.getByText("finish"));
    expect(screen.getByText("app-content")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { uid: "uid2" }, loading: false });
    rerender(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );

    expect(screen.getByText("signup-flow:uid2")).toBeInTheDocument();
  });
});

describe("ProfileGate registration closing", () => {
  it("shows RegistrationClosedScreen for a never-onboarded user once the phase has started", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false });
    mockUsePhase.mockReturnValue({ phase: "leaguephase", loading: false });
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.getByText("registration-closed")).toBeInTheDocument();
    expect(screen.queryByText("real-app")).not.toBeInTheDocument();
  });

  it("still shows SignupFlow for a never-onboarded user while notstarted", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false });
    mockUsePhase.mockReturnValue({ phase: "notstarted", loading: false });
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.queryByText("registration-closed")).not.toBeInTheDocument();
  });

  it("does not block a user who has a profile but abandoned mid-quiz, even once started", () => {
    // Reuses the file's existing `hasProfile` constant (already declared
    // with a full, valid Profile shape including createdAt — see the top of
    // this file) rather than a fresh inline literal.
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(hasProfile);
    mockUseSurveyResponse.mockReturnValue({ response: null, loading: false });
    mockUsePhase.mockReturnValue({ phase: "knockout", loading: false });
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.queryByText("registration-closed")).not.toBeInTheDocument();
  });

  it("does not affect a fully onboarded user once started", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue(hasProfile);
    mockUseSurveyResponse.mockReturnValue({ response: { messiOrRonaldo: "messi" }, loading: false });
    mockUsePhase.mockReturnValue({ phase: "knockout", loading: false });
    render(
      <ProfileGate>
        <div>real-app</div>
      </ProfileGate>
    );
    expect(screen.getByText("real-app")).toBeInTheDocument();
  });
});
