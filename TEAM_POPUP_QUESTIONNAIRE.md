# Team Popup Rework — Questionnaire

Based on the hand-drawn wireframe (Arsenal, Mikel Arteta, full pitch, three
ranked-list labels, two bottom boxes). The current build (`TeamPopup.tsx` on
the `team-popups` branch) is a photo-backdrop profile tab + pitch diagram +
top-scorer/assister stat pair + a "who predicted this team" list + a
tucked-away match history — several of these visibly don't match the sketch,
so rather than guess I'm asking directly. Answer inline (replace the blank
after "Your answer:") or just reply in chat with the numbers.

Multiple-choice questions list lettered options, but free text always works
instead — the letters are there to make answering faster, not to box you in.

---

## A. Header / profile tab

**1. Rank format.** The sketch shows a bare `#4` — a hash prefix, not the
"SIRA / 15" label-over-value pair the current build uses. Which do you want?

a) `#4` style — hash prefix, no separate label
b) Keep the current "SIRA" mono label above the number
c) Something else (describe)

Your answer: a. Exactly as I have drawn it.

---

**2. Points format.** Same question for the `27` next to it — is that
points, and should it also drop its label the same way?

Your answer: Exactly as I have drawn it.

---

**3. Size.** The sketch draws `#4` and `27` noticeably large — bigger than
the crest/name area next to them. Should these be the single most visually
prominent numbers in the whole popup (bigger than the team name), or just
"a bit bigger than the current build's small mono figures" bigger?

Your answer: Same vertical size as the team crest. Also, unrelated golden rule: My layout dimensions are exactly as I want it.

---

**4. Form guide.** The current build shows a 5-pill G/B/M form strip in the
header. It's not in the sketch at all. Drop it, or keep it somewhere (and if
so, where)?

a) Drop it entirely
b) Keep it in the header, just not sketched
c) Move it elsewhere (e.g. folded into the match-history box)

Your answer: a.

---

**5. Photo backdrop.** The current build blurs the team's stadium photo into
the header background (mirroring the participant popup's own photo
treatment). The sketch is plain paper, no annotation either way. Keep the
photo backdrop, or go with a plain/flat header background instead?

Your answer: Lose the stadium thing. Use the team crests blur enlarge.

---

**6. Manager label.** Sketch just writes "Mikel Arteta" under the team name,
no label. Current build prefixes it "TEKNİK DİREKTÖR ·". Drop the label and
just show the bare name?

Your answer: Drop the label. Exactly as I have drawn it.

---

## B. Starting XI pitch diagram

**7. Full pitch vs. half pitch.** Current build draws a half-pitch (just the
attacking third, goalkeeper at the bottom edge) so there's room for the
diagram to sit in a compact widget. The sketch draws a **full pitch** — both
penalty boxes, a center circle in the middle, with players clustered mostly
in the upper half. Do you want the full pitch (meaning the widget needs to
be noticeably taller to give it room), or is the half-pitch fine and the
sketch just drew a full pitch out of habit?

Your answer: Full pitch, exactly as I have drawn it. Yes the widget will be taller.

---

**8. What the dots mean.** In the sketch, the dots aren't evenly spread
across the whole pitch by formation line (like the current build's GK/DEF/
MID/FWD row grouping) — they look bunched toward the attacking third with a
gap in midfield. Should the diagram literally reflect the dummy formation's
own line counts (current behavior), or is it meant to be a rougher,
stylized "shape" that doesn't need to precisely match a real formation?

Your answer: It's 4-2-3-1.

---

**9. Player identity on the diagram.** Current build shows a jersey number
in each circle, full name on hover only (a native tooltip). Sketch shows
plain dots, no numbers or names at all. Keep numbers-in-circles, go
fully blank dots, or show names directly (would need more room)?

a) Keep numbers in circles, name on hover (current)
b) Blank dots, no numbers, name on hover
c) Show short name/initials directly next to each dot, no hover needed

Your answer: See image attached to my "filled" response. For dummy data, now and going forward, don't stress it too much. WHenever we need an API for real data, just write some shit, don't waste time on that stuff. Use solid colors etc.

---

## C. The three ranked lists (Top scorers / Top assisters / Top players)

**10. Confirm the scope change.** The current build shows one top scorer +
one top assister as a simple stat pair (photo, name, number). The sketch
labels three separate things — "Top scorers", "Top assisters", "Top
players" — each implying a **list of multiple players**, not just #1.
Confirming: replace the stat-pair with three real ranked lists?

Your answer: Yes. Actually, we have built something like this, but shelved it. Fİnd it.

---

**11. "Top players" — what is it ranked by?** This one doesn't exist in the
current build at all. The sketch just says "Top players." Is this a
1-10-ish overall rating (à la FIFA/whoscored player ratings), and if so
should it use the same 1-7 scale the pre-tournament survey already uses
elsewhere on the site, or a fresh 1-10 scale?

Your answer: Rating. Will be in API.

---

**12. List length.** How many players per list — top 3, top 5, or the whole
squad sorted (scroll to see more)?

Your answer: 3 only, no scroll.

---

**13. Layout.** Three separate widget blocks stacked/side-by-side, or one
widget with a tab/toggle to switch between the three lists?

a) Three separate blocks
b) One block, switchable (tabs or a small toggle)

Your answer: EXACTLY AS I HAVE DRAWN IT.

---

**14. Data source.** Like the rest of the squad-level content, there's no
real per-player data anywhere in this app — these would be deterministic
dummy data (stable per team, not reshuffling on reload), same approach as
the current top-scorer/assister/manager/XI. Confirming that's still fine
here too, including for "top players" ratings?

Your answer: Dummy, no time wasted. No real data needed.

---

## D. The two bottom boxes

**15. The name+number list (bottom-left).** This is the one box I genuinely
can't place. It sits under the pitch diagram and lists names with small
numbers next to them (Pınar Doğan 2, İbrahim Polat 2, Ali Kurt 7, Ahmet
Yılmaz 1). What is it?

a) The current build's "who predicted this team" list (every participant's
   predicted finishing position for this team, sorted most-bullish-first,
   clicking one opens their own popup) — just drawn with placeholder
   numbers/names in the sketch
b) A squad appearances/cards/some-other-stat tally
c) Something else entirely (describe)

Your answer: A. The person first in the leaderboard is first here. It's scrollable. Keep it minimal. Glow green for accurate.

---

**16. Match history — always visible now?** Current build tucks match
history behind a textless chevron toggle (closed by default, "needs to be
tucked away somehow" per the original brief). The sketch just shows a
handful of match rows directly, no collapse affordance drawn. Should match
history now always be visible (no more tucking away), or did the sketch
just skip drawing the collapsed state?

Your answer: Exactly as I have drawn it. At the top, upcoming one match. Under it, scrollable, previous matches going backwards in time. 

---

**17. Match row icons.** Each match row has a small icon before the opponent
name (looks like a plain box on one row, a shield/badge shape on another) —
is that a home/away indicator, or something else (e.g. competition badge,
match-status icon)?

Your answer: Crest.

---

**18. Match row detail.** Each row ends in a small dot after the score. Is
that meant to be clickable — e.g. opening a bigger match-detail popup per
DESIGN-SPEC.md §55a ("for matches, probably big popups") — or just a
decorative bullet?

Your answer: Green for won, gray for draw, red for loss.

---

## E. Carrying over from the current build

**19. The crest easter egg.** Clicking the crest 5 times currently flashes
the site's accent color to the team's real color for a few seconds
(DESIGN-SPEC.md §46's own filed-for-later idea). Not shown in a wireframe
sketch (it wouldn't be — it's a hidden interaction). Keep it?

Your answer: Absolutely get rid of it.

---

**20. Overall size.** Fitting a full pitch, three ranked lists, and two
bottom boxes is a lot more content than the current build's four regions.
Is a taller/wider popup fine (more scrolling within it), or should something
here get cut to keep it roughly the size it is now?

Your answer: Taller.

---

EXACTLY AS I HAVE DRAWN IT. DO NOT DEVIATE.