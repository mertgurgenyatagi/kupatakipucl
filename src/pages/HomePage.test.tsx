import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

describe("HomePage", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("shows the not-started/logged-out placeholder", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-01-01");
    render(<HomePage />);
    expect(screen.getByText(/Not started, not logged in/)).toBeInTheDocument();
  });

  it("shows the not-started/logged-in placeholder", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-01-01");
    render(<HomePage />);
    expect(screen.getByText(/Not started, logged in/)).toBeInTheDocument();
  });

  it("shows the started/logged-out placeholder", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-09-09");
    render(<HomePage />);
    expect(screen.getByText(/Started, not logged in/)).toBeInTheDocument();
  });

  it("shows the started/logged-in placeholder", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-09-09");
    render(<HomePage />);
    expect(screen.getByText(/Started, logged in/)).toBeInTheDocument();
  });
});
