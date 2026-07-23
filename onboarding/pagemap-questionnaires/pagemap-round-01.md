# Kupatakip UCL — Pagemap Intake, Round 1

Filled out via the pagemap-intake tool.

---

**1. Phase granularity.** The pagemap has three distinct phases after kickoff (league phase, pre-knockout, knockout), each split by login. The running code only knows two states total: before start and after. Should the code actually grow to match the map, or should those three columns collapse into one "started" behavior for now?

Your answer: Expand the code — the three phases should genuinely differ

---

**2. Leaderboard before kickoff.** Leaderboard is currently blocked entirely before the tournament starts. Is that still the right call, or should it be visible pre-start too, even with nothing in it yet?

Your answer: Yes, leaderboard will be entirely blocked before the tournament starts.

---

**3. Forum's one blocked corner.** Forum is open to logged-in users in every phase, and to everyone once the tournament's started. The one combination still blocked is logged-out + not-started. Keep that, or open forum to everyone always?

Your answer: Forum will be open to logged-in users in every phase, and closed to non-logged-in users in every phase.

---

**4. Team popup pre-kickoff.** Team popup has no phase- or login-based gate anywhere in the code today — it's just always openable. It's meant to show form, ranking, and match history, none of which exist before the tournament starts. Should it actually be blocked pre-start, or is showing it with empty sections fine?

Your answer: Anywhere where there are teams, the team popups are open.

---

**5. Who can open a participant's popup.** Participant popup also has no gate in code today. Once the tournament's started, should a logged-out visitor be able to open someone's popup and see their predictions/quiz answers — or should that require being logged in yourself?

Your answer: If and only if two conditions are satisfied can one view the participant popup: a) Must be logged in b) Must not be notstarted.

---

**6. What matchup_popup even is.** matchup_popup is a row on the pagemap but doesn't exist anywhere in the codebase — zero references. What's it supposed to be?

Your answer: It's not been developed yet. But it will be identical everywhere and open to anyone who can see a matchup. Same with the team popup. If there is a match and you can hover on it, you can click it and see the matchup popup.

---

**7. Matchup popup's timing.** Assuming it's some kind of per-fixture detail view once it gets built — should it be openable before the tournament starts too (just teams + kickoff time), or only once there's an actual result to show?

Your answer: Don't think matches will be viewable before the tournament starts. Pretty sure.

---

**8. Editing your profile, later.** There's currently no route to go back and edit your profile after the one-time setup gate. Is a proper "edit profile" screen worth building, and if so, should anything on it lock once the tournament starts?

Your answer: You'll be able to change your profile picture, but not your name. Both are irrelevant to which stage the tournament is in. What is relevant to the stage is the predictions. If within notstarted or preknockout, predictions are alterable.

---

**9. Stats page after league phase.** The stats page's participant widgets (age, football knowledge, agreement/disagreement, over/underperformers) are built around continuous league-phase prediction accuracy. Once knockouts start, does anything about that page actually need to change, or does it stay exactly as-is?

Your answer: The left side will change.

---

**10. Anything about the map itself.** Before we start actually filling in the 64 cells — now that the old briefing's off the table — anything about the pagemap's rows, columns, or the whole approach that feels off or missing to you?

Your answer: Nope. Just confusing, but I think you will be able to help me with that!

---
