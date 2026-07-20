import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { ProfileGate } from "./ProfileGate";

const mockUseAuth = vi.fn();
const mockUseProfile = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));

vi.mock("./ProfileForm", () => ({
  ProfileForm: ({
    uid,
    onSaved,
  }: {
    uid: string;
    onSaved: (profile: { firstName: string; lastName: string; photoURL: string; createdAt: number }) => void;
  }) => (
    <div>
      <span>profile-form:{uid}</span>
      <button
        onClick={() => onSaved({ firstName: "X", lastName: "Y", photoURL: "url", createdAt: 1 })}
      >
        save
      </button>
    </div>
  ),
}));

describe("ProfileGate", () => {
  it("renders nothing while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseProfile.mockReturnValue({ profile: null, loading: true });
    const { container } = render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children directly when logged out", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("renders the profile form when logged in with no profile yet", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("profile-form:uid1")).toBeInTheDocument();
  });

  it("renders children when logged in and a profile already exists", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 1 },
      loading: false,
    });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("does not leak a saved profile across a different user after a uid change", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    const { rerender } = render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );

    fireEvent.click(screen.getByText("save"));
    expect(screen.getByText("app-content")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { uid: "uid2" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    rerender(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );

    expect(screen.getByText("profile-form:uid2")).toBeInTheDocument();
  });
});
