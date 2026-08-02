When you say "build 90% of the remaining everything" — what does the last stretch actually look like? Is there a moment, a date, a feeling that tells you this is done enough to stop touching before Sept 8?
Not quite sure what you mean, but by that remaining 10 percent I mean: real data fetching, some other scraping business, the stats page (is going to be completely gutted and redesigned, but not in this 90 percent), a full optimization check and a full security check and finally a timed phaser rather than manual switching of rounds
02
Of everything flagged in PROJECT_STATE.md's rough-edges section, which single thing actively embarrasses you every time you open the app? And which one, on the flip side, you genuinely don't think about at all?
Embarrases me: how little everything beyond "not started" is populated, despite the hardwork already being done. 

Don't care: UCL teams and crests. Waiting for the teams to be determined, then it's super easy.
03
Is there anything not written down anywhere in PROJECT_STATE.md — a feature, a fix, a whole page — that's been sitting in your head that I'd have no way to know to ask about?
I didn't read it.
B
Home, once the tournament actually starts
04
Right now the "started" home page is two literal bracketed placeholder strings. Walk me through what a signed-in friend should see on day 1 of the league phase — what's the first thing they're looking for?
The following widgets, all seperate and all fitting like jigsaw pieces in a grid structure:

Chat
Forum widget
League table
Mini-leaderboard (shows 5 people. at the center is our user, and the upper two and lower two are the four people next to him)
05
What about someone who's signed out and it's already started — are we still trying to pull them into signing up somehow, or is signup just closed and this is purely a spectator view at that point?
Sign up is completely closed the moment the league phase starts.
C
The promised second prediction
06
The predictions intro copy explicitly promises a second, knockout-round prediction — nothing behind it exists in code. Is this still happening for real this season?
Yes.
07
If it is happening — what should someone actually be submitting? A bracket, a per-round pick, something else? Take a swing at describing it even roughly, we can refine later.
A bracket. One and done.
D
Results, admin, and the rank-history gap
08
Results are hand-typed into Firestore right now, no admin UI exists anywhere. Given this is a real push — do you want a proper admin panel this time, or is console-editing fine to just keep forever since it's only ever going to be you?
Leave it to the last 10 percent.
09
There's currently no way to show anyone's rank moving over time in production — only their current rank. Is that a real gap participants would notice, or is current rank genuinely enough?
Not quite sure what you mean.
E
Data that's currently fake
10
The Stats page's "UCL Takımı" chart is 100% hardcoded despite the real survey field existing since day one. Anything actually blocking that from being wired up for real, or just hasn't been gotten to?
Stats page is in that 10 percent.
11
Team crests are deliberately, randomly mismatched right now, on the logic that "the whole team list will be totally replaced anyway." Replaced with what, and does that swap need to land before the Aug 26 team-lock date?
Teams will be determined sometime in mid august, and I'll replace them manually. As stated far above, it's super easy.
F
Dead weight
12
There's a pile of fully-built, unused code (a whole unrouted page, a couple of orphaned components, a 36-file unused asset folder). Safe to just delete all of it, or is any of it secretly earmarked for something you haven't mentioned?
Keep them for now.
13
Two components (a team-popup tuner, a stats-page tuner) are wired up via real props but the components themselves don't exist anywhere in the repo. Ring any bells about what those were for, or is that just dead plumbing to rip out?
Yeah I used some tuners but they were deleted afterwards. You can rip the plumbing out.
G
Getting it live
14
No hosting target is configured anywhere right now — `npm run build` produces a working `dist/` with nowhere to send it. Where is this actually supposed to go live, and does that need solving before Aug 26 or can it wait?
10 percent.
15
Two Firestore collections are wide-open to any signed-in writer right now, flagged in the rules file itself as "temporary until admin tooling exists." If real admin tooling gets built this round, should closing those holes ride along with it?
10 percent.
That's round 1. Answer whatever's got signal for you and leave the rest blank if you're not sure yet — vague or contradictory answers are fine, later rounds exist to work those out. Download when ready.