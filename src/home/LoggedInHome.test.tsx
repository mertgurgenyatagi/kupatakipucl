import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { LoggedInHome } from "./LoggedInHome";
import { Player } from "../profile/usePlayers";
import { PostWithId } from "../forum/postTypes";

function makePost(overrides: Partial<PostWithId> = {}): PostWithId {
  return {
    id: "p1",
    uid: "uid1",
    text: "Merhaba",
    imageURL: null,
    parentId: null,
    createdAt: 1,
    editedAt: null,
    mentionedUids: [],
    quotedPostId: null,
    quotedAuthorUid: null,
    quotedText: null,
    likedByUids: [],
    ...overrides,
  };
}

const mockUseAuth = vi.fn();
const mockUseProfile = vi.fn();
const mockUsePredictionSubmitters = vi.fn();
const mockUseMessages = vi.fn();
const mockUsePresenceHeartbeat = vi.fn();
const mockUseOnlineCount = vi.fn();
const mockUseTypingUsers = vi.fn();
const mockUsePosts = vi.fn();
const mockSetPostLiked = vi.fn();
const mockUseMyLobbies = vi.fn();
const mockUseLobbyMembers = vi.fn();
const mockUseLobbyMessages = vi.fn();
const mockCreateLobby = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("../profile/useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));
vi.mock("../predictions/usePredictionSubmitters", () => ({
  usePredictionSubmitters: () => mockUsePredictionSubmitters(),
}));
vi.mock("../chat/useMessages", () => ({
  useMessages: () => mockUseMessages(),
}));
vi.mock("../chat/usePresence", () => ({
  usePresenceHeartbeat: (uid: string | null) => mockUsePresenceHeartbeat(uid),
  useOnlineCount: () => mockUseOnlineCount(),
}));
vi.mock("../chat/useTypingStatus", () => ({
  useTypingUsers: (excludeUid: string) => mockUseTypingUsers(excludeUid),
}));
vi.mock("../forum/usePosts", () => ({
  usePosts: () => mockUsePosts(),
}));
vi.mock("../forum/postLikes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../forum/postLikes")>();
  return {
    ...actual,
    setPostLiked: (...args: unknown[]) => mockSetPostLiked(...args),
  };
});
vi.mock("../lobbies/useMyLobbies", () => ({
  useMyLobbies: (uid: string | null) => mockUseMyLobbies(uid),
}));
vi.mock("../lobbies/useLobbyMembers", () => ({
  useLobbyMembers: (lobbyId: string | null) => mockUseLobbyMembers(lobbyId),
}));
vi.mock("../lobbies/useLobbyMessages", () => ({
  useLobbyMessages: (lobbyId: string | null) => mockUseLobbyMessages(lobbyId),
}));
vi.mock("../lobbies/createLobby", () => ({
  createLobby: (...args: unknown[]) => mockCreateLobby(...args),
}));

vi.mock("./HomeLandingLoggedIn", () => ({
  HomeLandingLoggedIn: ({
    me,
    submitterUids,
    onLoadOlderMessages,
    loadingOlderMessages,
    hasMoreOlderMessages,
    onlineCount,
    typingUids,
    likesByPost,
    onToggleLike,
    likeError,
    myLobbies,
    sohbetLobbyId,
    katilimcilarLobbyId,
    managingLobbyId,
    onOpenLobbyManagement,
  }: {
    me: Player;
    submitterUids: Set<string>;
    onLoadOlderMessages: () => void;
    loadingOlderMessages: boolean;
    hasMoreOlderMessages: boolean;
    onlineCount: number;
    typingUids: string[];
    likesByPost: Map<string, Set<string>>;
    onToggleLike: (postId: string) => void;
    likeError: string | null;
    myLobbies: { id: string; name: string }[];
    sohbetLobbyId: string | null;
    katilimcilarLobbyId: string | null;
    managingLobbyId: string | null;
    onOpenLobbyManagement: (id: string) => void;
  }) => (
    <div>
      <p>
        home-landing-loggedin:{me.uid}:{submitterUids.size}:{likesByPost.get("p1")?.size ?? 0}:
        {String(loadingOlderMessages)}:{String(hasMoreOlderMessages)}:{onlineCount}:{typingUids.length}
      </p>
      {likeError && <p role="alert">{likeError}</p>}
      <button onClick={() => onToggleLike("p1")}>toggle-like</button>
      <button onClick={onLoadOlderMessages}>load-older</button>
      <p>my-lobbies:{myLobbies.map((l) => l.name).join(",")}</p>
      <p>
        sohbet-lobby:{sohbetLobbyId ?? "none"}:katilimcilar-lobby:{katilimcilarLobbyId ?? "none"}
      </p>
      <p>managing-lobby:{managingLobbyId ?? "none"}</p>
      <button onClick={() => onOpenLobbyManagement("lobby1")}>open-management</button>
    </div>
  ),
}));

vi.mock("./mobile/MobileHomeNotStartedLoggedIn", () => ({
  MobileHomeNotStartedLoggedIn: ({
    canCreateLobby,
    onOpenCreateDialog,
    onOpenLobbyManagement,
  }: {
    canCreateLobby: boolean;
    onOpenCreateDialog: () => void;
    onOpenLobbyManagement: (id: string) => void;
  }) => (
    <div>
      <p>mobile-home:{String(canCreateLobby)}</p>
      <button onClick={onOpenCreateDialog}>mobile-create</button>
      <button onClick={() => onOpenLobbyManagement("lobby1")}>mobile-manage</button>
    </div>
  ),
}));

const players: Player[] = [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 }];

describe("LoggedInHome", () => {
  const mockLoadOlder = vi.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
      loading: false,
    });
    mockUsePredictionSubmitters.mockReturnValue({ submitterUids: new Set(["uid1"]), loading: false });
    mockUseMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadOlder: mockLoadOlder,
      loadingOlder: false,
      hasMoreOlder: true,
    });
    mockUsePresenceHeartbeat.mockReset();
    mockUseOnlineCount.mockReturnValue(4);
    mockUseTypingUsers.mockReturnValue([]);
    mockUsePosts.mockReturnValue({ posts: [], loading: false });
    mockSetPostLiked.mockReset();
    mockUseMyLobbies.mockReturnValue({ lobbies: [], loading: false });
    mockUseLobbyMembers.mockReturnValue({ members: [], loading: false });
    mockUseLobbyMessages.mockReturnValue({
      messages: [],
      loading: false,
      loadOlder: vi.fn(),
      loadingOlder: false,
      hasMoreOlder: false,
    });
    mockCreateLobby.mockReset();
  });

  it("renders nothing while there's no signed-in user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<LoggedInHome players={players} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing if the profile hasn't loaded yet (shouldn't normally happen post-ProfileGate)", () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    const { container } = render(<LoggedInHome players={players} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("combines the auth uid with the fetched profile into `me` and renders the view", () => {
    render(<LoggedInHome players={players} />);
    expect(screen.getByText("home-landing-loggedin:uid1:1:0:false:true:4:0")).toBeInTheDocument();
  });

  it("sends a presence heartbeat for the signed-in uid", () => {
    render(<LoggedInHome players={players} />);
    expect(mockUsePresenceHeartbeat).toHaveBeenCalledWith("uid1");
  });

  it("excludes the current user from their own typing-users list", () => {
    render(<LoggedInHome players={players} />);
    expect(mockUseTypingUsers).toHaveBeenCalledWith("uid1");
  });

  it("wires the loadOlder callback from useMessages through to the view", () => {
    render(<LoggedInHome players={players} />);
    fireEvent.click(screen.getByText("load-older"));
    expect(mockLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("calls setPostLiked with true when liking a post nobody's uid has liked yet", async () => {
    mockSetPostLiked.mockResolvedValue(undefined);
    render(<LoggedInHome players={players} />);

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", true));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error when the like write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSetPostLiked.mockRejectedValue(new Error("permission-denied"));
    render(<LoggedInHome players={players} />);

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi, tekrar deneyin."));
    consoleErrorSpy.mockRestore();
  });

  it("calls setPostLiked with false when the post is already liked by this uid, per the live posts data", async () => {
    mockUsePosts.mockReturnValue({ posts: [makePost({ id: "p1", likedByUids: ["uid1"] })], loading: false });
    mockSetPostLiked.mockResolvedValue(undefined);
    render(<LoggedInHome players={players} />);

    expect(screen.getByText("home-landing-loggedin:uid1:1:1:false:true:4:0")).toBeInTheDocument();
    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", false));
  });

  it("passes the user's lobbies through to HomeLandingLoggedIn", () => {
    mockUseMyLobbies.mockReturnValue({
      lobbies: [{ id: "lobby1", name: "Fener Grubu", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 }],
      loading: false,
    });
    render(<LoggedInHome players={players} />);
    expect(screen.getByText("my-lobbies:Fener Grubu")).toBeInTheDocument();
  });

  // LobbyManagementPanel's own onDeleted/onLeft callbacks only fire on the
  // server ack, and never at all when someone ELSE deletes the lobby or
  // removes you — so the id has to be dropped the moment the lobby leaves
  // myLobbies, or HomeLandingLoggedIn renders a panel for a lobby that's gone.
  it("clears the managed lobby id once that lobby disappears from myLobbies", async () => {
    const lobby = { id: "lobby1", name: "Fener Grubu", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 };
    mockUseMyLobbies.mockReturnValue({ lobbies: [lobby], loading: false });
    const { rerender } = render(<LoggedInHome players={players} />);

    fireEvent.click(screen.getByText("open-management"));
    expect(screen.getByText("managing-lobby:lobby1")).toBeInTheDocument();

    mockUseMyLobbies.mockReturnValue({ lobbies: [], loading: false });
    rerender(<LoggedInHome players={players} />);

    await waitFor(() => expect(screen.getByText("managing-lobby:none")).toBeInTheDocument());
  });

  it("leaves the managed lobby id alone while that lobby is still present", () => {
    mockUseMyLobbies.mockReturnValue({
      lobbies: [{ id: "lobby1", name: "Fener Grubu", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 }],
      loading: false,
    });
    render(<LoggedInHome players={players} />);
    fireEvent.click(screen.getByText("open-management"));
    expect(screen.getByText("managing-lobby:lobby1")).toBeInTheDocument();
  });

  it("defaults each cell's switcher to the most-recently-joined lobby", () => {
    mockUseMyLobbies.mockReturnValue({
      lobbies: [
        { id: "lobbyOld", name: "Eski Grup", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 },
        { id: "lobbyNew", name: "Yeni Grup", createdByUid: "uid1", createdAt: 2, myJoinedAt: 200 },
      ],
      loading: false,
    });
    render(<LoggedInHome players={players} />);
    expect(screen.getByText("sohbet-lobby:lobbyNew:katilimcilar-lobby:lobbyNew")).toBeInTheDocument();
  });
  // LoggedInHome returns early for mobile, and both lobby dialogs lived past
  // that point inside HomeLandingLoggedIn. So on a phone the create button
  // flipped state that nothing rendered and visibly did nothing, and there was
  // no way into lobby management at all (2026-08-27).
  describe("on mobile", () => {
    const realMatchMedia = window.matchMedia;

    beforeEach(() => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes("max-width: 1023px"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });

    it("renders the mobile composition rather than the desktop one", () => {
      render(<LoggedInHome players={players} />);
      expect(screen.getByText("mobile-home:true")).toBeInTheDocument();
      expect(screen.queryByText(/home-landing-loggedin/)).not.toBeInTheDocument();
    });

    it("opens the create-lobby dialog when the create button is pressed", () => {
      render(<LoggedInHome players={players} />);
      expect(screen.queryByText("Yeni Özel Lobi")).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("mobile-create"));
      expect(screen.getByText("Yeni Özel Lobi")).toBeInTheDocument();
    });

    it("opens the lobby management panel when settings is pressed", () => {
      mockUseMyLobbies.mockReturnValue({
        lobbies: [{ id: "lobby1", name: "Fener", createdByUid: "uid1", createdAt: 1, memberUids: ["uid1"], myJoinedAt: 1 }],
        loading: false,
      });
      render(<LoggedInHome players={players} />);
      expect(screen.queryByText("Özel Lobi Ayarları")).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("mobile-manage"));
      expect(screen.getByText("Özel Lobi Ayarları")).toBeInTheDocument();
    });

    it("does not open the management panel for a lobby that has already vanished", () => {
      // myLobbies is live; the lobby can be deleted or you can be removed from
      // it between opening the panel and the fallback effect clearing the id.
      mockUseMyLobbies.mockReturnValue({ lobbies: [], loading: false });
      render(<LoggedInHome players={players} />);
      fireEvent.click(screen.getByText("mobile-manage"));
      expect(screen.queryByText("Özel Lobi Ayarları")).not.toBeInTheDocument();
    });
  });
});
