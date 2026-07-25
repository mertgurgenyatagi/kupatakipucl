# Kupatakip UCL — Chat Widget Questionnaire, Round 1

Scoped to the Sohbet cell on logged-in Home — unlike Forum, this *is* the whole chat (no separate `/chat` page to defer anything to; that route is gone, see "Net decisions" below). Filled out via the chat-widget-intake page (same "team sheet" format as forum-widget-round-01), 24 questions, answered in full.

---

**1. Should Chat's cell get more room than its two siblings?**

Your answer: Place a hero carousel between Forum and Sohbet, and then, make the width of Katılımcılar, Forum and Sohbet equal. — Redirected the question: not a wider Chat cell, but the long-pending hero carousel (PAGEMAP_SPEC §3, "confirmed still belongs there" since round 6, never actually built for Home) finally added as a fourth cell. Follow-up mid-build: 60% of an equal quarter-share for the carousel, the other three splitting the rest evenly (not a plain 4-way split).

---

**2. The whole history loads at once — fine, or cap it?**

Your answer: Cap it.

---

**3. Date dividers for a long scrollback?**

Your answer: Always date dividers. It should function like a WhatsApp or an Instagram chat.

---

**4. Per-message timestamps?**

Your answer: Yes.

---

**5. A typing indicator?**

Your answer: Yes.

---

**6. Read receipts?**

Your answer: No.

---

**7. "Who's online right now"?**

Your answer: Number of online people at the header is fine.

---

**8. A signal for activity you missed?**

Your answer: No.

---

**9. Sound or browser notification for a new message?**

Your answer: No.

---

**10. Emoji reactions on messages?**

Your answer: No.

---

**11. Photos in chat?**

Your answer: No.

---

**12. A GIF or sticker picker?**

Your answer: No.

---

**13. Multi-line messages?**

Your answer: Yes.

---

**14. @mentions?**

Your answer: Yes.

---

**15. Edit a sent message?**

Your answer: No.

---

**16. Delete or unsend a message?**

Your answer: Yes.

---

**17. A message length limit?**

Your answer: Yes. 360 chars. Only "warns" or displays once it enters the 300 zone.

---

**18. Slow mode for a burst of activity?**

Your answer: No.

---

**19. Report or mute a fellow participant — asking on the record.**

Your answer: No.

---

**20. A pinned message?**

Your answer: No.

---

**21. The matchday question.**

Your answer: No.

---

**22. Search within chat history?**

Your answer: Yeah, but you need a button to open the searchbar.

---

**23. The blunt-voice test — flipped.**

Your answer: Keep it professional.

---

**24. Anything else.**

Your answer: Nope.

---

## Net decisions for implementation

- **Hero carousel** (Q1): built for Home for the first time — reuses `leaderboard/HeroCarousel.tsx` as-is, no new component. Sits between Forum and Sohbet in the cell row at 60% of an equal quarter-share (9fr of a 17/17/17/9 split); the other three cells split the remaining 85% evenly rather than a flat 4-way equal split.
- **History cap + pagination** (Q2): the live listener only watches the most recent 50 messages; a "Daha eski mesajları yükle" button fetches older pages on demand (one-time fetch, not live).
- **Date dividers + timestamps + grouping** (Q3/Q4): "Bugün" / "Dün" / a real date between days; every message shows a time; consecutive messages from the same sender within 5 minutes collapse into one visual group (WhatsApp/Instagram-style), still each individually deletable.
- **Typing indicator** (Q5): a plain "Ada yazıyor…" line above the composer, backed by a short-lived per-user Firestore doc (`typingStatus/{uid}`) with a client-side staleness check rather than an explicit "stopped" signal in most cases.
- **No read receipts, no unread signal, no sound/browser notifications** (Q6/Q8/Q9): none of these were built. Auto-scroll-to-bottom on new messages stays exactly as it already worked.
- **Online count** (Q7): a live "N çevrimiçi" count in the Sohbet cell's navy header, backed by a periodic per-user heartbeat (`presence/{uid}`, same staleness approach as typing) — this project runs Firestore, not Realtime Database, so there's no server-side disconnect signal to lean on instead.
- **No reactions, no photos, no GIFs/stickers** (Q10/Q11/Q12): all declined, despite DESIGN.md's carve-out for chat/forum as the site's one "genuinely loose" outlet — Q23 confirms this was a deliberate restraint call, not an oversight.
- **Multi-line composing** (Q13): the input is a real auto-growing `<textarea>` now; Enter sends, Shift+Enter inserts a line break.
- **@mentions** (Q14): typing "@" opens a filtered autocomplete of participants; picking one inserts "@FirstName"; the mentioned uid(s) are stored on the message (not just the text) so "does this mention me" stays exact even if two participants share a first name; a message that mentions you gets a faint amber tint, distinct from the brass tint on your own messages.
- **No message editing** (Q15): not built.
- **Delete/unsend own messages** (Q16): a sender can soft-delete their own message; it leaves a plain "Bu mesaj silindi." placeholder rather than vanishing cleanly (matches the blunt/factual voice, and avoids a message just silently disappearing from a shared scrollback). **This reverses SPEC.md §6's original "permanent scrollback... no edits or deletes, ever, by anyone"** — noted in PAGEMAP_SPEC.md's changelog since that was a standing DECIDED item. Still nobody can touch anyone else's message, and still no editing.
- **360-character cap** (Q17): hard-capped via the input's own `maxlength`; a counter ("312 / 360") only appears once you're past 300 characters, not before.
- **No slow mode** (Q18) and **no matchday-specific behavior** (Q21): both declined — confirms DESIGN.md's "don't treat matchday as a different mode" Don't extends to chat behavior, not just visual skin.
- **No moderation/report/mute** (Q19) and **no pinned messages** (Q20): both declined.
- **Search** (Q22): a search icon toggles an inline search bar in the chat cell; since `/chat` is gone there's no fuller page to defer this to, so it does a one-time full-history fetch filtered client-side (no real search index — this app's whole season history is small enough that this is the honest simple option, not a placeholder for something bigger).
- **Voice/tone** (Q23): kept restrained throughout — no animated typing dots, no pulsing presence indicator, no flashy delete/mention treatment. "Professional" overrides chat's usual license to be the site's loose exception.
- **`/chat` route finally deleted** (unprompted, surfaced while implementing the above): `ChatPage.tsx` was still live code, even though its removal had been marked DECIDED across five separate pagemap rounds (2026-07-24 rounds 2 through 9) once Chat became a Home widget. It never actually got deleted until `ChatRoom`'s prop signature changed enough (this round) to break it at compile time. Removed the page, its test, the `/chat` route in `App.tsx`, both "Chat" nav-bar entries in `AppShell.tsx`, and the `"chat"` `PageKey` from `pageAccess.ts` (plus the tests referencing all of it) — the nav bar now matches what PAGEMAP_SPEC §6 has said it should be all along (Home/Leaderboard/Forum/Stats for logged-in, just Home for logged-out).
