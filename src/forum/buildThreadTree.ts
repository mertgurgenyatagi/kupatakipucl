import { PostWithId } from "./postTypes";

export interface ThreadNode {
  post: PostWithId;
  children: ThreadNode[];
}

export function buildThreadTree(posts: PostWithId[]): ThreadNode[] {
  const childrenByParent = new Map<string | null, PostWithId[]>();
  posts.forEach((post) => {
    const siblings = childrenByParent.get(post.parentId) ?? [];
    siblings.push(post);
    childrenByParent.set(post.parentId, siblings);
  });

  function buildNodes(parentId: string | null): ThreadNode[] {
    const siblings = (childrenByParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt);
    return siblings.map((post) => ({
      post,
      children: buildNodes(post.id),
    }));
  }

  return buildNodes(null);
}
