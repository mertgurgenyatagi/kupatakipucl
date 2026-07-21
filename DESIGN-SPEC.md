# Kupatakip UCL — Design Spec (Living)

Source of truth for visual direction as it's understood so far. Built from design-questionnaire rounds (`design-questionnaires/`), same pattern as `SPEC.md` was built from `BRIEFING.txt` + questionnaire rounds. Updated after every round — nothing here should go stale.

Status key: **DECIDED** (locked in), **LEANING** (stated but soft, or in tension with something else), **OPEN** (not yet addressed).

---

## 0. Read this first — DECIDED, governs everything below

Twice, unprompted, in two different rounds, Mert has interrupted his own answers to correct the trajectory:

- Round 5: added "a crowd of passionate football fans" to the object collection specifically to "wake you from your preconceptions."
- Round 6: on the drag-to-rank motion — *"we're not putting people through the SATs. Don't let the fun get away because of my answers."* — and again on materials — *"I'm trying to warn you against creating an FBI recruitment program. This is a game."*

Two isolated jokes would be noise. Two structurally identical warnings, in consecutive rounds, are a pattern: the accumulated executive/documentation/blunt-voice language (pen, plaque, cold hard facts, "Done.") is coherent and should stay, but it's a **shell**, not the substance. This is a game a group of friends plays together about football they love. If any concrete design decision downstream reads as corporate, institutional, humorless, or interrogation-like, that decision is wrong regardless of how well it matches the sections below — override the letter of this document in favor of this note. Section 20/26 already gestured at this; this section exists so it can't be missed or buried under 30+ other headings.

---

## 1. Register & tone — DECIDED

"Stats tool, all the way." Overrides an earlier hedge toward "hybrid" from an unstructured pre-questionnaire conversation — round 1 resolved it decisively. Serious, credible, data-forward. Personality lives in the design system (color, type, motion), not in copy or marketing-style sections.

## 2. Atmosphere — LEANING, one open tension

The "physical place" answer: *"A luxurious, classy office in NYC where the top executives are hanging out after hours, drinking whiskey."* Sophisticated, exclusive, moneyed-competitive energy.

**Tension:** that scene reads dark and moody, but Q3 explicitly picked **Light** mode, and Q10's anti-reference explicitly rules out "pessimistic shit." Working synthesis: bright, upscale executive daylight rather than a dim lounge — luxury expressed through materiality, color, and type, not through darkness. **OPEN**: confirming this reconciliation directly, and what material metaphor (wood/brass/marble/leather/paper/glass) the luxury should be built from — round 2.

## 3. Color — DECIDED

*"UEFA colors. Non-negotiable."* Direction: deep navy blue + white as the color identity.

**Dominance resolved, unprompted, round 4 Q10:** *"I feel like a 50/50 share between dark blue and white, which I kind of see it as, fits in neither [dark or light]."* Not a light UI with a navy accent — a real, roughly even split between deep navy and white as structural color, not decorative. He raised this himself, without being asked to reconcile anything — treat it as confirmed, not a hypothesis.

**Important constraint (not from the user, added for practicality/legality):** this means the *color family*, not UEFA's actual logo, starball mark, or wordmark — those won't be reproduced. Not yet explicitly confirmed with him; low-risk assumption, flag only if it becomes relevant during actual build.

## 4. Typography — DECIDED

Sharp & thin (round 1). Pairing resolved unprompted, round 5 Q10: *"Sans sometimes, serif mostly, sounds good."* Serif-led system (a sharp/thin modern editorial serif, not an old-style/humanist one — see The Telegraph reference, §1/§9's material notes), with sans used situationally for UI chrome, labels, or data rather than as an equal partner.

## 5. Motion — LEANING

Reference point is linear.app's balance: *"not extremely comprehensive animations but not totally static either."* **OPEN**: whether kupatakip should sit at "subtle only" or "a few real polished moments" (prediction lock-in, leaderboard reorder) — round 2.

## 6. Interaction restraint on the leaderboard — DECIDED

Rank changes stay quiet, no fanfare: *"Stay cool — just move the name up."* Consistent with `PRODUCT.md`'s existing anti-gamification stance (no badges/streaks) and the existing rule that confetti is reserved only for the eventual season winner, visible publicly.

## 7. Emotional target — LEANING, one open tension

Wants some "optimistic, dopamine-hit" quality — named as something linear.app *lacks* ("not giving the optimistic 'Google To-Do' energy") and something to avoid the opposite of (anti-reference: "pessimistic shit"). **Tension**: this pulls against the "stay cool" leaderboard rule (§6) if taken literally on rank changes. Likely resolution: the payoff feeling lives in smaller interactions (submitting a prediction, matchday results landing) rather than in leaderboard drama. **OPEN**: confirming where the dopamine-hit should actually live — round 2.

## 8. Non-negotiable UX principle — DECIDED

Intuitiveness above all: *"Very intuitive. We can't compromise on intuitive."* Carried over from the old kupatakip as the one thing explicitly worth keeping. This outranks any visual preference below it if the two ever conflict.

## 9. Hard anti-references — DECIDED

- No AI-slop aesthetic (aligns with `impeccable`'s own banned-pattern list — gradient text, side-stripe borders, generic eyebrows, identical card grids, etc.)
- No Awwwards-style spectacle — nothing "trying to get out of your monitor" (excessive 3D, parallax, immersive gimmicks)
- No pessimistic / dark-moody overall tone, despite the whiskey-office atmosphere cue (see §2's tension)
- Dark mode specifically disliked (named as the one thing disliked about linear.app)
- Anything not intuitive, full stop (see §8)

## 10. Broadcast vs. private club — OPEN

Round 1 Q9 (ESPN/broadcast graphics vs. Discord/private-server skin) came back "not sure." Working synthesis from the rest of the round: neither — something closer to a **private members'-club briefing** (a boutique fund's internal dashboard, a serious poker room, a clubhouse scoreboard). Confirming this is round 2 Q7.

---

## 11. Material & texture — LEANING

"Paper card stock" for buttons; "bank statement, but light" for how stats should read; a cold screenshot of the site is guessed to be "a news website." Converges hard with round 1's Telegraph reference — this isn't a glassy SaaS product, it's an editorial/print-credibility object. Numbers should read precise and understated, not commentary-flavored.

## 12. Temperature — DECIDED

"Cold." Read together with the Light-mode pick from round 1: the light background should be a true cool-toned neutral, not a warm cream/paper tone. Reinforces the navy/silver color direction (§3) rather than fighting it.

## 13. Confidence register — LEANING

The "party guest" answer: composed, magnetic, doesn't need to try — "so classy and cool" that people keep their distance. Consistent with §1 (stats tool, serious) and §2 (classy office atmosphere): the site's confidence should come from restraint, not from announcing itself. Cross-reference: the satoshiwatanabe.org callout ("creative and daring without sticking it in your face") is the same instinct applied to interaction/detail design — bold ideas, quiet delivery.

## 14. Small humanizing counter-notes — OPEN

Gently rounded corners (not sharp, not pill) and "bank statement, but light" both soften the otherwise cold/sharp/editorial read slightly. Not a contradiction to flag back — just means the palette shouldn't tip into clinical or harsh. Filed as texture, not asked about directly.

## 15. Voice / tone of writing — DECIDED

"Cold hard facts" (the feeling of getting a prediction wrong) and "a blunt fact, no apology" (error-message tone) are the same answer twice. UI copy throughout — errors, losses, empty states — should be unsentimental and factual, never apologetic or softened. Consistent with §6 (stay-cool leaderboard) and §9 (no pessimism) — blunt isn't the same as bleak; it just doesn't perform an emotion it doesn't need to.

## 16. Material, take two — LEANING

"A plaque" for touch-texture. Reads as engraved metal/stone: permanent, ceremonial, cool, formal — think a brass nameplate or an award plaque, not glass or fabric. Combined with round 2's "paper card stock," the material world forming is: crisp printed matter (cards, statements) plus cold engraved metal (plaques, plates) — a boardroom/trophy-case pairing, not a glassy SaaS one. Reinforces navy+silver (§3): silver reads as the plaque metal, not just an abstract palette choice.

## 17. Real photography — DECIDED

Yes, real player/team photos belong on the site. Not an illustration- or icon-only system.

## 18. Time of day — LEANING

"9:30 PM" — specific, not vague. Evening, but indoors and lit, not pitch dark. Adds nuance to §2/§12: this isn't a sunlit daytime boardroom: it's more like a well-lit room after dark — light mode, cold temperature, but an evening mood rather than a midday one. Worth carrying into actual lighting/contrast choices later (e.g. any imagery or hero treatment could lean toward dusk/interior-lit rather than bright daylight).

## 19. Own-brand presence — DECIDED

The site's name/logo in the header sits "between medium and huge" — it should have real visual weight, not a shy/quiet treatment.

## 20. Material, take three — DECIDED (as a set)

"Executive pen" for both the desk-object question and, unprompted, the "one thing from that office" question — he pointed back at his own Q1 answer rather than reaching for the whiskey glass. Combined with "paper card stock" (round 2) and "a plaque" (round 3), the object world is now a set, not a guess: **pen + card/paper + engraved plaque** — instruments of signing, recording, and commemorating. Reads as a private institution's documentation language (think: a serious club's membership materials, a bank's statements, an award ceremony's plaques), not hospitality/leisure objects. "Fresh car smell" (new, pristine, freshly detailed) reinforces that everything in this world should feel immaculate and new, not worn-in or vintage.

## 21. Voice character — DECIDED

"Sexy but professional" — adds magnetism on top of the blunt/factual tone from §15, consistent with round 2's "classy and cool, people keep their distance." Never gimmicky or try-hard; the appeal comes from restraint and confidence, same instinct as §13.

## 22. Objectivity — DECIDED

No secret favorite team: "strictly neutral." Reinforces §15 (blunt, factual voice) — the site presents itself as an impartial record-keeper, which also matches the pen/plaque/documentation material world in §20.

## 23. Consistency across time — DECIDED

Same mood on a random Tuesday as on an actual matchday: "Same, always." No separate "matchday mode" — one consistent system. (Live-update motion during actual score changes can still exist per §2's "a little of both" — that's animation on a fixed system, not a different system.)

## 24. The lock-in moment — DECIDED

One word for submitting a prediction: **"Done."** Flat, final, no celebration — matches §6 (quiet leaderboard) and §15 (blunt voice) precisely. The payoff isn't excitement, it's completion.

## 25. Self-presentation — DECIDED

"Modest" — picked plainly over a hedged "quietly proud" middle option. Everything else (sexy-but-professional voice, executive materials, UEFA colors) stays understated in its self-regard: confident through restraint, never boastful, no self-congratulatory UI language anywhere.

## 26. The crowd — DECIDED, important calibration

Round 5's "fourth object" answer, verbatim: *"Weird answer, it might wake you from your preconceptions: a crowd of passionate football fans."* He flagged this himself as a deliberate correction to the direction the object-collection questions (pen, plaque, car smell) were building. **This overrides nothing else in this document — it's a ceiling, not a contradiction.** The executive/documentation material language (§20) is the *surface treatment*; underneath it, this has to still read as being made by and for people who genuinely love football. If any later decision makes the site feel purely corporate/institutional with no warmth, that's a miss regardless of how well it matches the other sections. Where that warmth should actually surface: real (if muted) player photography (§1 below), the chat/forum's slight loosening (§27), and restrained matchday tension (§2) — not by softening the core voice.

## 27. Photo treatment — DECIDED

Slightly muted/desaturated, not full color, not black & white.

## 28. The one celebration, in detail — DECIDED

Confetti sound, verbatim: *"A low-end glass choir of whoosh."* Deep/bass-heavy, crystalline/layered, a sweep of air — an elegant orchestral swell, not a cartoonish jingle or a game-show sting. The single deliberate spectacle (§6/§28) should sound as restrained-but-rich as everything else looks.

## 29. Empty states — DECIDED

A quiet stretch of no activity is "just normal, no big deal" — no guilt-tripping re-engagement prompts, no anxious empty-state copy. Consistent with §25 (modest) and §15 (blunt, unsentimental voice).

## 30. Chat/forum warmth — DECIDED

Loosens up from the leaderboard's tone, but only "a microscopic bit." The personality shift between stats pages and social pages should be barely perceptible — one system with a whisper of extra warmth in the social corners, not a different skin.

## 31. Notifications — DECIDED (product-level, not just visual)

He does not want real push notifications ("first of all, no notifications") — consistent with the already-decided no-PWA-install stance (`questionnaires/round-02.md` Q10: "No need. Website is fine."). Not a new decision, a confirmation of an existing one. The hypothetical notification copy he gave anyway is a useful voice sample: *"Kuzey has taken your spot."* — name + fact, no exclamation, no editorializing. Use this as the template for any similar in-app copy (toasts, banners): subject, verb, object, done.

## 32. Dress code, refined — DECIDED

"White shirt, buttoned down slightly" — not a full suit or tux (§20's "executive" read shouldn't be taken to full stiff formalwear). Crisp and put-together, but with one degree of ease and approachability. Read together with §26 (the crowd) and §21 (sexy but professional): the register is confident-and-relaxed, not boardroom-rigid.

## 33. Site mark/icon — SKIPPED BY REQUEST

He declined to answer ("you don't want to know the answer... just skip it"), playfully. Don't re-ask; revisit only if he brings it up himself.

## 34. The crowd, located — DECIDED

"They radiate around" — the fan-passion warmth from §26 isn't confined to one section (e.g. just the forum); it should suffuse ambiently across the whole site, subtly, rather than being walled off.

## 35. Material, take four: cotton — DECIDED

Answered through a joke ("yo mama... just kidding. maybe cotton?") but the real answer stands: **cotton**. This is the material bridge §0 needs — soft, warm, casual, literally what a fan's jersey or scarf is made of — the human counterweight to pen/plaque/paper's cold precision. The material world is now: crisp paper + cold engraved metal + soft cotton. Institutional shell, human substance.

## 36. Interaction feel — DECIDED

Dragging teams to rank them should feel "floaty" — light, a little playful, not heavy or mechanical. Consistent with §0: precision doesn't mean rigidity.

## 37. Ambient sound character — DECIDED

Electronic/ambient as a constant background register — distinct from §28's one-off celebration sound (glass-choir/orchestral). Everyday = electronic/ambient; the one big moment = richer and more orchestral. Not a contradiction: a signature moment is allowed to sound different from the wallpaper.

## 38. Tagline voice sample — DECIDED

*"50 PARTICIPANTS. 36 TEAMS. ONE TROPHY."* — all-caps, three short declarative fragments escalating to a climax, grounded in real numbers (not placeholder copy — matches `PRODUCT.md`'s "specificity over placeholder tone" principle). Use this as the template for any headline-style copy: short, factual, escalating, real numbers over abstractions.

## 39. Navigation — DECIDED

Always visible, pinned in place. Not a hide-on-scroll pattern.

## 40. Forum mechanics — factual note, not a vibe answer

Q7 asked for an atmosphere/scene and got a literal technical fact instead: "the forum is refresh/step-away-from-page only" — i.e. not live-updating in real time. Worth carrying into implementation (no real-time-arrival animations needed there), but not design-taste signal.

## 41. Seasonal consistency — DECIDED

Confirmed: the site looks the same in September, January, and March. Extends §23 (same on matchday vs. weekday) to the full calendar — one consistent system, no seasonal reskins.

## 42. Where the fun actually lives — DECIDED, refines §0

Round 7 Q2: "The chat. We don't need to go wild somewhere else." This gives §0's warning a concrete shape rather than leaving it diffuse: the chat is the designated outlet for looseness/banter (§1 pre-match ritual: "trash-talking in the group chat"; §8 fan chaos: "Banter?"). Everywhere else (leaderboard, predictions, stats) can stay composed and editorial *because* the chat exists as the release valve — this doesn't mean sprinkle whimsy across every page, it means don't make the composed pages feel sterile or humorless while the chat carries the actual fun. §30's "microscopic bit" of chat looseness may undersell it slightly; treat chat as allowed to be genuinely warm/bantery, not just barely-different.

## 43. Motion, decided for real — DECIDED, supersedes the open motion question

Verbatim, round 7 Q10: *"Moving things around and switching pages and all sorts of interactions should feel fade-y, floaty and smoothy and cottony."* This resolves motion energy directly (no more "subtle vs. choreographed" ambiguity) and ties §36 (floaty drag) and §35 (cotton material) into one unified motion language: soft, floaty, smooth transitions — page changes, list reorders, everything — should feel like fabric settling, not mechanical snapping into place. Cross-reference §37 (electronic ambient ballast, orchestral-glass celebration) for sound to match.

## 44. Depth of content — DECIDED, real scope note (not just visual)

Verbatim: *"I want something very extensive. Clicking on matches should bring up stats, predicted lineups, top scorers, all sorts of information. There should be tournament stats elsewhere, xG stats, the whole nine yards."* He flagged this himself as "more of a build thing in general" rather than a pure design-taste answer. **This is a real scope expansion, not settled just by writing it here** — match-level drill-downs (lineups, top scorers, xG) and tournament-wide stats likely require a live data source beyond what's currently built (results are manually entered via the dev panel; `SPEC.md` still lists live-results sourcing as an open research item, and §7/results-automation was explicitly skipped). Visually: this means match/stat detail views should be designed for real density and drill-down (a serious stats-terminal feel on those specific screens), even though the overall chrome stays restrained — "stats tool, all the way" (§1) was always the register; this just confirms he means it literally, not just tonally. **Flag data-sourcing feasibility as a real conversation before committing to xG/lineup-level depth** — don't silently scope-creep into promising data that may not be obtainable for free/reliably.

## 45. Snack signal — LEANING, adds nuance to the material world

"Iced white chocolate mocha" (not espresso, not stadium nachos — a custom answer). Modern, coffee-culture, a little sweet/indulgent — extends the human/warm counterweight (§35 cotton) away from stiff old-money whiskey-office imagery toward something more contemporary and approachable. The "executive" read (§20) should skew modern-professional, not old-guard/stuffy.

## 46. A real feature idea, not just a vibe — flag for the delight pass later

Easter egg answer: *"Clicking a team repeatedly causes the entire website palette to turn to that team's colors."* A genuinely buildable, delightful hidden interaction — worth carrying forward as a concrete candidate when the `impeccable delight` pass happens on the real UI, not just filed as taste signal.

## 47. Roast line — LEANING

"Better luck next time" for the losing-side roast — plain and understated, confirms even playful copy stays restrained rather than going for an actual burn. Consistent with §25 (modest) and §21 (confident, never try-hard).

## 48. The base neutral, precisely — DECIDED

"Very very very very very very very slightly beige." Not pure white, not a cool off-white — an almost-imperceptible warm cast, emphasized seven times over to make sure the word "slight" actually lands. **Execution warning for whoever builds this (including future me):** this is NOT the same instruction as "cream/sand body background" — that's `impeccable`'s own flagged AI-default failure mode (OKLCH L 0.84-0.97, C < 0.06, hue 40-100 reading as cream/paper/parchment). Keep chroma near-zero; the warmth should be closer to "this white came from a paper mill" (ties to §11 "paper card stock") than "this is a cream-colored background." If it's identifiable as beige/cream at a glance, it's overshot.

## 49. Reference: huts.com — checked, use the words not the literal site

He named huts.com and explained why in his own words: *"I don't want something extremely simple... We want a modern website. The only difference from a modern website is it's compact and easy to intuitively understand. But absolutely sophisticated. Text sliding and fading in, small animations. Definitely not a static HTML."* I fetched the live site to ground this — it currently reads as a rural-housing marketing site: image-heavy, card-based, mostly static with minimal animation, which doesn't obviously match "text sliding and fading in, small animations, definitely not static HTML." Likely a memory mismatch on the domain, or he's picturing a different part of that product than the marketing homepage. **Treat his words as the actual reference, not the literal current huts.com homepage** — sophisticated-but-compact, real motion (text slide/fade, small purposeful animations), never static-feeling.

## 50. Motion, made concrete — DECIDED, extends §43

Specific techniques named: text sliding and fading in, small animations throughout. "Definitely not a static HTML" — a direct instruction against building anything that reads as an unanimated document. Combine with §43 (floaty/cottony/smooth character) for the *how*; this section is the *how much*: motion should be present and noticeable in normal use, not just a hover-state nicety.

## 51. Content depth, phased — DECIDED, resolves §44's open feasibility question

"Fine without it at first, add later" — the deep-stats scope (lineups, xG, tournament breakdowns) is explicitly NOT a launch blocker. Ship v1 without it, layer it in once the site exists. This substantially de-risks §44's data-sourcing concern for the initial build.

## 52. Tabular alignment — DECIDED

Neat aligned columns only where it obviously matters (the leaderboard) — not a blanket rule applied to every number on the site. Targeted precision, not uniform spreadsheet treatment everywhere.

## 53. Mobile is not a smaller desktop — DECIDED, important, elevates PRODUCT.md's existing principle

Verbatim: *"It's a completely different beast. If we're emphasizing intuition, say, 60 percent on desktop, on mobile it should be 120 percent. Design must never obscure information."* This sharpens `PRODUCT.md`'s existing "two real layouts, not one stretched one" principle into something stricter: mobile isn't just its own layout, it needs to clear a *higher* intuitiveness bar than desktop, and the one hard rule — information must never be sacrificed for visual style — applies there most of all. Treat any mobile design decision that hides or buries information behind a gesture/collapse/decorative choice as a failure, regardless of how it looks.

## 54. Finished, not visibly-MVP — DECIDED

Confirmed: whatever ships at launch should look fully polished and "done," not like a work-in-progress — even though §51 means the *scope* is phased. Phased scope, unphased craft: what exists should never look unfinished, even if less exists at first.

## 55. Desktop: real no-scroll, fixed viewport — DECIDED

The arc on this one: round 8 floated "no vertical scrolling" as a self-described "controversial" idea, with the hedge that "partial vertical scrolling will need to exist at some level." Immediately after this document logged a softened "illusion of no-scroll" compromise (persistent chrome + hidden scrollbar, real page scroll underneath), he pushed back hard: *"No. Wait. I can see the no scroll being achieved... No scroll stays on. Not pseudo no scroll, actual no scroll. We will make it work somehow."* **Landed decision, back to the original instinct, now firm:** no global page-level scroll on desktop. The fixed-viewport app-shell pattern (100vh/100dvh outer frame, nothing at the document level scrolls) with **internal scroll containers** for any region whose content genuinely exceeds its space — the leaderboard body, a long forum thread, a stats panel — this is exactly what his own round-8 hedge ("partial vertical scrolling will need to exist at some level") already allowed for, and it's a well-established pattern (Linear, Notion, Discord, Spotify all work this way), not an exotic experiment. The native browser scrollbar essentially never appears because the document itself never scrolls. Applies to desktop only — no change to mobile (§53 governs mobile separately).

**Where exactly internal scroll containers go is not a rule to spec out in advance** — his words, verbatim, after this got litigated one round too many: *"Yes to internal scrolls. No issue with those. You can't show an entire forum thread without scrolling... It's situational. I trust you. You'll handle it. No super hard concrete rules."* Judgment call per page/component when actually building, not something to pre-negotiate here.

## 55a. Stats display pattern — DECIDED

Follow-up, verbatim: *"For matches, probably big popups. For other stats, probably it's own page."* Resolves §44/§51's open "how does deep content actually get shown" question: match-level detail (lineups, top scorers, xG once built) surfaces in a large modal/popup triggered from wherever a match is referenced; broader/tournament-wide stats get their own dedicated page rather than being crammed into an existing view.

## 55b. Typography/contrast confidence — DECIDED

On the sharp/thin type against the navy/near-white palette (a risk I raised, not something he was worried about): *"The Telegraph does it."* Correct — it's a solved problem with a named, already-referenced precedent (§4/§9), not an open risk. Execute with that confidence; don't re-litigate it as uncertain during the build.

## Question-design notes (for me, not Mert)

Two round-3 questions landed badly and got joke/deflection non-answers: "icon style: literal vs. abstract" ("Too specific") and "imagine a rival site you'd hate" ("I don't fucking know"). Lesson: abstract compare-and-contrast prompts without something concrete to react to don't work for him. Sensory/scene/object prompts (place, texture, temperature, time of day, an object on a desk) consistently produce rich signal. Keep leaning on the latter style; drop the former.

Round 7 added one more failure mode: personifying UI elements ("if leaderboard rows could high-five each other, would they?") got "what the fuck is this question" — a different failure than abstract dichotomies, but same root cause: nothing concrete to actually picture. Stick to sensory/object/scene prompts about the *site itself* or *him*, not whimsical anthropomorphization of interface elements.

---

## Round log

- **Round 1** (`design-questionnaires/design-round-01.md`): established register, atmosphere, color direction, type feel, leaderboard restraint.
- **Round 2** (`design-questionnaires/design-round-02.md`): pure vibes round (no reconciliation questions, per Mert's steer) — converged hard on editorial/print credibility, cold temperature, and quiet confidence. See §11-14.
- **Round 3** (`design-questionnaires/design-round-03.md`): voice/tone locked in (blunt, factual, no apology), material sharpened (plaque + paper card stock), real photography confirmed, evening mood added. See §15-19. Two question shapes flagged as not working — see question-design notes above.
- **Round 4** (`design-questionnaires/design-round-04.md`): color dominance resolved unprompted (navy/white ~50/50), material set completed (pen + card + plaque), voice sharpened ("sexy but professional"), self-presentation decided (modest), lock-in feeling decided ("Done."). See §3, §20-25.
- **Round 5** (`design-questionnaires/design-round-05.md`): typography pairing resolved unprompted (serif mostly, sans sometimes), photo treatment decided (muted), the celebration sound described in detail, and an important calibration flag — don't let the executive material world crowd out real football-fan warmth. See §26-33.
- **Round 6** (`design-questionnaires/design-round-06.md`): the calibration flag repeated, more explicitly ("SATs", "FBI recruitment program") — promoted to §0 at the top of this doc. Also: cotton as the fourth/human material, floaty drag interaction, tagline voice sample, nav pinned, seasonal consistency confirmed. See §0, §34-41.
- **Round 7** (`design-questionnaires/design-round-07.md`): motion decided for real (fade-y/floaty/cottony, applies everywhere), a real scope note about content depth (match drill-downs, xG, tournament stats — flagged for a separate feasibility conversation), a concrete delight-pass feature idea (team-color click), and Mert's own signal that he's ready to build after one more round. See §42-47.
- **Round 8** (`design-questionnaires/design-round-08.md`, final): base neutral pinned down precisely, a reference checked and reconciled (huts.com — use his words, not the live site), motion made concrete (text slide/fade, real animation, not static HTML), content depth resolved as phased (fine to launch without deep stats), mobile elevated to a stricter intuitiveness bar than desktop, and one bold, self-flagged-as-uncertain desktop layout idea (no global vertical scroll) worth prototyping rather than assuming. See §48-55.

**Questionnaire phase is closed** — this was the last round, per Mert's own call in round 7 and confirmed by round 8's content (concrete launch-scope answers, not more vibes). `DESIGN-SPEC.md` is the input to `DESIGN.md` (the formal `impeccable` visual-system doc) and to the actual page-building work that follows.
