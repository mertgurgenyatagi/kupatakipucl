// src/forum/ThreadNode.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThreadNode } from "./ThreadNode";
import { ThreadNode as ThreadNodeData } from "./buildThreadTree";

const players = [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }];

function leafNode(id: string, text: string, uid = "uid1"): ThreadNodeData {
  return { post: { id, uid, text, imageURL: null, parentId: null, createdAt: 1 }, children: [] };
}

describe("ThreadNode", () => {
  it("renders the post's sender name and text", () => {
    render(<ThreadNode node={leafNode("p1", "Merhaba")} uid={null} players={players} onPosted={() => {}} />);
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Merhaba/)).toBeInTheDocument();
  });

  it("falls back to the raw uid when no matching player is found", () => {
    render(<ThreadNode node={leafNode("p1", "Merhaba", "unknown-uid")} uid={null} players={[]} onPosted={() => {}} />);
    expect(screen.getByText(/unknown-uid/)).toBeInTheDocument();
  });

  it("renders an image when the post has one", () => {
    const node: ThreadNodeData = {
      post: { id: "p1", uid: "uid1", text: "", imageURL: "https://example.com/img.png", parentId: null, createdAt: 1 },
      children: [],
    };
    render(<ThreadNode node={node} uid={null} players={players} onPosted={() => {}} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/img.png");
  });

  it("does not render a reply form when logged out (uid is null)", () => {
    render(<ThreadNode node={leafNode("p1", "Merhaba")} uid={null} players={players} onPosted={() => {}} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders a reply form when logged in", () => {
    render(<ThreadNode node={leafNode("p1", "Merhaba")} uid="uid2" players={players} onPosted={() => {}} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("recursively renders two levels of nested children", () => {
    const grandchild = leafNode("p3", "En derin cevap");
    const child: ThreadNodeData = { post: { id: "p2", uid: "uid1", text: "Cevap", imageURL: null, parentId: "p1", createdAt: 2 }, children: [grandchild] };
    const root: ThreadNodeData = { post: { id: "p1", uid: "uid1", text: "Konu", imageURL: null, parentId: null, createdAt: 1 }, children: [child] };
    render(<ThreadNode node={root} uid={null} players={players} onPosted={() => {}} />);
    expect(screen.getByText(/Konu/)).toBeInTheDocument();
    expect(screen.getByText(/Cevap/)).toBeInTheDocument();
    expect(screen.getByText(/En derin cevap/)).toBeInTheDocument();
  });
});
