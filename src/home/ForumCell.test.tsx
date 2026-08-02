import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForumCell } from "./ForumCell";

function baseProps() {
  return {
    posts: [],
    players: [],
    myUid: "uid1",
    likesByPost: new Map(),
    onToggleLike: vi.fn(),
    onSelectParticipant: vi.fn(),
    onDeletePost: vi.fn(),
    onSaveEdit: vi.fn(),
    onRefetchPosts: vi.fn(),
    likeError: null,
    forumActionError: null,
  };
}

describe("ForumCell", () => {
  it("links its title to /forum", () => {
    render(
      <MemoryRouter>
        <ForumCell {...baseProps()} />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Forum" })).toHaveAttribute("href", "/forum");
  });

  it("surfaces a like error when one is passed", () => {
    render(
      <MemoryRouter>
        <ForumCell {...baseProps()} likeError="Beğeni kaydedilemedi, tekrar deneyin." />
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Beğeni kaydedilemedi");
  });
});
