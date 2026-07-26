export interface ForumPost {
  uid: string;
  text: string;
  imageURL: string | null;
  parentId: string | null;
  createdAt: number;
  /** Set on every edit (text only — forum-round-03 Q5: images are permanent
   *  once posted). Drives the "düzenlendi" marker; never affects sort order
   *  (forum-round-03 Q6 — only a new reply bumps a thread). */
  editedAt: number | null;
  /** Every uid whose first name is @mentioned in `text`, same convention as
   *  chat (chatMentions.ts, reused as-is). */
  mentionedUids: string[];
  /** Set only on a reply composed via "quote" on another post in the same
   *  thread (forum-round-01 Q3 replaced Reddit-style nesting with quoting).
   *  `quotedPostId` is a live pointer — present in the thread's own post
   *  list only if that post still exists — used to decide the accent vs.
   *  gray treatment and whether the quote is clickable/jumpable. The author
   *  + text are cached at quote time so the quote still renders after the
   *  original is hard-deleted (forum posts have no tombstone). */
  quotedPostId: string | null;
  quotedAuthorUid: string | null;
  quotedText: string | null;
}

export interface PostWithId extends ForumPost {
  id: string;
}
