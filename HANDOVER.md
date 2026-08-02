# Handover — interim notes

**Purpose:** a rolling handover note for whatever isn't in `PROJECT_STATE.md`. `PROJECT_STATE.md` is the standing description of what the app *is*; this file is for what changed recently, decisions made along the way, and loose ends someone picking this up should know about. Do not duplicate anything `PROJECT_STATE.md` already covers — if a fact belongs there, put it there instead and leave it out of this file.

This file is meant to be pruned/rewritten as things get resolved or folded into `PROJECT_STATE.md` proper — it's not an archive.

---

## 2026-08-02 — `/about` page shipped, merged to `main`

Built and merged (branch `about-page`, 3 commits, squash-free merge `88db2a9`): a static `/about` route, ungated, identical content in every `VisibilityState`. Design spec at `docs/superpowers/specs/2026-08-02-about-page-design.md` — **note it documents the page's first draft**, not the final shipped version; the page went through a significant unrecorded second pass after Mert reacted with a hand-drawn wireframe and then a further round of copy/layout/timeline corrections. The spec doc was updated once (after the wireframe pivot) but not again after the later corrections — treat the live code (`src/pages/AboutPage.tsx`) as ground truth over the spec doc for this page.

**Open follow-up items:**

- The timeline's 6th node ("Eleme Aşaması") uses a placeholder date (`2027-05-30`) with no real basis — there is no fixed knockout-phase-end date anywhere in the project yet. Mert said not to worry about it for now ("dates will be changed anyway"), but it needs a real value before this reads as anything but a guess.
- Mobile was explicitly *not* tuned for this page, per direct instruction ("completely disregard mobile from your thoughts"). The page uses fixed desktop-oriented sizing/grid with no responsive breakpoints, unlike every other page in the app. If mobile ever matters for `/about`, it needs a dedicated pass, not just a tweak.
- `PROJECT_STATE.md` itself is now slightly out of date on a few narrow points because of this merge: its §3 route table and §4 nav-link table don't list `/about` or "Hakkında," and its page-access matrix doesn't mention that About is nav-visible-but-ungated (same pattern as Home). Small, mechanical updates — not urgent, but worth doing whenever `PROJECT_STATE.md` next gets a refresh pass.
- A font-loading flicker fix (`useFontsReady`, gating the reveal animation on `document.fonts.ready`) was added locally inside `AboutPage.tsx` to fix a flicker Mert noticed on this page's large hero text. It was scoped to this one page, not applied site-wide — worth revisiting if the same flicker turns out to be visible elsewhere (smaller text elsewhere likely has the same underlying issue, just less noticeable).
