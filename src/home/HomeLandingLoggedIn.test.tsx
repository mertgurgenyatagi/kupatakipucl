import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomeLandingLoggedIn } from "./HomeLandingLoggedIn";
import { Player } from "../profile/usePlayers";

const mockUseCountdown = vi.fn();
vi.mock("./useCountdown", () => ({
  useCountdown: () => mockUseCountdown(),
}));

vi.mock("../chat/ChatRoom", () => ({
  ChatRoom: ({
    uid,
    players,
    messages,
    onLoadOlder,
    loadingOlder,
    hasMoreOlder,
    typingUids,
  }: {
    uid: string;
    players: unknown[];
    messages: unknown[];
    onLoadOlder: () => void;
    loadingOlder: boolean;
    hasMoreOlder: boolean;
    typingUids: string[];
  }) => (
    <div>
      <p>
        chat-room:{uid}:{players.length}:{messages.length}:{String(loadingOlder)}:{String(hasMoreOlder)}:
        {typingUids.length}
      </p>
      <button onClick={onLoadOlder}>load-older</button>
    </div>
  ),
}));
vi.mock("./HomeHero", () => ({
  HomeHero: ({ className }: { className?: string }) => <div className={className}>home-hero</div>,
}));
vi.mock("../forum/RecentPostsPreview", () => ({
  RecentPostsPreview: ({ posts, uid, likesByPost }: { posts: unknown[]; uid: string; likesByPost: Map<string, Set<string>> }) => (
    <div>
      recent-posts:{posts.length}:{uid}:{likesByPost.size}
    </div>
  ),
  ForumPreviewFooter: () => <div>forum-preview-footer</div>,
}));
vi.mock("./ParticipantStatusList", () => ({
  ParticipantStatusList: ({
    players,
    submitterUids,
    onSelectPlayer,
  }: {
    players: unknown[];
    submitterUids: Set<string>;
    onSelectPlayer?: (uid: string) => void;
  }) => (
    <div>
      <p>
        participant-status-list:{players.length}:{submitterUids.size}
      </p>
      <button onClick={() => onSelectPlayer?.("p2")}>select-p2</button>
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
      <p>
        participant-popup:{ranked?.entry.uid ?? "none"}:{String(tournamentStarted)}
      </p>
      <button onClick={() => onOpenChange(false)}>close-popup</button>
    </div>
  ),
}));

const me: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };
const players: Player[] = [me, { uid: "p2", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 }];

function renderPage(overrides: Partial<Parameters<typeof HomeLandingLoggedIn>[0]> = {}) {
  return render(
    <MemoryRouter>
      <HomeLandingLoggedIn
        me={me}
        players={players}
        submitterUids={new Set(["p2"])}
        messages={[{ id: "m1", uid: "p2", text: "hi", createdAt: 1 }]}
        onLoadOlderMessages={vi.fn()}
        loadingOlderMessages={false}
        hasMoreOlderMessages={false}
        onlineCount={3}
        typingUids={[]}
        posts={[]}
        likesByPost={new Map()}
        onToggleLike={vi.fn()}
        likeError={null}
        onDeletePost={vi.fn()}
        onSaveEdit={vi.fn()}
        onRefetchPosts={vi.fn()}
        forumActionError={null}
        {...overrides}
      />
    </MemoryRouter>
  );
}

describe("HomeLandingLoggedIn", () => {
  beforeEach(() => {
    mockUseCountdown.mockReturnValue({ days: 4, hours: 3, minutes: 2, seconds: 1, done: false });
  });

  it("greets the signed-in user by first name, bolded", () => {
    renderPage();
    const greeting = screen.getByText((_, el) => el?.textContent === "Hoş geldin, Mert.");
    expect(greeting).toBeInTheDocument();
    expect(screen.getByText("Mert")).toHaveClass("font-bold");
  });

  it("links the primary CTA to the predictions page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /Tahminini Yap/ })).toHaveAttribute("href", "/predictions");
  });

  it("hides the CTA once the user has already submitted a prediction", () => {
    renderPage({ submitterUids: new Set(["me", "p2"]) });
    expect(screen.queryByRole("link", { name: /Tahminini Yap/ })).not.toBeInTheDocument();
  });

  it("shows the countdown digits when not yet done", () => {
    renderPage();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("hides the countdown once it's done", () => {
    mockUseCountdown.mockReturnValue({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    renderPage();
    expect(screen.queryByText("Kayıtların Kapanmasına")).not.toBeInTheDocument();
  });

  it("passes players and submitter uids through to the participant list", () => {
    renderPage();
    expect(screen.getByText("participant-status-list:2:1")).toBeInTheDocument();
  });

  it("passes posts, the current user's uid, and likes through to the forum preview", () => {
    renderPage({
      posts: [
        {
          id: "f1",
          uid: "p2",
          text: "x",
          imageURL: null,
          parentId: null,
          createdAt: 1,
          editedAt: null,
          mentionedUids: [],
          quotedPostId: null,
          quotedAuthorUid: null,
          quotedText: null,
        },
      ],
      likesByPost: new Map([["f1", new Set(["me"])]]),
    });
    expect(screen.getByText("recent-posts:1:me:1")).toBeInTheDocument();
  });

  it("shows a like error alert when one is present, and hides it otherwise", () => {
    const { rerender } = renderPage({ likeError: null });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <HomeLandingLoggedIn
          me={me}
          players={players}
          submitterUids={new Set(["p2"])}
          messages={[]}
          onLoadOlderMessages={vi.fn()}
          loadingOlderMessages={false}
          hasMoreOlderMessages={false}
          onlineCount={0}
          typingUids={[]}
          posts={[]}
          likesByPost={new Map()}
          onToggleLike={vi.fn()}
          likeError="Beğeni kaydedilemedi, tekrar deneyin."
          onDeletePost={vi.fn()}
          onSaveEdit={vi.fn()}
          onRefetchPosts={vi.fn()}
          forumActionError={null}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi, tekrar deneyin.");
  });

  it("renders the hero carousel cell between Forum and Sohbet", () => {
    renderPage();
    expect(screen.getByText("home-hero")).toBeInTheDocument();
  });

  it("shows the online count in the Sohbet header", () => {
    renderPage({ onlineCount: 7 });
    expect(screen.getByText("7 çevrimiçi")).toBeInTheDocument();
  });

  it("passes messages, players, pagination state, and typing uids through to chat", () => {
    renderPage({
      messages: [{ id: "m1", uid: "p2", text: "hi", createdAt: 1 }],
      loadingOlderMessages: true,
      hasMoreOlderMessages: true,
      typingUids: ["p2"],
    });
    expect(screen.getByText("chat-room:me:2:1:true:true:1")).toBeInTheDocument();
  });

  it("wires the load-older callback through to chat", () => {
    const onLoadOlderMessages = vi.fn();
    renderPage({ onLoadOlderMessages });
    fireEvent.click(screen.getByText("load-older"));
    expect(onLoadOlderMessages).toHaveBeenCalledTimes(1);
  });

  it("opens the participant popup for the clicked player, always as not-tournament-started", () => {
    renderPage();
    expect(screen.getByText("participant-popup:none:false")).toBeInTheDocument();
    fireEvent.click(screen.getByText("select-p2"));
    expect(screen.getByText("participant-popup:p2:false")).toBeInTheDocument();
  });

  it("closes the participant popup on request", () => {
    renderPage();
    fireEvent.click(screen.getByText("select-p2"));
    expect(screen.getByText("participant-popup:p2:false")).toBeInTheDocument();
    fireEvent.click(screen.getByText("close-popup"));
    expect(screen.getByText("participant-popup:none:false")).toBeInTheDocument();
  });
});
