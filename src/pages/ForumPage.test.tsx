// src/pages/ForumPage.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ForumPage } from "./ForumPage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUsePosts = vi.fn();
const mockUsePlayers = vi.fn();
const mockSetPostLiked = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();
const mockDeletePost = vi.fn();
const mockEditPost = vi.fn();
const mockRefetch = vi.fn();

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../state/useVisibilityState", () => ({ useVisibilityState: () => mockUseVisibilityState() }));
vi.mock("../tournament/useTournamentPhase", () => ({ useTournamentPhase: () => mockUseTournamentPhase() }));
vi.mock("../forum/usePosts", () => ({ usePosts: () => mockUsePosts() }));
vi.mock("../profile/usePlayers", () => ({ usePlayers: () => mockUsePlayers() }));
vi.mock("../forum/postLikes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../forum/postLikes")>();
  return {
    ...actual,
    setPostLiked: (...args: unknown[]) => mockSetPostLiked(...args),
  };
});
vi.mock("../leaderboard/useLeaderboard", () => ({ useLeaderboard: () => mockUseLeaderboard() }));
vi.mock("../leaderboard/useResults", () => ({ useResults: () => mockUseResults() }));
vi.mock("../forum/deletePost", () => ({ deletePost: (...args: unknown[]) => mockDeletePost(...args) }));
vi.mock("../forum/editPost", () => ({ editPost: (...args: unknown[]) => mockEditPost(...args) }));

vi.mock("../forum/Forum", () => ({
  Forum: ({
    uid,
    posts,
    players,
    onToggleLike,
    onSelectParticipant,
    onDeletePost,
    onSaveEdit,
    actionError,
  }: {
    uid: string | null;
    posts: { id: string }[];
    players: { uid: string }[];
    onToggleLike: (id: string) => void;
    onSelectParticipant: (uid: string) => void;
    onDeletePost: (id: string) => void;
    onSaveEdit: (id: string, text: string) => void;
    actionError: string | null;
  }) => (
    <div>
      <p>forum:{String(uid)}:{posts.length}:{players.length}</p>
      {actionError && <p role="alert">{actionError}</p>}
      <button onClick={() => onToggleLike("p1")}>toggle-like</button>
      <button onClick={() => onSelectParticipant("uid2")}>select-participant</button>
      <button onClick={() => onDeletePost("root1")}>delete-post</button>
      <button onClick={() => onSaveEdit("root1", "yeni metin")}>save-edit</button>
    </div>
  ),
}));

vi.mock("../leaderboard/ParticipantPopup", () => ({
  ParticipantPopup: ({
    ranked,
    tournamentStarted,
    onOpenChange,
  }: {
    ranked: { entry: { uid: string } } | null;
    tournamentStarted: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <p>participant-popup:{ranked?.entry.uid ?? "none"}:{String(tournamentStarted)}</p>
      <button onClick={() => onOpenChange(false)}>close-popup</button>
    </div>
  ),
}));

const POST1 = {
  id: "root1",
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
};
const REPLY1 = { ...POST1, id: "reply1", parentId: "root1" };
const PLAYER1 = { uid: "uid1", firstName: "Mert", lastName: "G", photoURL: "", createdAt: 1 };
const PLAYER2 = { uid: "uid2", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 };
const ENTRY2 = { uid: "uid2", firstName: "Ada", lastName: "Lovelace", photoURL: "", points: 5, ranking: [] };

describe("ForumPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockUseTournamentPhase.mockReturnValue({ phase: "notstarted", loading: false });
    mockUsePosts.mockReturnValue({
      posts: [POST1, REPLY1],
      loading: false,
      refetch: mockRefetch,
      loadOlder: vi.fn().mockResolvedValue(undefined),
      hasMore: false,
    });
    mockUsePlayers.mockReturnValue({ players: [PLAYER1, PLAYER2], loading: false });
    mockUseLeaderboard.mockReturnValue({ entries: [ENTRY2], loading: false });
    mockUseResults.mockReturnValue({ results: {} });
    mockSetPostLiked.mockReset().mockResolvedValue(undefined);
    mockDeletePost.mockReset().mockResolvedValue(undefined);
    mockEditPost.mockReset().mockResolvedValue(undefined);
    mockRefetch.mockReset();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    render(<ForumPage />);
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("shows the blocked message for a logged-out visitor even once the tournament's started", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    render(<ForumPage />);
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("shows a loading skeleton while posts, players, or likes are loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePosts.mockReturnValue({
      posts: [],
      loading: true,
      refetch: mockRefetch,
      loadOlder: vi.fn().mockResolvedValue(undefined),
      hasMore: false,
    });
    render(<ForumPage />);
    expect(screen.getByTestId("forum-skeleton")).toBeInTheDocument();
  });

  it("renders Forum with the fetched posts, players, and current uid", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    render(<ForumPage />);
    expect(screen.getByText("forum:uid1:2:2")).toBeInTheDocument();
  });

  it("toggles a like optimistically and calls setPostLiked", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    render(<ForumPage />);
    fireEvent.click(screen.getByText("toggle-like"));
    await waitFor(() => expect(mockSetPostLiked).toHaveBeenCalledWith("p1", "uid1", true));
  });

  it("deletes a post with its reply ids and refetches on success", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    render(<ForumPage />);
    fireEvent.click(screen.getByText("delete-post"));
    await waitFor(() => expect(mockDeletePost).toHaveBeenCalledWith("root1", ["reply1"], [null, null]));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it("shows an action error when delete fails, without refetching", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockDeletePost.mockRejectedValue(new Error("permission-denied"));
    render(<ForumPage />);
    fireEvent.click(screen.getByText("delete-post"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Gönderi silinemedi, tekrar deneyin.");
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("saves an edit and refetches on success", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    render(<ForumPage />);
    fireEvent.click(screen.getByText("save-edit"));
    await waitFor(() => expect(mockEditPost).toHaveBeenCalledWith("root1", "yeni metin", []));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it("opens the participant popup with the right rank/tournamentStarted, and closes it", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseTournamentPhase.mockReturnValue({ phase: "notstarted", loading: false });
    render(<ForumPage />);
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:uid2:false")).toBeInTheDocument();
    fireEvent.click(screen.getByText("close-popup"));
    expect(screen.getByText("participant-popup:none:false")).toBeInTheDocument();
  });

  it("passes tournamentStarted=true to the participant popup once the tournament has started", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUseTournamentPhase.mockReturnValue({ phase: "leaguephase", loading: false });
    render(<ForumPage />);
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:uid2:true")).toBeInTheDocument();
  });
});
