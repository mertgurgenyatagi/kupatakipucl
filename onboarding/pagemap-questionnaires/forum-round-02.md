# Kupatakip UCL — Forum Questionnaire, Round 2

Scoped to the full `/forum` page. Filled out via the forum-intake tool.

---

**1. Quoting, made concrete.**

Your answer: 1st — a live, clickable reference back to the exact original comment (needs a fallback for when that comment's since been deleted), not a frozen snippet.

---

**2. Quoting and the mention system.**

Your answer: 1st — a real reference to the quoted person's uid, tying into the same system @mentions already use, likely the same tint treatment.

---

**3. The clamp, upsized or same.**

Your answer: "I'm not sure what I meant by big ass frame. I don't actually want a frame. I want it to be a grid, 3 posts each row max." — **Reverses Round 1 Q1's "one big frame."** The page is a grid of thread cards, max 3 per row, not one dominant Frame around everything.

---

**4. What "expand" actually opens.**

Your answer: Yes you can post a brand new reply. (From inside the expand-popup — not read-only.)

---

**5. The 3-reply preview, ordered which way.**

Your answer: Suppose there have been 93 replies. First the 91st is shown, under it the 92nd, and at the very bottom the 93rd. — Oldest-of-the-three on top, newest at the bottom, reading like a normal conversation toward the compose box.

---

**6. Liking, from the feed or only the popup.**

Your answer: Both.

---

**7. Images, in the feed or behind expand.**

Your answer: In the feed. Also, replies can also post images. — (`createPost`/`PostForm` already accept an image regardless of `parentId`, so this is confirming the existing capability applies to replies too, not new schema.)

---

**8. Edit — still a flat no?**

Your answer: Can edit, but shown as edited.

---

**9. Deleting something that's been quoted.**

Your answer: Deleted replies don't leave placeholders but quoting them factors that in. Maybe the deleted quote is not brass or whatever, maybe it's gray. — A quote pointing at a since-deleted post still shows (it's a live reference per Q1, so the quoted text/author needs to be cached at quote-time to survive the source's deletion), styled gray/muted instead of the normal accent tint, signaling "this one's gone."

---

**10. Anything else, forum-specific.**

Your answer: I think the next questionnaire will be the last.

---

## Net decisions for implementation

- **Quoting is a live reference** (Q1): each quote stores the original post's id (not just a copied string), with the quoted author/text cached alongside it so it still renders if the source is later deleted (see Q9).
- **Quoting plugs into the mention system** (Q2): a real uid reference, same family as Chat's `@mention` — likely the same tint treatment, reused rather than a second parallel system.
- **Grid, not a frame** (Q3): **overrides Round 1 Q1.** `/forum` is a grid of thread cards, 3 per row max — not one big `Frame` wrapping everything. Round 1's "big ass frame" answer is superseded by this correction.
- **Replying works from inside the popup** (Q4): the expand-popup is a fully working view, not read-only — you can write and post a brand new reply from there.
- **3-reply preview order: oldest of the three first** (Q5): if a thread has 93 replies, the feed card shows #91, #92, #93 top-to-bottom — chronological, most recent nearest the compose/reply area.
- **Liking works in both places** (Q6): the grid card itself and the expand-popup both support liking, not one-or-the-other.
- **Images in the feed, and on replies too** (Q7): an attached image shows as a thumbnail right in the grid card (not hidden behind expand), and replies can carry their own image the same as root posts.
- **Editing is in scope now** (Q8): reverses the "still a flat no?" framing — posts (and, per Round 2's phrasing, presumably replies too — Round 3 should confirm root vs. reply/image scope) can be edited, and an edited post shows a visible "edited" marker. This needs a real field on `ForumPost` (an `editedAt`/`updatedAt` timestamp) that didn't exist before.
- **Deleted-but-quoted gets a distinct, muted treatment** (Q9): a quote whose original has since been deleted still displays (per Q1's caching), but styled gray/muted instead of the normal accent tint — visually marking "the thing this quotes is gone" without pretending it never existed.
- **Mert expects Round 3 to be the last** (Q10): scope Round 3 tightly around what's still genuinely unresolved — the exact grid-card anatomy, what triggers expand vs. a false-positive click on a like/name, in-popup quote mechanics, how far editing reaches (root post? image swap?), whether an edit counts as "activity" for the bump-to-top sort, and the feed card's like-button shape — rather than padding it out.
