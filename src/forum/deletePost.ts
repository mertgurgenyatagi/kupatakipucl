// src/forum/deletePost.ts
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Real, hard delete — no placeholder (that's a Chat-specific choice, not a
 * forum one; forum-round-01 Q5). Deleting a root post takes every one of its
 * replies with it; `replyIds` is computed by the caller from the already-
 * loaded post list (usePosts() fetches the whole collection, no pagination
 * to re-query against). Deleting a reply on its own — since nesting is flat
 * — never has anything to cascade, so callers just pass an empty array.
 */
export async function deletePost(postId: string, replyIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  replyIds.forEach((id) => batch.delete(doc(db, "forumPosts", id)));
  batch.delete(doc(db, "forumPosts", postId));
  await batch.commit();
}
