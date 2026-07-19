import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LogoutButton } from "./LogoutButton";

const mockSignOut = vi.fn();

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

describe("LogoutButton", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
  });

  it("calls signOut when clicked", async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<LogoutButton />);
    fireEvent.click(screen.getByText("Sign out"));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
