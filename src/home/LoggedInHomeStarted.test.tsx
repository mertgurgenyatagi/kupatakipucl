import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoggedInHomeStarted } from "./LoggedInHomeStarted";
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
const mockUseMessages = vi.fn();
const mockUsePresenceHeartbeat = vi.fn();
const mockUseOnlineCount = vi.fn();
const mockUseTypingUsers = vi.fn();
const mockUsePosts = vi.fn();
const mockSetPostLiked = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("../profile/useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
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

vi.mock("./HomeLandingLoggedInStarted", () => ({
  HomeLandingLoggedInStarted: ({
    me,
    likesByPost,
    loadingOlderMessages,
    hasMoreOlderMessages,
    onlineCount,
    typingUids,
    onLoadOlderMessages,
    onToggleLike,
    likeError,
  }: {
    me: Player;
    likesByPost: Map<string, Set<string>>;
    loadingOlderMessages: boolean;
    hasMoreOlderMessages: boolean;
    onlineCount: number;
    typingUids: string[];
    onLoadOlderMessages: () => void;
    onToggleLike: (postId: string) => void;
    likeError: string | null;
  }) => (
    <div>
      <p>
        home-landing-loggedin-started:{me.uid}:{likesByPost.get("p1")?.size ?? 0}:
        {String(loadingOlderMessages)}:{String(hasMoreOlderMessages)}:{onlineCount}:{typingUids.length}
      </p>
      {likeError && <p role="alert">{likeError}</p>}
      <button onClick={() => onToggleLike("p1")}>toggle-like</button>
      <button onClick={onLoadOlderMessages}>load-older</button>
    </div>
  ),
}));

const players: Player[] = [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 }];

describe("LoggedInHomeStarted", () => {
  const mockLoadOlder = vi.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
      loading: false,
    });
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
    mockUsePosts.mockReturnValue({ posts: [], loading: false, refetch: vi.fn() });
    mockSetPostLiked.mockReset();
  });

  it("renders nothing while there's no signed-in user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing if the profile hasn't loaded yet (shouldn't normally happen post-ProfileGate)", () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    const { container } = render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("combines the auth uid with the fetched profile into `me` and renders the view", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(screen.getByText("home-landing-loggedin-started:uid1:0:false:true:4:0")).toBeInTheDocument();
  });

  it("sends a presence heartbeat for the signed-in uid", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(mockUsePresenceHeartbeat).toHaveBeenCalledWith("uid1");
  });

  it("excludes the current user from their own typing-users list", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    expect(mockUseTypingUsers).toHaveBeenCalledWith("uid1");
  });

  it("wires the loadOlder callback from useMessages through to the view", () => {
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);
    fireEvent.click(screen.getByText("load-older"));
    expect(mockLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("calls setPostLiked with true when liking a post nobody's uid has liked yet", async () => {
    mockSetPostLiked.mockResolvedValue(undefined);
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", true));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error when the like write fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSetPostLiked.mockRejectedValue(new Error("permission-denied"));
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);

    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi, tekrar deneyin."));
    consoleErrorSpy.mockRestore();
  });

  it("calls setPostLiked with false when the post is already liked by this uid, per the live posts data", async () => {
    mockUsePosts.mockReturnValue({ posts: [makePost({ id: "p1", likedByUids: ["uid1"] })], loading: false, refetch: vi.fn() });
    mockSetPostLiked.mockResolvedValue(undefined);
    render(<LoggedInHomeStarted players={players} results={{}} entries={[]} />);

    expect(screen.getByText("home-landing-loggedin-started:uid1:1:false:true:4:0")).toBeInTheDocument();
    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", false));
  });
});
