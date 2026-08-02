import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
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
const mockUseTournamentPhase = vi.fn();
const mockUseBracketState = vi.fn();
const mockUseBracketPrediction = vi.fn();
const mockUseRankSnapshots = vi.fn();

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
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));
vi.mock("../bracket/useBracketState", () => ({
  useBracketState: () => mockUseBracketState(),
}));
vi.mock("../bracket/useBracketPrediction", () => ({
  useBracketPrediction: (uid: string | null) => mockUseBracketPrediction(uid),
}));
vi.mock("../leaderboard/useRankSnapshots", () => ({
  useRankSnapshots: () => mockUseRankSnapshots(),
}));
vi.mock("./StartedHomeLoggedIn", () => ({
  StartedHomeLoggedIn: () => <div>started-home-loggedin</div>,
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
    mockUseTournamentPhase.mockReturnValue({ phase: "notstarted", loading: false });
    mockUseBracketState.mockReturnValue({ bracketState: { ro16Teams: {}, winners: {} }, loading: false });
    mockUseBracketPrediction.mockReturnValue({ prediction: null, loading: false });
    mockUseRankSnapshots.mockReturnValue({ snapshots: [], loading: false });
  });

  function renderLoggedInHome() {
    return render(<LoggedInHome players={players} results={{}} entries={[]} />);
  }

  it("renders nothing while there's no signed-in user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = renderLoggedInHome();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing if the profile hasn't loaded yet (shouldn't normally happen post-ProfileGate)", () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    const { container } = renderLoggedInHome();
    expect(container).toBeEmptyDOMElement();
  });

  it("combines the auth uid with the fetched profile into `me` and renders the view", () => {
    renderLoggedInHome();
    expect(screen.getByText("home-landing-loggedin:uid1:1:0:false:true:4:0")).toBeInTheDocument();
  });

  it("sends a presence heartbeat for the signed-in uid", () => {
    renderLoggedInHome();
    expect(mockUsePresenceHeartbeat).toHaveBeenCalledWith("uid1");
  });

  it("excludes the current user from their own typing-users list", () => {
    renderLoggedInHome();
    expect(mockUseTypingUsers).toHaveBeenCalledWith("uid1");
  });

  it("wires the loadOlder callback from useMessages through to the view", () => {
    renderLoggedInHome();
    fireEvent.click(screen.getByText("load-older"));
    expect(mockLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("calls setPostLiked with true when liking a post nobody's uid has liked yet", async () => {
    mockSetPostLiked.mockResolvedValue(undefined);
    renderLoggedInHome();

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", true));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error when the like write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSetPostLiked.mockRejectedValue(new Error("permission-denied"));
    renderLoggedInHome();

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi, tekrar deneyin."));
    consoleErrorSpy.mockRestore();
  });

  it("calls setPostLiked with false when the post is already liked by this uid, per the live posts data", async () => {
    mockUsePosts.mockReturnValue({ posts: [makePost({ id: "p1", likedByUids: ["uid1"] })], loading: false });
    mockSetPostLiked.mockResolvedValue(undefined);
    renderLoggedInHome();

    expect(screen.getByText("home-landing-loggedin:uid1:1:1:false:true:4:0")).toBeInTheDocument();
    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", false));
  });

  it("passes the user's lobbies through to HomeLandingLoggedIn", () => {
    mockUseMyLobbies.mockReturnValue({
      lobbies: [{ id: "lobby1", name: "Fener Grubu", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 }],
      loading: false,
    });
    renderLoggedInHome();
    expect(screen.getByText("my-lobbies:Fener Grubu")).toBeInTheDocument();
  });

  // LobbyManagementPanel's own onDeleted/onLeft callbacks only fire on the
  // server ack, and never at all when someone ELSE deletes the lobby or
  // removes you — so the id has to be dropped the moment the lobby leaves
  // myLobbies, or HomeLandingLoggedIn renders a panel for a lobby that's gone.
  it("clears the managed lobby id once that lobby disappears from myLobbies", async () => {
    const lobby = { id: "lobby1", name: "Fener Grubu", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 };
    mockUseMyLobbies.mockReturnValue({ lobbies: [lobby], loading: false });
    const { rerender } = renderLoggedInHome();

    fireEvent.click(screen.getByText("open-management"));
    expect(screen.getByText("managing-lobby:lobby1")).toBeInTheDocument();

    mockUseMyLobbies.mockReturnValue({ lobbies: [], loading: false });
    rerender(<LoggedInHome players={players} results={{}} entries={[]} />);

    await waitFor(() => expect(screen.getByText("managing-lobby:none")).toBeInTheDocument());
  });

  it("leaves the managed lobby id alone while that lobby is still present", () => {
    mockUseMyLobbies.mockReturnValue({
      lobbies: [{ id: "lobby1", name: "Fener Grubu", createdByUid: "uid1", createdAt: 1, myJoinedAt: 100 }],
      loading: false,
    });
    renderLoggedInHome();
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
    renderLoggedInHome();
    expect(screen.getByText("sohbet-lobby:lobbyNew:katilimcilar-lobby:lobbyNew")).toBeInTheDocument();
  });

  it("renders HomeLandingLoggedIn (unchanged) when the phase is notstarted", () => {
    renderLoggedInHome();
    expect(screen.getByText(/home-landing-loggedin/)).toBeInTheDocument();
    expect(screen.queryByText("started-home-loggedin")).not.toBeInTheDocument();
  });

  it("renders StartedHomeLoggedIn instead, for every started phase", () => {
    mockUseTournamentPhase.mockReturnValue({ phase: "knockout", loading: false });
    renderLoggedInHome();
    expect(screen.getByText("started-home-loggedin")).toBeInTheDocument();
    expect(screen.queryByText(/home-landing-loggedin/)).not.toBeInTheDocument();
  });
});
