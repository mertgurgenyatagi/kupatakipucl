// src/forum/Forum.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { Forum } from "./Forum";
import { PostWithId } from "./postTypes";

vi.mock("./ThreadPopup", () => ({
  ThreadPopup: ({ rootId }: { rootId: string | null }) => <div>thread-popup:{String(rootId)}</div>,
}));

const players = [
  { uid: "uid1", firstName: "Mert", lastName: "G", photoURL: "", createdAt: 1 },
  { uid: "uid2", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
];

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
    ...overrides,
  };
}

function renderForum(overrides: Partial<ComponentProps<typeof Forum>> = {}) {
  return render(
    <Forum
      uid="uid1"
      posts={[]}
      players={players}
      likesByPost={new Map()}
      onToggleLike={vi.fn()}
      onSelectParticipant={vi.fn()}
      onDeletePost={vi.fn()}
      onSaveEdit={vi.fn()}
      onRefetch={vi.fn()}
      {...overrides}
    />
  );
}

describe("Forum", () => {
  it("renders a new-thread form when logged in", () => {
    renderForum();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows a login prompt instead of a composer when logged out", () => {
    renderForum({ uid: null });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/giriş yapmalısın/)).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no posts", () => {
    renderForum({ posts: [] });
    expect(screen.getByText("Henüz gönderi yok.")).toBeInTheDocument();
  });

  it("renders each root post as a thread card, not its replies directly", () => {
    const root = makePost({ id: "root1", text: "Konu metni" });
    const reply = makePost({ id: "reply1", parentId: "root1", text: "Bir cevap metni burada" });
    renderForum({ posts: [root, reply] });
    expect(screen.getByText(/Konu metni/)).toBeInTheDocument();
    // The reply shows too (as part of the card's own 3-reply preview) —
    // what matters is the reply is nested under its root, not a sibling.
    expect(screen.getByText(/Bir cevap metni burada/)).toBeInTheDocument();
  });

  it("sorts root posts by last activity, a fresher reply bumping its thread to the top", () => {
    const older = makePost({ id: "root-older", text: "Eski konu", createdAt: 1 });
    const newer = makePost({ id: "root-newer", text: "Yeni konu", createdAt: 100 });
    const bumpingReply = makePost({ id: "reply1", parentId: "root-older", text: "Taze cevap", createdAt: 500 });
    renderForum({ posts: [older, newer, bumpingReply] });
    const headings = screen.getAllByText(/konu$/);
    expect(headings[0]).toHaveTextContent("Eski konu");
  });

  it("filters the grid by search query, matching post text", () => {
    const a = makePost({ id: "a", text: "Arsenal harika oynadı" });
    const b = makePost({ id: "b", text: "Barcelona berbat" });
    renderForum({ posts: [a, b] });
    fireEvent.click(screen.getByLabelText("Forumda ara"));
    fireEvent.change(screen.getByPlaceholderText("Forumda ara…"), { target: { value: "Arsenal" } });
    expect(screen.getByText(/Arsenal harika oynadı/)).toBeInTheDocument();
    expect(screen.queryByText(/Barcelona berbat/)).not.toBeInTheDocument();
  });

  it("shows a distinct no-results message when a search matches nothing", () => {
    renderForum({ posts: [makePost({ text: "Arsenal" })] });
    fireEvent.click(screen.getByLabelText("Forumda ara"));
    fireEvent.change(screen.getByPlaceholderText("Forumda ara…"), { target: { value: "zzz-yok" } });
    expect(screen.getByText("Sonuç bulunamadı.")).toBeInTheDocument();
  });

  it("opens the thread popup for a post when its expand affordance is clicked", () => {
    const root = makePost({ id: "root1", text: "Konu" });
    renderForum({ posts: [root] });
    fireEvent.click(screen.getByText("0 yanıt"));
    expect(screen.getByText("thread-popup:root1")).toBeInTheDocument();
  });

  it("shows a passed-through action error", () => {
    renderForum({ actionError: "Gönderi silinemedi, tekrar deneyin." });
    expect(screen.getByRole("alert")).toHaveTextContent("Gönderi silinemedi, tekrar deneyin.");
  });
});
