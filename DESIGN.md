<!-- SEED: re-run /impeccable document once there's real code (CSS, components) to capture actual tokens. This seed is unusually detailed for a seed file because it's built from 8 full questionnaire rounds (see DESIGN-SPEC.md), not the standard 5 quick questions — but no hex/exact values are committed yet since no implementation exists to extract them from. -->

---
name: Kupatakip UCL
description: A friend-group UEFA Champions League prediction pool — an editorial, stats-terminal-serious surface with real football-fan warmth underneath.
---

# Design System: Kupatakip UCL

## 1. Overview

**Creative North Star: "The Press Box"**

A press box is where this system lives: elevated, close to the numbers, and close enough to hear the crowd the whole time. That's the tension this system is built to hold, named directly by Mert across multiple questionnaire rounds when he worried the design was drifting too corporate — and then confirmed in the flesh, when the first real build of this North Star (full navy masthead, Telegraph-serif ledger) was rejected on sight as *"way too corporate"* and *"too serious and unwelcoming"* (DESIGN-SPEC.md §0b). The lesson from that build: the editorial/precise half of the tension (The Telegraph, "cold hard facts") is real and should stay in the palette and type, but it cannot be the thing a visitor feels first. What they should feel first is the warmth — the substance underneath is a game people play with their friends, not an institution ("don't let the fun get away," "I'm trying to warn you against creating an FBI recruitment program, this is a game"). The material world reads like a press box's own objects — an executive pen for writing the report, an engraved plaque for what's earned, paper card stock for the stat sheet — plus one deliberate human counterweight: cotton, the material of a fan's own jersey, and a crowd that "radiates around" the whole site rather than living in one corner of it.

**Compositional device, added after the first build's rejection (§0b):** the page is not one dense, page-filling ledger. It's a set of distinct **framed cells** — an oblong frame for the leaderboard, other frames for other content — each one its own small, self-contained object with room around it, closer to a well-composed bento layout than a newspaper page. Identity and navigation live in a **top bar**, not a full-height side masthead; nothing on the page should feel like it's wearing an institutional uniform.

This system explicitly rejects: a warm-cream/sand "AI default" background (the near-white here carries only the faintest paper-mill warmth, not a cream or parchment cast); a stiff, humorless corporate register (see DESIGN-SPEC.md §0 and §0b — this overrides everything else if a decision ever reads that way, and it already has once); static, undecorated pages ("definitely not a static HTML" — motion is expected, not optional); and anything that obscures information for the sake of style, especially on mobile, where the intuitiveness bar is explicitly *higher* than on desktop, not lower.

**Key characteristics:**
- Warmth and welcome felt first; editorial precision (sharp/thin serif-led type, navy/white identity) as an undertone, not the headline impression
- Composed as framed cells/panels — the leaderboard as one prominent oblong frame among others, not one page-filling table
- Navigation and identity in a top bar, light-touch — not a full-height navy side panel
- A real, structural navy/white presence, expressed per-frame rather than as one dominant full-bleed field
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

**Settled, DECIDED (DESIGN-SPEC.md §0c):** a single base face, **Archivo Narrow**, carries both display and body — chosen live, in the real layout, after a font trial (50 candidates, narrowed to 15 condensed/narrow finalists). This replaces the earlier Bodoni Moda / Geist serif-plus-sans pairing described below, which was this system's *direction* before implementation, not its final choice. One condensed sans instead of a serif/sans pair is a real shift in character — tighter, more contemporary, less overtly "newspaper" — and reads as consistent with §0b's move away from editorial severity.

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
- **Do** compose pages as distinct framed cells/panels (leaderboard as one oblong frame among others) rather than one dense, page-filling sheet (DESIGN-SPEC.md §0b).
- **Do** leave cells genuinely empty until there's real content for them — an intentional blank frame (mat + border, no data) reads as "not yet," not as broken (DESIGN-SPEC.md §0c).
- **Do** keep the content region below the top bar width-constrained and centered — compact, not edge-to-edge — while the top bar itself stays full width (DESIGN-SPEC.md §0c).
- **Do** place navigation and identity in a top bar — not a full-height side masthead (DESIGN-SPEC.md §0b, rejected the left-panel build on sight).
- **Do** give navy real structural presence (§2's 50/50 Rule), not accent-only treatment — but distribute it per-frame rather than as one dominant full-bleed field, so no single element reads as institutional.
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
