// src/forum/ReplyRow.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { ReplyRow } from "./ReplyRow";
import { PostWithId } from "./postTypes";

const players = [
  { uid: "uid1", firstName: "Mert", lastName: "G", photoURL: "", createdAt: 1 },
  { uid: "uid2", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
];

function makePost(overrides: Partial<PostWithId> = {}): PostWithId {
  return {
    id: "reply1",
    uid: "uid1",
    text: "cevap metni",
    imageURL: null,
    parentId: "root1",
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

function renderRow(overrides: Partial<ComponentProps<typeof ReplyRow>> = {}) {
  return render(
    <ReplyRow
      reply={makePost()}
      players={players}
      posts={[makePost()]}
      uid="uid1"
      liked={false}
      likeCount={0}
      onToggleLike={vi.fn()}
      onSelectParticipant={vi.fn()}
      {...overrides}
    />
  );
}

describe("ReplyRow", () => {
  it("shows the author name and reply text", () => {
    renderRow();
    expect(screen.getByText("Mert G")).toBeInTheDocument();
    expect(screen.getByText("cevap metni")).toBeInTheDocument();
  });

  it("does not show quote/edit/delete affordances when those callbacks are omitted", () => {
    renderRow();
    expect(screen.queryByLabelText("Alıntıla")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Düzenle")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sil")).not.toBeInTheDocument();
  });

  it("shows edit/delete only for your own reply, and only when the callbacks are provided", () => {
    renderRow({ reply: makePost({ uid: "uid2" }), onSaveEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.queryByLabelText("Düzenle")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sil")).not.toBeInTheDocument();
  });

  it("calls onQuote with the reply when the quote button is clicked", () => {
    const onQuote = vi.fn();
    renderRow({ onQuote });
    fireEvent.click(screen.getByLabelText("Alıntıla"));
    expect(onQuote).toHaveBeenCalledWith(expect.objectContaining({ id: "reply1" }));
  });

  it("enters edit mode, saves trimmed text, and calls onSaveEdit", () => {
    const onSaveEdit = vi.fn();
    renderRow({ onSaveEdit });
    fireEvent.click(screen.getByLabelText("Düzenle"));
    const textarea = screen.getByDisplayValue("cevap metni");
    fireEvent.change(textarea, { target: { value: "  düzenlenmiş metin  " } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSaveEdit).toHaveBeenCalledWith("reply1", "düzenlenmiş metin");
  });

  it("calls onDelete with the reply id", () => {
    const onDelete = vi.fn();
    renderRow({ onDelete });
    fireEvent.click(screen.getByLabelText("Sil"));
    expect(onDelete).toHaveBeenCalledWith("reply1");
  });

  it("shows a quote chip tinted for an existing target and clickable via onJumpToQuote", () => {
    const onJumpToQuote = vi.fn();
    const quoted = makePost({ id: "original1", uid: "uid2", text: "orijinal" });
    renderRow({
      reply: makePost({ quotedPostId: "original1", quotedAuthorUid: "uid2", quotedText: "orijinal metin" }),
      posts: [quoted, makePost()],
      onJumpToQuote,
    });
    fireEvent.click(screen.getByText(/orijinal metin/));
    expect(onJumpToQuote).toHaveBeenCalledWith("original1");
  });

  it("shows a quote chip as gray and non-clickable when the quoted post no longer exists", () => {
    const onJumpToQuote = vi.fn();
    renderRow({
      reply: makePost({ quotedPostId: "gone1", quotedAuthorUid: "uid2", quotedText: "silinmiş metin" }),
      posts: [makePost()],
      onJumpToQuote,
    });
    fireEvent.click(screen.getByText(/silinmiş metin/));
    expect(onJumpToQuote).not.toHaveBeenCalled();
  });

  it("calls onToggleLike with the reply id", () => {
    const onToggleLike = vi.fn();
    renderRow({ onToggleLike });
    fireEvent.click(screen.getByLabelText("Beğen"));
    expect(onToggleLike).toHaveBeenCalledWith("reply1");
  });

  it("calls onSelectParticipant with the reply author's uid", () => {
    const onSelectParticipant = vi.fn();
    renderRow({ onSelectParticipant });
    fireEvent.click(screen.getByText("Mert G"));
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });
});
