# Kupatakip UCL — Isolated Expansion, Round 10

Filled out via the isolated-expansion questionnaire tool.

---

## Endgame

**1. After the final.** Once the tournament is fully over and a champion is decided, what should Home show? There's no defined state for this yet — right now the spec only covers not-started, league phase, pre-knockout, and knockout.

Your answer: Just leave it as is.

---

**2. Missed a pick.** If someone didn't submit a knockout pick before the deadline, how should that show up in the match/participant popups?

Your answer: Just blank/greyed out — "no pick made"

---

**3. Top/bottom of the standings.** The "leaderboard neighborhood" widget centers the viewer with two names above and two below. What happens if the viewer is ranked #1 or #2 (or near the very bottom), where there aren't two names on one side?

Your answer: Shift the window so it's still always 5 rows total, viewer off-center

---

## Bracket & live data

**4. Bracket byes.** Does the knockout bracket ever need to handle an odd number of teams or byes, or is it always a clean bracket (16, 8, 4, 2)?

Your answer: Always clean, no byes needed — don't build for it

---

**5. Live-updating scores.** During a live match, should Home/Leaderboard update automatically as it happens, or is it fine for now if people have to refresh the page to see updates?

Your answer: Manual refresh is fine for this pass

---

**6. Logged-out Home ordering.** Logged-out Home carries both the league table/bracket and everything else. Once knockout starts, how should the bracket and the rest of the page relate?

Your answer: Not sure what you mean by "stacked". Before knockout starts, there's only the league table. After knockout starts, there's only the league bracket. (plus the other widgets etc)

---

## Content & wiring

**7. Hero carousel content.** Who or what decides which player photos show up in the hero carousel — is this something you'll manually pick/update per tournament, or should it be pulled automatically from team/player data?

Your answer: The carousel is built.

---

**8. New special-lobby button.** The "create new special lobby" button on Home — does it just link into the special-lobby flow that's already built, or does it need something new specifically for Home?

Your answer: Just links into the existing flow, nothing new needed

---

**9. Widgets of different lengths.** In the grid, some widgets naturally have more content than others (chat vs. upcoming-matches, say). Is it fine for cards to be different heights, or should they all be forced to match?

Your answer: Make it like a jigsaw puzzle. It can be asymmetric but the grid should be gridded.

---

**10. Anything else that needs to exist.** Stepping back — is there anything else, however small, that needs to exist (not necessarily look good) before this counts as built?

Your answer: Nothing comes to mind

---
