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
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    render(<ForumPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("shows the blocked message for a logged-out visitor even once the tournament's started", () => {
    // Forum is logged-in-only in every phase now (pagemap round 1, Q3) —
    // previously ST_NLI was allowed; that combination is blocked today.
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    render(<ForumPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders Forum with the current uid when logged in", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    render(<ForumPage />);
    expect(screen.getByText("forum:uid1")).toBeInTheDocument();
  });
});
