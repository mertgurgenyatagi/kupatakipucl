# Kupatakip UCL — Isolated Expansion, Round 11

Filled out via the isolated-expansion questionnaire tool.

---

## Running the tournament

**1. Entering match results.** Right now, there's no real way to enter match results — a developer test panel fakes them by editing the database directly. For an actual tournament, how should real results get in?

Your answer: Skip.

---

**2. Switching tournament phases.** Moving the tournament forward (not-started → league phase → knockout, etc.) currently means flipping a value by hand in the database console — there's no button anywhere in the app. Keep it that way, or build a real switch?

Your answer: Skip.

---

## Leaderboard & deadlines

**3. Tied scores.** Right now, if two people have the exact same points, they just share the same rank number (like two people both showing "3rd") — nothing breaks the tie. Good enough, or should something decide who ranks higher?

Your answer: Number of correctly predicted teams (league + knockout). If still a draw, then it's a draw.

---

**4. When predictions lock.** Predictions currently lock all at once for a whole phase (e.g. every league-phase pick locks together), not match-by-match. Is that correct, or should each match/tie lock separately right as it kicks off?

Your answer: Whole-phase lockout is correct, keep it

---

## Lobbies

**5. Being in more than one lobby.** People can join up to 3 special lobbies and own up to 3 more. When someone's in several at once, how should Home/Leaderboard/match popups decide which lobby's data to show them?

Your answer: Most recently created/joined lobby always.

---

**6. Match popup + multiple lobbies.** The match popup's name list was scoped to "the viewer's own lobby." If someone's in several lobbies, which names should it show?

Your answer: See above.

---

## Forum & chat

**7. Forum moderation.** Right now, people can only delete their own forum posts — there's no admin tool and no report button. Fine for launch, or does something need to exist first?

Your answer: Fine as-is, self-delete only

---

**8. Chat moderation.** Same question, for the chat widget — self-delete only, no moderation or reporting exists. Fine, or needed?

Your answer: Fine as-is, self-delete only

---

**9. Signing in after signups close.** Once signups close, should people still be able to create accounts and sign in (just unable to actually participate), or should sign-in be blocked entirely at that point?

Your answer: Block sign-in entirely once closed

---

**10. Anything else that needs to exist.** Same closing question as last round — stepping back, is there anything else, however small, that needs to exist before this counts as built?

Your answer: Keep the questionnaires coming.

---
