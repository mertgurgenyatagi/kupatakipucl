<!-- SEED: re-run /impeccable document once there's real code (CSS, components) to capture actual tokens. This seed is unusually detailed for a seed file because it's built from 8 full questionnaire rounds (see DESIGN-SPEC.md), not the standard 5 quick questions — but no hex/exact values are committed yet since no implementation exists to extract them from. -->

---
name: Kupatakip UCL
description: A friend-group UEFA Champions League prediction pool — an editorial, stats-terminal-serious surface with real football-fan warmth underneath.
---

# Design System: Kupatakip UCL

## 1. Overview

**Creative North Star: "The Press Box"**

A press box is where this system lives: elevated, glassed-off, a little cold, unmistakably serious about the numbers — and close enough to hear the crowd the whole time. That's the tension this system is built to hold, named directly by Mert across two separate questionnaire rounds when he worried the design was drifting too corporate: the surface is editorial and precise (The Telegraph, "a news website," "bank statement, but light," "cold hard facts"), but the substance underneath has to stay a game people play with their friends, not an institution ("don't let the fun get away," "I'm trying to warn you against creating an FBI recruitment program, this is a game"). The material world reads like a press box's own objects — an executive pen for writing the report, an engraved plaque for what's earned, paper card stock for the stat sheet — plus one deliberate human counterweight: cotton, the material of a fan's own jersey, and a crowd that "radiates around" the whole site rather than living in one corner of it.

This system explicitly rejects: a warm-cream/sand "AI default" background (the near-white here carries only the faintest paper-mill warmth, not a cream or parchment cast); a stiff, humorless corporate register (see DESIGN-SPEC.md §0 — this overrides everything else if a decision ever reads that way); static, undecorated pages ("definitely not a static HTML" — motion is expected, not optional); and anything that obscures information for the sake of style, especially on mobile, where the intuitiveness bar is explicitly *higher* than on desktop, not lower.

**Key characteristics:**
- Editorial-serious surface (Telegraph-adjacent, sharp/thin serif-led type) over a genuinely warm, football-loving substance
- A real, structural navy/white split (~50/50), not a light UI with a navy accent
- Motion that's present and felt everywhere — floaty, soft, "cottony" — never a static document
- A blunt, factual, unsentimental voice ("Done.", "Kuzey has taken your spot.") that is never cold-hearted — restraint, not indifference
- Real player photography, slightly muted, not full-saturation or black-and-white
- Mobile is not a shrunk desktop: it gets its own layout and a stricter clarity bar

## 2. Colors

The palette strategy is **Committed**, not Restrained: navy carries real, structural surface area, roughly balanced against white — not a light background with a small navy accent.

### Primary
- **UEFA-family navy** (exact value TBD at implementation): the anchor color, taking a genuinely large share of the surface (~50%), not decorative. Reads as the Champions League's own blue/silver identity — the color family only, never the actual UEFA/UCL logo or starball mark, which will not be reproduced.

### Neutral
- **The press-box white** (exact value TBD at implementation): near-white with an almost imperceptible warm cast — described by Mert as "very very very very very very very slightly beige." **Critical distinction:** this is not the cream/sand/parchment near-white that reads as a generic AI default (OKLCH L 0.84-0.97, C < 0.06, hue 40-100) — keep chroma close to zero. Think "this white came from a good paper stock," not "this is a cream page."
- **Silver/metal accent** (exact value TBD): a secondary neutral reference tied to the plaque/pen material world — likely used sparingly for dividers, secondary icons, or metallic-feeling accents rather than as a large surface.

### Named Rules
**The 50/50 Rule.** Navy is not an accent color here — it should occupy roughly as much visual weight as the near-white ground. If a screen reads as "white with a navy button," the balance is wrong.

**The Paper-Mill Rule.** Any warmth in the near-white must stay below the threshold of being nameable as "cream" or "beige" by a casual viewer — it's a material quality of good paper, not a color choice someone would point at.

## 3. Typography

**Display/body face direction:** a sharp, thin, modern editorial serif (Telegraph-adjacent) carries most of the system — headlines, key numbers, primary content.
**Secondary face direction:** a clean sans, used situationally for UI chrome, labels, and dense data rather than as an equal partner.

*(Specific font families to be chosen at implementation — this is a pairing direction, not a font selection yet.)*

**Character:** Precise and a little severe at rest (matches the blunt, factual voice — "cold hard facts," "Done."), never soft or rounded in its default state.

### Hierarchy
- **Display** (serif, sharp/thin, tight tracking): tagline-style moments — e.g. the voice sample *"50 PARTICIPANTS. 36 TEAMS. ONE TROPHY."* — short, escalating, all-caps fragments grounded in real numbers, not abstractions.
- **Body** (serif, comfortable weight): editorial reading contexts — forum posts, stat write-ups.
- **Label/Data** (sans, tabular numerals where it obviously matters — the leaderboard specifically, not blanket-applied everywhere): scores, ranks, timestamps.

### Named Rules
**The Ledger Rule.** Numbers align in neat tabular columns only where alignment actually carries meaning (the leaderboard). Elsewhere, don't force spreadsheet rigidity onto content that isn't tabular.

## 4. Elevation

Motion energy is high-touch by this system's own instruction ("text sliding and fading in, small animations... definitely not a static HTML"), so elevation should feel soft and diffuse rather than sharp or mechanical — closer to a fabric settling than a card snapping into a stack. Prefer gentle ambient shadows and blur over hard-edged drop shadows; nothing here should look like a "2014 app" flat card with a heavy default box-shadow.

### Named Rules
**The Cottony Rule.** Anything that moves — page transitions, list reorders, drag interactions, elevation changes — should feel floaty and smooth, per Mert's own word for it: "fade-y, floaty, smoothy and cottony." No hard snaps, no mechanical eases.

## 5. Components

Not populated in this seed — no components exist in code yet. Re-run `/impeccable document` in scan mode once the first real components (buttons, the leaderboard table, prediction cards) exist to extract their actual styles here.

## 6. Do's and Don'ts

### Do:
- **Do** give navy real structural presence (§2's 50/50 Rule), not accent-only treatment.
- **Do** make motion a first-class part of every interaction — transitions, reorders, drag — floaty and soft (§4's Cottony Rule).
- **Do** use real, muted (not full-color, not black-and-white) player/team photography.
- **Do** write UI copy the way the voice samples read: short, factual, no exclamation points, no apology ("Done.", "Kuzey has taken your spot.").
- **Do** hold the chat/forum as the system's designated outlet for warmth and banter — genuinely loose there, not just "microscopically" different from the rest of the site.
- **Do** design mobile as its own layout with a *stricter* intuitiveness bar than desktop — never bury or obscure information there for the sake of a smaller viewport.
- **Do** build desktop as a fixed-viewport app shell — no document-level vertical scroll, ever (DESIGN-SPEC.md §55, firm decision). The outer frame is 100vh/100dvh; any region with more content than fits (leaderboard body, a forum thread, a stats panel) gets its own internal scroll container instead. Same pattern as Linear/Notion/Discord — not exotic, just needs each page's layout planned around it from the start rather than retrofitted.
- **Do** surface match-level detail (lineups, top scorers, xG) in a large popup/modal, and give broader tournament-wide stats their own dedicated page (DESIGN-SPEC.md §55a) — not crammed into an existing view.
- **Do** keep whatever ships at launch looking fully polished, even if the shipped *scope* is intentionally phased (deep stats/xG can come later; the craft on what does ship should not look unfinished).

### Don't:
- **Don't** let the near-white drift into a nameable cream/sand/parchment tone — see §2's Paper-Mill Rule.
- **Don't** let the composed, editorial surface read as corporate, institutional, or humorless anywhere — this is the single most-repeated correction in the whole intake process (DESIGN-SPEC.md §0). If in doubt, this Don't overrides any other rule in this document.
- **Don't** reproduce UEFA/UCL's actual logo, starball mark, or wordmark — the navy/silver color family is the reference, not the branding itself.
- **Don't** ship anything that reads as a static, undecorated document — no bare unanimated page transitions.
- **Don't** apply tabular/aligned-column number formatting everywhere by default — only where it obviously matters (the leaderboard).
- **Don't** default to gamification flourishes — no badges, streaks, or achievement UI (carried from `PRODUCT.md`'s anti-references); the one deliberate celebration (season-winner confetti, described as sounding like "a low-end glass choir of whoosh") stays rare specifically because everything else stays quiet.
- **Don't** treat matchday as a different visual mode from a normal Tuesday, or treat different points in the season as needing a seasonal reskin — one consistent system throughout.
