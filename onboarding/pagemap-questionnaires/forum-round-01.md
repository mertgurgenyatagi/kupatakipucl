# Kupatakip UCL — Forum Questionnaire, Round 1

Scoped to the full `/forum` page (not the Home widget, which forum-widget-round-01 already covered). Filled out via the forum-intake tool; clipboard copy failed in-page again (same Artifact sandboxing as forum-widget-round-01), so answers came back as pasted page text — transcribed below against each question.

---

**1. Composition.**

Your answer: Big ass frame.

---

**2. Order.**

Your answer: Same thing. (Same as the widget: a reply, at any depth, bumps its thread back to the top.)

---

**3. Nesting depth.**

Your answer: Not reddit style. Only first level replies. You answer people by quoting them.

---

**4. Likes, for real this time.**

Your answer: Including replies, yes.

---

**5. Delete, reconsidered.**

Your answer: Yes delete is allowed. Replies can be deleted too. Forum doesn't leave a placeholder. Also, deleted forum posts also get rid of the replies.

---

**6. Whose name is it.**

Your answer: Wherever there is a name, there is a participant popup.

---

**7. Starting a thread.**

Your answer: Your call.

---

**8. Replying.**

Your answer: Show most recent three replies. Each post gets its own popup when you click expand on either the constrained opening post or expand on the previous comments. Don't use these exact words but you get it.

---

**9. Search, finally.**

Your answer: Same thing. (Same as chat: a toggle icon opens an inline search bar, one-time fetch, filtered client-side.)

---

**10. The blunt-voice test, one more time.**

Your answer: Same. (Stays professional/restrained — same call as both the chat and forum-widget rounds.)

---

## Net decisions for implementation

- **One big frame** (Q1): not a Leaderboard-style multi-frame bento — the whole page composes as a single dominant `Frame`, composer plus thread feed together.
- **Bump-to-top on reply** (Q2): identical to the widget's own rule — any reply, at any depth, refreshes its thread's position at the top of the feed.
- **Nesting flattened to one level** (Q3): this is the biggest structural change from what's built today. `buildThreadTree.ts` currently lets a reply nest under a reply under a reply, arbitrarily deep. That's going away for display purposes — every reply attaches directly to its root post (one flat list per thread), and "replying to a specific earlier reply" is expressed by **quoting** that reply (its author + a snippet) inline in your new reply, not by creating another tree level. Round 2 needs to pin down whether a quote is a live reference or a frozen snippet.
- **Likes everywhere** (Q4): `usePostLikes.ts`/`setPostLiked()` finally get a real button — on root posts *and* replies, not just root posts.
- **Real delete, with cascade** (Q5): a clean break from the widget round's "no delete" and from Chat's soft-delete pattern. Deleting your own post actually removes it (no "Bu mesaj silindi." placeholder — that was a Chat-specific choice, not a forum one). Deleting a root post takes every one of its replies down with it. Replies can also be deleted individually (with nothing left behind, and — since nesting is now flat — no children of their own to worry about cascading).
- **Every name is a link** (Q6): any place a participant's name appears on this page — root post author, reply author — opens their `ParticipantPopup`, matching the same cross-link convention Leaderboard and Profile already use.
- **Composer placement — Claude's call** (Q7): explicitly delegated. Decision: keep it simple and consistent with what's already built — the new-thread composer stays a plain, always-visible box at the top of the one big frame (matches `Forum.tsx`'s existing inline `PostForm` rather than introducing a new modal/dialog pattern for something this core).
- **Feed = clamped previews, expand = full-thread popup** (Q8): the main page shows every thread as a clamped preview — the root post's own text truncated (matching the widget's existing 2-line-clamp convention, pending Round 2 confirmation at full-page scale) plus only its **3 most recent replies**. An "expand" action — off either the clamped root post or the replies preview — opens a dedicated popup (new component, following the same `Dialog`/`Frame` convention as `TeamPopup`/`ParticipantPopup`) showing the thread in full: untruncated post, every reply, not just 3. Round 2 needs to nail down the remaining mechanics (can you reply/like from inside the popup vs. only from the feed, preview-reply ordering, whether images show in the clamped feed or only in the popup).
- **Search** (Q9): identical to Chat's pattern — a toggle icon opens an inline search bar, one-time full-history fetch, filtered client-side (still no real search index, same honest-simple reasoning as Chat).
- **Voice/tone** (Q10): stays restrained/professional — third time this exact question has landed on the same answer (chat-widget-round-01 Q23, forum-widget-round-01 Q23), despite DESIGN.md's standing carve-out for chat/forum as the site's one "genuinely loose" exception.

**Open for Round 2:** quote mechanics (live reference vs. frozen snippet, and whether it ties into the `@mention` system), the feed clamp length at full-page scale, what's possible from inside the expand-popup vs. the feed itself, ordering of the 3-reply preview, image handling in the clamped feed, and whether "no edit" still holds now that delete turned out more permissive than expected.
