import { render, screen } from "@testing-library/react";
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
  ProfileForm: ({ uid }: { uid: string }) => <div>profile-form:{uid}</div>,
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
});
