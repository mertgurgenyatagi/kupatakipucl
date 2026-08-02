# Great Leap — Round 5 answers

## The home grid, laid out for real

**Q: League table fixed-size, the graph wide-and-short, the other four (chat, forum, mini-leaderboard, upcoming matches) roughly equal. If you picture the whole page as a rectangle — where does each of the six actually sit? Top row / bottom row, does the graph run as a full-width strip somewhere, is the league table pinned to one side spanning multiple rows? Describe it however comes out easiest.**

Your problem.

**Q: The rank-history graph itself — plain line chart with one line? Does hovering show your exact rank on a given matchday, or is it meant to be read at a glance with no interaction at all?**

Hover effects would be nice.

**Q: One row of the mini-leaderboard — what's actually on it? Avatar, name, points, rank number, all of it? Any up/down indicator showing whether someone moved since the last matchday, or just a static current snapshot?**

All of it. Static.

## Actually building a bracket pick

**Q: This is a genuinely new interaction, not a re-skin of the 36-team ranker. When someone's making a pick for one matchup, how do they do it — click one of the two team crests/names to advance them, drag a team into a "winner" slot, something else? Describe however you're picturing the actual click/tap.**

Since it's going to be a full page thing, probably 8 teams on the left and 8 teams on the right makes the most sense (Not on the home and leaderboard though.). They click, it moves through. So on and so forth.

**Q: Does the submission screen show the entire 15-matchup tree at once (8 round-of-16 ties, then 4 quarters, 2 semis, 1 final) for the user to fill in top to bottom, or does it walk through one round at a time — pick all 8 round-of-16 winners first, then those populate the quarter-final slots, and so on?**

Yeah all of them.

**Q: You said the bracket lives "basically the same as league predictions" — does that include the same full-viewport narrative-beats intro (the fading text screens, the "cotton" transitions) before landing on the bracket itself, the way today's Predictions flow opens with a few beats before the 36-team ranker?**

Yes.

## Fitting a 15-matchup tree into a small widget

**Q: "It's just a bracket, mate" — given the full tree is 15 matchups across 4 rounds, does the small home-widget version show the whole thing compressed down, or just the current/next round's matchups with everything already-decided reduced to a simple "who's through" list?**

I think the home widget can show only the round that we are in. Like, if we're in the RO16, only show the RO16 matches and vertically cut the quarter finals, have them sort of fade out. If we are in the semis, have the quarters on the left fade and the final on the right fade.

## The data underneath

**Q: Both the mini-leaderboard and the rank graph need a per-matchday snapshot of everyone's rank to exist somewhere — nothing like that exists today, real results only ever show current state. Are you fine leaving the exact mechanics of that (when it gets recorded, where it's stored) to me, or is there a specific way you already picture it working?**

Leave it to you. Also, do you think 20 questionnaires are too much? Do you think we should cut it short or go all the way?
