# Handover — interim notes

**Purpose:** a rolling handover note for whatever isn't in `PROJECT_STATE.md`. `PROJECT_STATE.md` is the standing description of what the app *is*; this file is for what changed recently, decisions made along the way, and loose ends someone picking this up should know about. Do not duplicate anything `PROJECT_STATE.md` already covers — if a fact belongs there, put it there instead and leave it out of this file.

This file is meant to be pruned/rewritten as things get resolved or folded into `PROJECT_STATE.md` proper — it's not an archive.

---

## 2026-08-02 — Forum opened to logged-out visitors + site-wide surname privacy, merged to `main`

Built and merged (branch `forum-loggedout-leaguephase`, 15 commits): Forum is now reachable (read-only) by logged-out visitors in every started tournament phase, and participant surnames are no longer served to any logged-out session anywhere in the app — not just on Forum. Design spec at `docs/superpowers/specs/2026-08-02-forum-logged-out-and-name-privacy-design.md`, implementation plan at `docs/superpowers/plans/2026-08-02-forum-logged-out-and-name-privacy.md`. What started as "let's do Forum first" expanded mid-brainstorm once it became clear Firestore rules can't filter individual fields out of a document read — the only real fix for surname privacy was a data-layer split, which also touched the Leaderboard family (already logged-out-visible today) and half a dozen other components that had never been asked to handle a missing `lastName`.

**Data layer**: new `publicProfiles/{uid}` Firestore collection (`firstName`/`photoURL`/`createdAt` only, public read); `profiles/{uid}` read tightened to signed-in-only (still holds `lastName`). `functions/leaderboard`'s computed `leaderboardCache` doc — a second, independent public leak of the same field — had `lastName` stripped from its output too. `usePlayers()` is now auth-aware (reads `profiles` when signed in, `publicProfiles` when not); `fullName()`/`initials()` centralized in `src/profile/deletedAccount.ts` and degrade to first-name-only instead of crashing when `lastName` is absent — adopted across Forum, the whole Leaderboard family, Chat, Lobbies, and Home, replacing 7+ duplicated inline `initials()` copies.

**Deployed** (2026-08-02, same session): `firestore.rules` live, `scripts/backfill-public-profiles.mjs` run against production (52/52 profiles backfilled), `functions/leaderboard` redeployed with the new output shape.

**Open follow-up items:**

- **`leaderboardCache/current` may still hold stale `lastName` fields** until the next real write to `predictions/{uid}` or `results/{teamId}` triggers a fresh server-side recompute — the deployed function is correct going forward, but nothing forced an immediate recompute of the already-cached document. Low urgency pre-launch (seed data only), but worth checking before this matters for real.
- **A stale, undocumented Cloud Function was found and deleted during this deploy**: `recomputeLeaderboardOnBracketPrediction` (region `europe-west8`) existed in production with no matching source anywhere in this branch or, as far as a repo search shows, any commit history. The name suggests knockout/bracket-prediction scoring — a feature `PROJECT_STATE.md` §6.2/§13-B explicitly notes has no code behind it anywhere. Mert confirmed it was fine to delete, but if bracket-prediction work exists on some other branch, worktree, or machine that never got merged, its deployed function is now gone — worth a mental note if that feature resurfaces looking "half-done."
- **`PROJECT_STATE.md` is now out of date** on: §4's page-access matrix (Forum is no longer "requires login? yes" unconditionally — it's login-required only for `notstarted`), §4's nav table (`loggedout_{started phase}` now includes Forum), §8.1's Firestore collections table (needs a `publicProfiles` row; `profiles`' read access is no longer "public"). Mechanical updates, not urgent, same as the `/about` merge's leftover PROJECT_STATE debt below.
- **Two infra warnings surfaced during the `functions/leaderboard` deploy**, unrelated to this work but now dated and worth tracking: Node.js 20 is deprecated (decommissions 2026-10-30) and the `firebase-functions` package version is outdated (breaking changes on upgrade). Neither blocks anything today.
- Per the original status grid this work came out of: Home's logged-out league-phase content, the Matchup Popup, and Participant Popup's remaining wiring are still separately unbuilt — none of that was in scope here.
- Mobile — untouched, per the site-wide convention this whole effort followed.

---

## 2026-08-02 — `/about` page shipped, merged to `main`

Built and merged (branch `about-page`, 3 commits, squash-free merge `88db2a9`): a static `/about` route, ungated, identical content in every `VisibilityState`. Design spec at `docs/superpowers/specs/2026-08-02-about-page-design.md` — **note it documents the page's first draft**, not the final shipped version; the page went through a significant unrecorded second pass after Mert reacted with a hand-drawn wireframe and then a further round of copy/layout/timeline corrections. The spec doc was updated once (after the wireframe pivot) but not again after the later corrections — treat the live code (`src/pages/AboutPage.tsx`) as ground truth over the spec doc for this page.

**Open follow-up items:**

- The timeline's 6th node ("Eleme Aşaması") uses a placeholder date (`2027-05-30`) with no real basis — there is no fixed knockout-phase-end date anywhere in the project yet. Mert said not to worry about it for now ("dates will be changed anyway"), but it needs a real value before this reads as anything but a guess.
- Mobile was explicitly *not* tuned for this page, per direct instruction ("completely disregard mobile from your thoughts"). The page uses fixed desktop-oriented sizing/grid with no responsive breakpoints, unlike every other page in the app. If mobile ever matters for `/about`, it needs a dedicated pass, not just a tweak.
- `PROJECT_STATE.md` itself is now slightly out of date on a few narrow points because of this merge: its §3 route table and §4 nav-link table don't list `/about` or "Hakkında," and its page-access matrix doesn't mention that About is nav-visible-but-ungated (same pattern as Home). Small, mechanical updates — not urgent, but worth doing whenever `PROJECT_STATE.md` next gets a refresh pass.
- A font-loading flicker fix (`useFontsReady`, gating the reveal animation on `document.fonts.ready`) was added locally inside `AboutPage.tsx` to fix a flicker Mert noticed on this page's large hero text. It was scoped to this one page, not applied site-wide — worth revisiting if the same flicker turns out to be visible elsewhere (smaller text elsewhere likely has the same underlying issue, just less noticeable).
