// src/forum/Forum.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockUsePosts = vi.fn();
const mockUsePlayers = vi.fn();

vi.mock("./usePosts", () => ({
  usePosts: () => mockUsePosts(),
}));

vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));

import { Forum } from "./Forum";

const post = { id: "p1", uid: "uid1", text: "Merhaba", imageURL: null, parentId: null, createdAt: 1 };

describe("Forum", () => {
  beforeEach(() => {
    mockUsePosts.mockReturnValue({ posts: [], loading: false, refetch: vi.fn() });
    mockUsePlayers.mockReturnValue({ players: [], loading: false });
  });

  it("renders nothing while posts or players are loading", () => {
    mockUsePosts.mockReturnValue({ posts: [], loading: true, refetch: vi.fn() });
    const { container } = render(<Forum uid="uid1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a new-thread form when logged in", () => {
    render(<Forum uid="uid1" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("does not render a new-thread form when logged out", () => {
    render(<Forum uid={null} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders each top-level post from the built thread tree", () => {
    mockUsePosts.mockReturnValue({ posts: [post], loading: false, refetch: vi.fn() });
    render(<Forum uid={null} />);
    expect(screen.getByText(/Merhaba/)).toBeInTheDocument();
  });
});
