import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import { RecentPostsPreview, ForumPreviewFooter } from "./RecentPostsPreview";
import { PostWithId } from "./postTypes";
import { Player } from "../profile/usePlayers";

const players: Player[] = [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 }];

function post(overrides: Partial<PostWithId>): PostWithId {
  return {
    id: "p1",
    uid: "uid1",
    text: "Merhaba",
    imageURL: null,
    parentId: null,
    createdAt: 1000,
    editedAt: null,
    mentionedUids: [],
    quotedPostId: null,
    quotedAuthorUid: null,
    quotedText: null,
    likedByUids: [],
    ...overrides,
  };
}

function renderPreview(overrides: Partial<Parameters<typeof RecentPostsPreview>[0]> = {}) {
  return render(
    <RecentPostsPreview
      posts={[]}
      players={players}
      uid="uid1"
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

describe("RecentPostsPreview", () => {
  it("shows an empty state when there are no posts", () => {
    renderPreview();
    expect(screen.getByText("Henüz gönderi yok.")).toBeInTheDocument();
  });

  it("only shows top-level posts as their own row", () => {
    renderPreview({
      posts: [
        post({ id: "thread", text: "Bir konu", createdAt: 100 }),
        post({ id: "reply", text: "Bir cevap", parentId: "thread", createdAt: 150 }),
      ],
    });
    expect(screen.queryByText("Bir cevap")).not.toBeInTheDocument();
    expect(screen.getByText("Bir konu")).toBeInTheDocument();
  });

  it("sorts by last activity, so a reply bumps an older thread ahead of a newer quiet one", () => {
    renderPreview({
      posts: [
        post({ id: "old", text: "Eski konu", createdAt: 100 }),
        post({ id: "old-reply", text: "cevap", parentId: "old", createdAt: 900 }),
        post({ id: "new", text: "Yeni konu", createdAt: 500 }),
      ],
    });
    const texts = screen.getAllByText(/konu/).map((el) => el.textContent);
    expect(texts).toEqual(["Eski konu", "Yeni konu"]);
  });

  it("shows a reply count per thread, including nested replies-to-replies", () => {
    renderPreview({
      posts: [
        post({ id: "thread", createdAt: 100 }),
        post({ id: "r1", parentId: "thread", createdAt: 200 }),
        post({ id: "r2", parentId: "r1", createdAt: 300 }),
      ],
    });
    expect(screen.getByText("2 yanıt")).toBeInTheDocument();
  });

  it("shows a zero reply count for a thread with no replies", () => {
    renderPreview({ posts: [post({})] });
    expect(screen.getByText("0 yanıt")).toBeInTheDocument();
  });

  it("defaults to showing at most 3 posts", () => {
    const posts = Array.from({ length: 5 }, (_, i) => post({ id: `p${i}`, text: `Gönderi ${i}`, createdAt: i }));
    renderPreview({ posts });
    expect(screen.getAllByText(/^Gönderi \d$/)).toHaveLength(3);
  });

  it("respects a custom limit prop", () => {
    const posts = Array.from({ length: 5 }, (_, i) => post({ id: `p${i}`, text: `Gönderi ${i}`, createdAt: i }));
    renderPreview({ posts, limit: 2 });
    expect(screen.getAllByText(/^Gönderi \d$/)).toHaveLength(2);
  });

  it("shows 'Silindi' when no matching player is found (a deleted account)", () => {
    renderPreview({ posts: [post({ uid: "unknown-uid" })], players: [] });
    expect(screen.getByText("Silindi")).toBeInTheDocument();
  });

  it("shows a thumbnail when a post has an image, and none when it doesn't", () => {
    renderPreview({
      posts: [
        post({ id: "with-image", text: "Resimli", imageURL: "https://example.com/a.jpg", createdAt: 2 }),
        post({ id: "without-image", text: "Resimsiz", createdAt: 1 }),
      ],
    });
    const withImageRow = screen.getByText("Resimli").closest("li")!;
    const withoutImageRow = screen.getByText("Resimsiz").closest("li")!;
    expect(withImageRow.querySelector("img[alt='']")).toBeInTheDocument();
    expect(withoutImageRow.querySelector("img[alt='']")).not.toBeInTheDocument();
  });

  it("marks the like button pressed and shows the count when the current user has liked it", () => {
    renderPreview({ posts: [post({})], likesByPost: new Map([["p1", new Set(["uid1", "uid2"])]]) });
    const likeButton = screen.getByRole("button", { name: "Beğeniyi geri al" });
    expect(likeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("still shows a zero count when nobody has liked a post yet (a count that appears/disappears shifts the row)", () => {
    renderPreview({ posts: [post({})], likesByPost: new Map() });
    const likeButton = screen.getByRole("button", { name: "Beğen" });
    expect(likeButton).toHaveAttribute("aria-pressed", "false");
    expect(within(likeButton).getByText("0")).toBeInTheDocument();
  });

  it("calls onToggleLike with the post id when the like button is clicked", () => {
    const onToggleLike = vi.fn();
    renderPreview({ posts: [post({ id: "p1" })], onToggleLike });
    fireEvent.click(screen.getByRole("button", { name: "Beğen" }));
    expect(onToggleLike).toHaveBeenCalledWith("p1");
  });

  it("opens the thread popup (with the full text) when the row itself is clicked", () => {
    renderPreview({ posts: [post({ id: "p1", text: "Tıklanabilir satır" })] });
    fireEvent.click(screen.getByText("Tıklanabilir satır"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clicking the like button does not also open the thread popup", () => {
    renderPreview({ posts: [post({ id: "p1" })] });
    fireEvent.click(screen.getByRole("button", { name: "Beğen" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking the reply count opens the thread popup", () => {
    renderPreview({ posts: [post({ id: "p1" })] });
    fireEvent.click(screen.getByText("0 yanıt"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("ForumPreviewFooter", () => {
  it("links through to the full forum", () => {
    render(
      <MemoryRouter>
        <ForumPreviewFooter />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Forumu Aç" })).toHaveAttribute("href", "/forum");
  });
});
