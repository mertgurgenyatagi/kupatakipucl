import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LogoutButton } from "./LogoutButton";

const mockSignOut = vi.fn();

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

function renderButton() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<LogoutButton />} />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LogoutButton", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
  });

  it("calls signOut when clicked", async () => {
    mockSignOut.mockResolvedValue(undefined);
    renderButton();
    fireEvent.click(screen.getByText("Çıkış yap"));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });

  it("navigates to home after signing out", async () => {
    mockSignOut.mockResolvedValue(undefined);
    renderButton();
    fireEvent.click(screen.getByText("Çıkış yap"));
    await waitFor(() => expect(screen.getByText("home-page")).toBeInTheDocument());
  });
});
