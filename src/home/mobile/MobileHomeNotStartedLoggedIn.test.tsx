import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileHomeNotStartedLoggedIn } from "./MobileHomeNotStartedLoggedIn";
import type { Player } from "../../profile/usePlayers";

// The frames' contents are irrelevant here — this file is about the one
// control slot in the participants header.
vi.mock("./MobileWelcomeBanner", () => ({ MobileWelcomeBanner: () => <div /> }));
vi.mock("../ParticipantStatusList", () => ({
  ParticipantStatusList: ({ players }: { players: Player[] }) => <p>players:{players.length}</p>,
}));
vi.mock("../../forum/RecentPostsPreview", () => ({ RecentPostsPreview: () => <div /> }));

const ME: Player = { uid: "me", firstName: "Mert", lastName: "G", photoURL: "p", createdAt: 1 };
const LOBBIES = [{ id: "lobby1", name: "Fener", createdByUid: "me", createdAt: 1, memberUids: ["me"], myJoinedAt: 1 }];

function renderHome(overrides: Record<string, unknown> = {}) {
  const props = {
    me: ME,
    players: [ME],
    submitterUids: new Set<string>(),
    posts: [],
    likesByPost: new Map<string, Set<string>>(),
    onToggleLike: vi.fn(),
    onDeletePost: vi.fn(),
    onSaveEdit: vi.fn(),
    onRefetchPosts: vi.fn(),
    onSelectParticipant: vi.fn(),
    myLobbies: LOBBIES,
    lobbyId: null as string | null,
    onChangeLobby: vi.fn(),
    lobbyMemberUids: null,
    canCreateLobby: true,
    onOpenCreateDialog: vi.fn(),
    onOpenLobbyManagement: vi.fn(),
    ...overrides,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(<MobileHomeNotStartedLoggedIn {...(props as any)} />);
  return props;
}

describe("MobileHomeNotStartedLoggedIn lobby controls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers creating a lobby while the scope is Genel", () => {
    const props = renderHome({ lobbyId: null });
    fireEvent.click(screen.getByLabelText("Özel lobi oluştur"));
    expect(props.onOpenCreateDialog).toHaveBeenCalled();
    expect(screen.queryByLabelText("Özel lobi ayarları")).not.toBeInTheDocument();
  });

  // Mobile had no entry point into lobby management at all: a phone user could
  // join a lobby and then never invite anyone, rename it, remove anyone, leave
  // it or delete it (2026-08-27).
  it("offers lobby settings once a lobby is the current scope", () => {
    const props = renderHome({ lobbyId: "lobby1" });
    fireEvent.click(screen.getByLabelText("Özel lobi ayarları"));
    expect(props.onOpenLobbyManagement).toHaveBeenCalledWith("lobby1");
    expect(screen.queryByLabelText("Özel lobi oluştur")).not.toBeInTheDocument();
  });

  it("shows neither control when the caps are reached and the scope is Genel", () => {
    renderHome({ lobbyId: null, canCreateLobby: false });
    expect(screen.queryByLabelText("Özel lobi oluştur")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Özel lobi ayarları")).not.toBeInTheDocument();
  });

  // The settings gear is about the lobby you're looking at, not about whether
  // you may create another one.
  it("still offers lobby settings when the caps are reached", () => {
    renderHome({ lobbyId: "lobby1", canCreateLobby: false });
    expect(screen.getByLabelText("Özel lobi ayarları")).toBeInTheDocument();
  });
});
