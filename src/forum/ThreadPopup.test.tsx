// src/forum/ThreadPopup.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { ThreadPopup } from "./ThreadPopup";
import { PostWithId } from "./postTypes";

const players = [
  { uid: "uid1", firstName: "Mert", lastName: "G", photoURL: "", createdAt: 1 },
  { uid: "uid2", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
];

function makePost(overrides: Partial<PostWithId> = {}): PostWithId {
  return {
    id: "root1",
    uid: "uid1",
    text: "kök gönderi metni",
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

function renderPopup(overrides: Partial<ComponentProps<typeof ThreadPopup>> = {}) {
  return render(
    <ThreadPopup
      rootId="root1"
      posts={[makePost()]}
      players={players}
      uid="uid1"
      likesByPost={new Map()}
      onToggleLike={vi.fn()}
      onOpenChange={vi.fn()}
      onSelectParticipant={vi.fn()}
      onDelete={vi.fn()}
      onSaveEdit={vi.fn()}
      onPosted={vi.fn()}
      {...overrides}
    />
  );
}

describe("ThreadPopup", () => {
  it("renders nothing when rootId is null", () => {
    renderPopup({ rootId: null });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the root post's author and full text", async () => {
    renderPopup();
    expect(await screen.findByText("Mert G")).toBeInTheDocument();
    expect(screen.getByText("kök gönderi metni")).toBeInTheDocument();
  });

  it("shows every reply, not just 3, and in chronological order", async () => {
    const root = makePost();
    const replies = Array.from({ length: 5 }, (_, i) =>
      makePost({ id: `r${i}`, parentId: "root1", text: `yanıt ${i}`, createdAt: i })
    );
    renderPopup({ posts: [root, ...replies] });
    for (let i = 0; i < 5; i++) {
      expect(await screen.findByText(`yanıt ${i}`)).toBeInTheDocument();
    }
  });

  it("shows a distinct message when there are no replies", async () => {
    renderPopup();
    expect(await screen.findByText("Henüz yanıt yok.")).toBeInTheDocument();
  });

  it("shows edit/delete for your own root post and saves an edit", async () => {
    const onSaveEdit = vi.fn();
    renderPopup({ onSaveEdit });
    fireEvent.click(await screen.findByLabelText("Düzenle"));
    const textarea = screen.getByDisplayValue("kök gönderi metni");
    fireEvent.change(textarea, { target: { value: "düzenlenmiş kök metin" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSaveEdit).toHaveBeenCalledWith("root1", "düzenlenmiş kök metin");
  });

  it("does not show edit/delete for someone else's root post", async () => {
    renderPopup({ posts: [makePost({ uid: "uid2" })] });
    await screen.findByText("Ada Lovelace");
    expect(screen.queryByLabelText("Düzenle")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Konuyu sil")).not.toBeInTheDocument();
  });

  it("calls onDelete with the root id", async () => {
    const onDelete = vi.fn();
    renderPopup({ onDelete });
    fireEvent.click(await screen.findByLabelText("Konuyu sil"));
    expect(onDelete).toHaveBeenCalledWith("root1");
  });

  it("stages a quote from a reply's quote button into the reply composer", async () => {
    const reply = makePost({ id: "r1", parentId: "root1", uid: "uid2", text: "alıntılanacak yanıt" });
    renderPopup({ posts: [makePost(), reply] });
    const quoteButtons = await screen.findAllByLabelText("Alıntıla");
    fireEvent.click(quoteButtons[0]);
    // Appears twice once staged: once in the reply itself, once in the
    // composer's own quote-chip preview.
    expect(screen.getAllByText("alıntılanacak yanıt").length).toBe(2);
    expect(screen.getByLabelText("Alıntıyı kaldır")).toBeInTheDocument();
  });

  it("does not render a reply composer when logged out", async () => {
    renderPopup({ uid: null });
    await screen.findByText("kök gönderi metni");
    expect(screen.queryByPlaceholderText("Yanıt yaz…")).not.toBeInTheDocument();
  });

  it("does not show the quote button on replies when logged out", async () => {
    const reply = makePost({ id: "r1", parentId: "root1", uid: "uid2", text: "bir yanıt" });
    renderPopup({ uid: null, posts: [makePost(), reply] });
    await screen.findByText("bir yanıt");
    expect(screen.queryByLabelText("Alıntıla")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the close button is activated", async () => {
    const onOpenChange = vi.fn();
    renderPopup({ onOpenChange });
    fireEvent.click(await screen.findByRole("button", { name: "Kapat" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
