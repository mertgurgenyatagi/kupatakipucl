# Not-Started stage — what's still rough

You asked me to actually sit and think about the whole "not started" experience (logged out home, logged in home, forum, signup, profile) and tell you what's lacking — ignoring mobile and ignoring the fact that it's all fake data right now. Here's the honest list, roughly biggest-deal-first. Nothing here is urgent-urgent, just stuff I'd want to know about if it were my site.

## The stuff I'd actually fix

**1. Signup has no back button. Anywhere.**
It's 11 steps: welcome → photo → name → age → 5 quiz questions → done. If you fat-finger your age, pick the wrong Süper Lig team, or grab the wrong photo, there is no way to go back and fix it mid-flow. Your only options are "live with it" or delete your whole account and redo everything from scratch.

**2. And once you're done, you can't fix it after either.**
Your name is locked forever — no edit button, anywhere, by design. Same for all 6 quiz answers (age, football knowledge, Messi/Ronaldo, Süper Lig team, UCL team, device) — they show up on your profile as read-only text forever. So: no back button during signup, and no edit button after. A single wrong tap is permanent. Only your photo and your league prediction can actually be changed later.

**3. Two identical sign-in buttons on one screen.**
The logged-out home page (now that it's one screen) has a "Google ile giriş yap" button on the left, and the exact same button again on the right, both doing the exact same thing. It's not broken, but it looks like it might be — like a bug where a section got duplicated.

**4. The favicon is probably invisible.**
The browser tab icon is a solid black version of the logo. If anyone's browser or OS is in dark mode (extremely common), that icon will basically disappear into the dark tab bar — the exact same "black-on-black" mistake we just fixed for deleted-account avatars, just in a spot we hadn't touched yet.

**5. No link preview if this gets shared.**
There's no title/description/image set up for when a link to the site gets pasted into WhatsApp, Discord, iMessage, whatever. Right now it'd show up as a bare, ugly link with nothing — no image, no blurb. For a site whose whole growth plan during "not started" is "get your friends to sign up," that's exactly the moment this matters most.

**6. One English sentence in an otherwise all-Turkish site.**
If you hit a page you're not allowed on yet (like a logged-out visitor typing in `/profile` directly), it just says "This section isn't available right now." in English. Every other message on the whole site is Turkish. This one reads like a leftover placeholder that never got translated.

**7. Blank white flash on first load.**
For a moment while the site figures out if you're logged in, it shows literally nothing — no spinner, no logo, just blank background. It's quick, but it's the very first thing anyone sees when they open the site, so it's worth a beat of "did this load or not."

**8. Nothing catches a crash.**
If any part of the app throws an error while rendering, the whole thing goes blank white with no message at all — no "something broke, refresh the page." Hopefully never happens, but right now there's zero safety net if it does.

## Stuff that's "working as designed" but might still be worth a second look

**9. The countdown is just for show — it doesn't actually start anything.**
The site doesn't switch out of "not started" mode because a clock hits zero. It switches because you personally flip a setting. So if there's ever a gap between the countdown hitting 00:00:00:00 and you actually flipping that switch, anyone looking at the homepage in that window sees a countdown frozen at all-zeros, which really does look broken even though nothing's wrong. Just something to be aware of on the day.

**10. The "36 takım. 55 katılımcı." number in the big headline is fake — on purpose.**
It's a "slot machine" effect that climbs and resets randomly, and it's deliberately NOT the real signup count (the code comments say so explicitly). Meanwhile two lines below it, the real count shows up correctly ("52 kişi katıldı"). So on the same screen you can see two different participant numbers. I get why it's there (it makes the page feel alive), but a sharp visitor comparing both numbers might think something's wrong, or feel a little tricked. Worth a gut check on whether it's worth the risk.

**11. Ranking all 36 teams might be a pain to actually do.**
The drag-and-drop list for ranking teams is the single most important interaction on the entire "not started" stage — it's the whole point. I didn't get to fully test whether dragging a team from the bottom of the list to the top auto-scrolls the list for you. If it doesn't, moving a team 30 spots means drag, let go, scroll, drag again, over and over. Worth actually testing this with a real drag before launch, since it's the one interaction every single participant has to do.

## Smallest thing on the list

**12. Nav bar is in English, everything else is in Turkish.**
"Home", "Forum", "Leaderboard", "Stats" — those four words are the only English left in the whole nav, on an otherwise fully Turkish site. This one might genuinely be intentional (looks deliberate in the code, not a leftover), just flagging it so it's a choice and not an accident.

---

Not on this list because you told me to skip them: anything mobile-related, and anything that's only "wrong" because the data is currently fake/placeholder.
