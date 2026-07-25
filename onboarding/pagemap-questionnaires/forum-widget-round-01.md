# Kupatakip UCL — Forum Widget Questionnaire, Round 1

Scoped to the Forum cell on logged-in Home (not the full `/forum` page). Filled out via the forum-widget-intake page; clipboard copy failed in-page (Artifact preview sandboxing), so answers came back as pasted page text instead of the pre-formatted export — transcribed below against each question.

---

**1. Replies count as activity, or only new threads?**

Your answer: Reply bumps it to the top. (See also Q6 — Mert treated these as the same question; recorded as one decision below.)

---

**2. Show a reply count on each row?**

Your answer: Yes.

---

**3. Thumbnail when a post has a photo?**

Your answer: Yes.

---

**4. Is four posts the right number?**

Your answer: Make it three.

---

**5. How much of each post to preview?**

Your answer: Makes sense. (Keep the current two-line clamp.)

---

**6. Does a new reply bump a thread back to the top?**

Your answer: "Isn't this the same as Q1? In any case, use your own judgement. I trust you." — Combined with Q1: a reply counts as activity *and* bumps the thread to the top. One behavior, not two decisions.

---

**7. Live updates, same as chat?**

Your answer: Not real time at all.

---

**8. Unread marker?**

Your answer: No need.

---

**9. An "X new posts" banner?**

Your answer: No need.

---

**10. "Who's around right now"?**

Your answer: No need [on Forum], maybe for chat. (Not in scope for this round — a chat-widget idea for later, not requested now.)

---

**11. Quick-reply, without leaving Home?**

Your answer: No.

---

**12. A "start a discussion" button, right in the cell?**

Your answer: You go to forum first.

---

**13. Edit or delete your own post, from the widget?**

Your answer: No.

---

**14. Reactions — asking on the record, not assuming.**

Your answer: Likes is fine actually. — Explicit override of the site's usual no-gamification default; a real, deliberate exception, not an oversight.

---

**15. A search box, scoped to the forum?**

Your answer: Once on the page. (Search, if it ever gets built, lives on the full `/forum` page — not the widget.)

---

**16. Your threads first, or everyone's, always?**

Your answer: Everyone's, always.

---

**17. Tabs or filters inside the widget itself?**

Your answer: No.

---

**18. A "most talked about" view?**

Your answer: "Honestly I leave that whole shebang to you. I'm not sure how to handle it." — Claude's call: skip it as a separate view/tab (Q17 already said no tabs); the Q1/Q6 bump-on-reply sort already surfaces active threads without adding a second sort mode.

---

**19. Pinned posts?**

Your answer: No.

---

**20. Does any of this reach the real /forum page too?**

Your answer: No implementation at all on it at this moment. (Everything in this round is Home-widget-only. `/forum` stays bare/untouched.)

---

**21. Categories or tags — ever?**

Your answer: No.

---

**22. Does the widget change shape across the season?**

Your answer: No.

---

**23. The blunt-voice test.**

Your answer: Keep it professional. (Reads as: the one thing said yes to — likes — should stay a plain count/toggle, not a flashy animated interaction; matches the site's existing restraint elsewhere.)

---

**24. Anything else.**

Your answer: Nope.

---

## Net decisions for implementation

- Reply activity bumps a thread to the top of the widget's "recent" order (replaces pure created-at sort).
- Each preview row shows a reply count.
- Show an image thumbnail when `imageURL` is set.
- Show 3 posts, not 4.
- Keep the 2-line text clamp.
- No live/real-time updates — stays fetch-on-visit.
- No unread dot/badge, no "new posts" banner, no presence indicator.
- No quick-reply, no in-widget "start a discussion," no edit/delete from the widget — all of that stays `/forum`-only (and `/forum` itself isn't getting any of it yet either).
- **Likes/reactions: yes** — new scope, not something that existed anywhere in the app before this round. Kept plain/factual per Q23, not flashy.
- No search, no personalization, no filter tabs, no "most talked about" view, no pinned posts, no categories, no phase-based reshaping.
- Everything above is Home-widget-scoped only; `/forum` itself is untouched.
