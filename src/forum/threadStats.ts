import { PostWithId } from "./postTypes";

export interface ThreadStats {
  /** Every descendant post anywhere in the thread, not just direct
   *  replies — buildThreadTree.ts already establishes replies can nest
   *  arbitrarily deep, so a reply-to-a-reply still counts. */
  replyCount: number;
  /** The root post's own createdAt, or its most recent descendant's,
   *  whichever is later — a thread with a fresh reply reads as "recent"
   *  even if it was first posted days ago (forum-widget-round-01 Q1/Q6). */
  lastActivityAt: number;
  /** The single most recently created reply anywhere in the thread
   *  (any depth), or null if it has none yet. */
  latestReply: PostWithId | null;
}

/** Keyed by each top-level (parentId === null) post's id. */
export function computeThreadStats(posts: PostWithId[]): Map<string, ThreadStats> {
  const childrenByParent = new Map<string, PostWithId[]>();
  posts.forEach((post) => {
    if (post.parentId === null) return;
    const siblings = childrenByParent.get(post.parentId) ?? [];
    siblings.push(post);
    childrenByParent.set(post.parentId, siblings);
  });

  function collect(postId: string): { count: number; latest: number; latestPost: PostWithId | null } {
    const children = childrenByParent.get(postId) ?? [];
    let count = 0;
    let latest = 0;
    let latestPost: PostWithId | null = null;
    for (const child of children) {
      count += 1;
      if (child.createdAt > latest) {
        latest = child.createdAt;
        latestPost = child;
      }
      const sub = collect(child.id);
      count += sub.count;
      if (sub.latest > latest) {
        latest = sub.latest;
        latestPost = sub.latestPost;
      }
    }
    return { count, latest, latestPost };
  }

  const stats = new Map<string, ThreadStats>();
  posts
    .filter((post) => post.parentId === null)
    .forEach((post) => {
      const { count, latest, latestPost } = collect(post.id);
      stats.set(post.id, {
        replyCount: count,
        lastActivityAt: Math.max(post.createdAt, latest),
        latestReply: latestPost,
      });
    });
  return stats;
}
