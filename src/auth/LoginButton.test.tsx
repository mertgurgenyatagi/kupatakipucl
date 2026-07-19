import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginButton } from "./LoginButton";

const mockSignIn = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

describe("LoginButton", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
  });

  it("calls signInWithPopup when clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<LoginButton />);
    fireEvent.click(screen.getByText("Sign in with Google"));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
  });

  it("shows an inline error when sign-in fails", async () => {
    mockSignIn.mockRejectedValue(new Error("popup-closed-by-user"));
    render(<LoginButton />);
    fireEvent.click(screen.getByText("Sign in with Google"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Sign-in didn't go through, try again."
      )
    );
  });
});
