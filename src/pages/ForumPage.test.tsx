// src/pages/ForumPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ForumPage } from "./ForumPage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../forum/Forum", () => ({
  Forum: ({ uid }: { uid: string | null }) => <div>forum:{String(uid)}</div>,
}));

describe("ForumPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null });
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<ForumPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders Forum with uid=null when logged out but allowed (ST_NLI)", () => {
    mockUseVisibilityState.mockReturnValue("ST_NLI");
    render(<ForumPage />);
    expect(screen.getByText("forum:null")).toBeInTheDocument();
  });

  it("renders Forum with the current uid when logged in", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    render(<ForumPage />);
    expect(screen.getByText("forum:uid1")).toBeInTheDocument();
  });
});
