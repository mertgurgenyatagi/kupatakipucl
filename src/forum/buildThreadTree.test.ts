// src/forum/buildThreadTree.test.ts
import { describe, it, expect } from "vitest";
import { buildThreadTree } from "./buildThreadTree";
import { PostWithId } from "./postTypes";

function post(id: string, parentId: string | null, createdAt: number): PostWithId {
  return { id, uid: "uid1", text: `text-${id}`, imageURL: null, parentId, createdAt };
}

describe("buildThreadTree", () => {
  it("returns an empty array for no posts", () => {
    expect(buildThreadTree([])).toEqual([]);
  });

  it("returns top-level posts sorted by createdAt, no children", () => {
    const tree = buildThreadTree([post("b", null, 200), post("a", null, 100)]);
    expect(tree.map((n) => n.post.id)).toEqual(["a", "b"]);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });

  it("nests a direct reply under its parent", () => {
    const tree = buildThreadTree([post("thread", null, 100), post("reply", "thread", 200)]);
    expect(tree).toHaveLength(1);
    expect(tree[0].post.id).toBe("thread");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].post.id).toBe("reply");
  });

  it("nests a reply-to-a-reply two levels deep", () => {
    const tree = buildThreadTree([
      post("thread", null, 100),
      post("reply1", "thread", 200),
      post("reply2", "reply1", 300),
    ]);
    expect(tree[0].children[0].post.id).toBe("reply1");
    expect(tree[0].children[0].children[0].post.id).toBe("reply2");
    expect(tree[0].children[0].children[0].children).toEqual([]);
  });

  it("sorts children chronologically at every level", () => {
    const tree = buildThreadTree([
      post("thread", null, 100),
      post("later", "thread", 300),
      post("earlier", "thread", 200),
    ]);
    expect(tree[0].children.map((n) => n.post.id)).toEqual(["earlier", "later"]);
  });
});
