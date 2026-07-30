// src/pages/JoinLobbyPage.test.tsx
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.fn();
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));

const mockUseProfile = vi.fn();
vi.mock("../profile/useProfile", () => ({ useProfile: () => mockUseProfile() }));

const mockUseMyLobbies = vi.fn();
vi.mock("../lobbies/useMyLobbies", () => ({ useMyLobbies: () => mockUseMyLobbies() }));

const mockJoinLobbyViaInvite = vi.fn();
vi.mock("../lobbies/joinLobbyViaInvite", () => ({
  joinLobbyViaInvite: (...args: unknown[]) => mockJoinLobbyViaInvite(...args),
}));

const mockShowInviteInvalidToast = vi.fn();
const mockShowLobbyCapToast = vi.fn();
vi.mock("../lobbies/lobbyToasts", () => ({
  showInviteInvalidToast: () => mockShowInviteInvalidToast(),
  showLobbyCapToast: () => mockShowLobbyCapToast(),
}));

import { JoinLobbyPage } from "./JoinLobbyPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/join/:inviteId" element={<JoinLobbyPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("JoinLobbyPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockJoinLobbyViaInvite.mockReset();
    mockShowInviteInvalidToast.mockReset();
    mockShowLobbyCapToast.mockReset();
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Ahmet", lastName: "Y", photoURL: "", createdAt: 0 },
      loading: false,
    });
    mockUseMyLobbies.mockReturnValue({ lobbies: [], loading: false });
  });

  it("redirects home without attempting a join when not signed in", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
    expect(mockJoinLobbyViaInvite).not.toHaveBeenCalled();
  });

  it("joins successfully and redirects home with no toast", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "joined", lobbyId: "lobby1" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
    expect(mockJoinLobbyViaInvite).toHaveBeenCalledWith("invite1", "uid1", "Ahmet", 0);
    expect(mockShowInviteInvalidToast).not.toHaveBeenCalled();
    expect(mockShowLobbyCapToast).not.toHaveBeenCalled();
  });

  it("shows the invalid-link toast and redirects when the invite is invalid or expired", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "invalid-or-expired" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockShowInviteInvalidToast).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows the at-cap toast and redirects when already at the lobby limit", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "at-cap" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockShowLobbyCapToast).toHaveBeenCalledTimes(1));
  });

  it("redirects silently with no toast when already a member", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "already-member", lobbyId: "lobby1" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
    expect(mockShowInviteInvalidToast).not.toHaveBeenCalled();
    expect(mockShowLobbyCapToast).not.toHaveBeenCalled();
  });
});
