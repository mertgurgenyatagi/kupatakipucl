# Mobile — design spec

**Date:** 2026-08-06 · **Branch:** `mobile` · **Input:** `tools/mobile-wireframe/mobile-wireframes.json`

Mobile was explicitly out of scope for this project's entire history ("absolutely and
utterly ignore mobile," and half a dozen equivalents in `HANDOVER.md`). This spec covers the
pass that ends that.

The layout input is Mert's own wireframes, drawn in the tool built on the
`mobile-wireframe-tool` branch — 19 of ~76 matrix cells drawn, the rest handed over with:

> I didn't fill all of it but most of it is done. Rest you can fill on your own. Trust your
> skills and trust the golden rule (which I just made up right now): **ruthlessly sacrifice
> elements for the sake of non-busyness.**

This document records only what the wireframes *don't* say: the architecture, and every
decision made while filling the blanks. The wireframes themselves are the layout authority —
read them (`node`-load `lib.js`, call `WF.renderAllText`) rather than trusting a paraphrase
here.

---

## 1. The golden rule, stated as a working test

Every widget on a mobile screen has to earn its row. When a desktop composition has five
things and the wireframe has three, the answer is not "shrink all five" — it is "ship the
three." Where the wireframe is silent, the tiebreak is: **cut it.**

Applied consequences, decided here, listed once so they aren't re-litigated per page:

- **Chat leaves every page composition.** It becomes one drawer, reachable from the header on
  every screen, signed-in only. It is not a widget on Home any more.
- **The hero carousel is gone from mobile entirely.** 17 preloaded portraits, decorative, and
  the single most expensive thing on the page. It appears in no wireframe cell.
- **`TeamPopup`'s dossier tab is gone on mobile.** It is 100% fabricated data
  (`PROJECT_STATE.md` §6.3) occupying the majority of the popup's height.
- **`UpcomingMatchesPreview` / the fixtures drawer are gone from mobile Home.** Fixtures stay
  reachable through the popups that already link to them.
- **The header's "Paylaş" button is gone on mobile.** Not in the wireframe; the OS share sheet
  is one long-press away anyway.

---

## 2. Architecture: separate compositions, not responsive-in-place

**Decision: mobile gets its own component tree per page, chosen at runtime, sharing all data
hooks and leaf components with desktop.** Not Tailwind breakpoint classes on the existing
compositions.

Three reasons, in order of weight:

1. **The two layouts are structurally different, not re-flowed.** Desktop Home
   (`loggedin_leaguephase`) is a 3-column bento with five widgets including chat and a hero
   carousel. Mobile Home is three stacked frames, no chat, no hero. That is not a
   `grid-cols-3 → grid-cols-1` change; it is a different set of children. Expressing it in
   breakpoint classes means shipping every desktop widget to every phone and hiding it with
   `hidden lg:block` — the exact busyness the golden rule forbids, plus the download cost.
2. **Desktop is a fixed-viewport app; mobile scrolls.** `index.css` pins
   `html/body/#root` to `height:100%; overflow:hidden` above 1024px, and every desktop region
   owns an internal scroll container. Mobile is the opposite: the document scrolls and frames
   size to content. These are contradictory layout models in the same tree.
3. **Desktop is the shipped product and must not regress.** 930 tests cover it. A separate
   tree means the blast radius of this branch on desktop is exactly the shell and nothing
   else.

The cost — two trees to keep in sync — is bounded, because the split is at the *composition*
layer only. Data hooks (`useLeaderboard`, `usePlayers`, `usePosts`…), scoring, ranking, and
leaf components (`TeamCrest`, `Avatar`, `Frame`, `FixtureRow`) are shared verbatim. A mobile
page file is layout and nothing else.

### Breakpoint

**`lg` / 1024px.** Below it, mobile compositions; at and above, today's desktop, untouched.

This reuses the exact boundary `index.css` already uses for the fixed-viewport switch, so
there is no dead zone where a desktop composition renders inside a scrolling document (which
is what happens today, and is most of why the current sub-1024 experience is bad).

Tablets therefore get the phone layout. That is deliberate: the wireframes are phone-shaped
and a tablet showing a comfortable centred column beats a tablet showing a broken bento.
Mobile compositions cap at a readable measure and centre, rather than stretching to 1023px.

### One height model: a fixed viewport, everywhere

*(Revised 2026-08-07 on Mert's instruction: "every page apart from the forum should be globally
unscrollable." The first pass tried to support both models at once and it cost two bugs.)*

`html`, `body` and `#root` are `height:100%; overflow:hidden` at **every** width — what used to
be a `@media (min-width: 1024px)` rule for desktop only. Plus `overscroll-behavior:none`, so
the iOS rubber-band doesn't move a page that isn't supposed to move.

That gives every page a definite height to divide, so `flex-1` behaves the same way it does on
desktop and no page needs a bespoke height calculation. **The Forum feed is the single
scrolling region in the mobile app**, and it owns that scroll itself; every other page fits its
screenful, with individual frames scrolling internally where their content is longer than their
share (standings, league table, quiz, prediction list, bracket).

Two consequences worth knowing:

- **A full-viewport page inside the shell must fill what it's given (`h-full`), never restate
  `h-dvh`** — that double-counts the header and overflows by exactly its height. Both prediction
  pages did this; desktop never showed it because the excess was clipped by `overflow:hidden`.
- **"The document doesn't scroll" is not the same as "the content fits."** With `overflow:hidden`
  an overflowing block is silently clipped, so a scroll-height check passes while a block is
  three times the viewport. Measure the blocks, not just the document.

### Detection

`useIsMobile()` — a `matchMedia("(max-width: 1023px)")` subscription in
`src/lib/useIsMobile.ts`, `useSyncExternalStore`-based so there is no first-paint flash of the
wrong tree and no effect-ordering bug of the kind the 2026-08-06 `useImagePreload` entry
describes. No SSR here (pure SPA, `HashRouter`), so reading layout state during render is safe.

`test/setup.ts`'s `matchMedia` polyfill returns `matches: false` unconditionally, so **all 930
existing tests keep exercising the desktop tree with no change.** Mobile tests opt in by
stubbing `matchMedia`.

---

## 3. The shell

Drawn once in the wireframe, ghosted onto every page. Three slots in a single bar, plus the
device's own status bar above it (which we don't own — we pad for it with
`env(safe-area-inset-top)` and add `viewport-fit=cover` to the viewport meta).

| Slot | Logged out | Logged in |
|---|---|---|
| Left | Nav drawer opener (circular) | Nav drawer opener (circular) |
| Centre | Logo + `#kupatakipucl` wordmark | Avatar + first name → `/profile` |
| Right | Sign-in button | Chat drawer opener (circular) |

The centre swap is exactly as drawn: **a signed-in user does not see the wordmark.** It reads
odd written down and is right in practice — the brand is what you need before you have an
account, your own face is what you need after.

- **Left drawer** — the `VisibilityState` nav link set (the same table `AppShell` already
  keys off, so `AppShell.test.tsx`'s nav-matches-`pageAccess` invariant still holds), plus
  sign-out, plus the DEV-gated `/dev` link.
- **Right drawer** — global + lobby chat, with the lobby switcher in its header. Signed-in
  only, so it never renders for a logged-out visitor.

Both are overlay sheets, not push-content. Escape and backdrop-tap close; route change closes.

---

## 4. Page-by-page

Wireframe-drawn cells are marked ✎; the rest are decisions made here under the golden rule.

| Page / state | Mobile composition | Dropped vs desktop |
|---|---|---|
| ✎ Home `loggedout_notstarted` | Headline · blurb · countdown · Google sign-in, over `DustHaze` | Avatar stack, "N kişi katıldı" |
| ✎ Home `loggedout_leaguephase` (and `preknockout`, aliased) | Participant standings · league table — two internally-scrolling frames | Hero, fixtures, forum preview |
| ✎ Home `loggedout_knockout` | Participant standings · horizontally-scrolling bracket | as above |
| ✎ Home `loggedin_notstarted` | Welcome/CTA/countdown oblong (inset, not edge-to-edge) · participant scroller with header + lobby control · forum widget | Chat → drawer, hero |
| ✎ Home `loggedin_leaguephase` (and `knockout`, aliased) | Welcome · mini leaderboard · forum widget | Chat → drawer, hero |
| ✎ Home `loggedin_preknockout` | As league phase, plus the knockout-prediction CTA; leaderboard and forum shrink to make room | as above |
| ✎ About | Logo · body text · vertical timeline | Two-column split |
| ✎ Predictions | Ranking slots above, alphabetical team pool below | — |
| ✎ Knockout Predictions | One-sided horizontally-scrolling bracket | Symmetric two-half bracket |
| ✎ Leaderboard `loggedin_leaguephase` (and `preknockout`) | Same two frames as logged-out Home league phase | Hero, team table, fixtures drawer |
| ✎ Leaderboard `loggedin_knockout` | Participant standings · fully-scrollable bracket | as above |
| ✎ Forum | Composer · thread cards; the document scrolls | — |
| ✎ Stats | **See §5** | — |
| ✎ Profile (`notstarted`) | Profile header incl. delete · quiz answers · league predictions | Rank-history chart |
| ✎ Profile (`preknockout`, `knockout`) | Profile header · quiz answers · bracket predictions | Rank-history chart |
| Popups (Team, Participant, Matchup, Thread) | Full-height bottom sheets — **§6** | per-popup, see §6 |
| Signup / Predictions / Knockout flows | Already full-viewport sequences — fitted, not redesigned | — |
| Lobby management | Bottom sheet, reached from the participant widget's lobby control | — |

### Aliasing

Where the wireframe marks a state "exact same as X," mobile routes both states to one
component, exactly as `HomePage.tsx` already does for the desktop Xerox pass. No duplicated
compositions.

---

## 5. Stats: what "ignore" means

The wireframe cell for Stats contains one block reading `ignore`.

**Decision: Stats stays reachable and gets no design pass.** Its existing widgets stack into a
single scrolling column at mobile width, in nav-drawer reach, and that is all.

The alternative reading — drop Stats from mobile entirely — removes a real feature from
phone users, and "ignore" much more plausibly means "don't spend design effort here" than
"delete it." Stacking spends none while keeping the page. **Flagged for Mert:** if `ignore`
meant *hide it*, this is a one-line change.

---

## 6. Popups → bottom sheets

None of the popup rows were drawn. The wireframe tool's own convention for them (a draggable
sheet handle, dragged to row 0 for full-screen) is the design intent, so:

Every popup becomes a **bottom sheet that rises to full height**, with a grab handle, a sticky
title row, and internal scroll. They take the viewport — no shell behind them.

| Popup | Mobile content | Dropped |
|---|---|---|
| `TeamPopup` | Stage/rank header · match history · predictor list | **The whole dossier tab** (fabricated data) |
| `ParticipantPopup` | Prediction list · quiz answers | Rank-history chart (no production data path exists — §6.3) |
| `MatchupPopup` | Fixture card · both teams' rank/points · predictor lists | — |
| `ThreadPopup` | Root post · replies · reply composer | — |

---

## 7. Out of scope

- Desktop. Nothing above 1024px changes except the shell gaining a mobile branch.
- Touch gestures beyond taps and native scroll — no swipe-to-navigate, no pull-to-refresh.
- PWA/installability, offline, push.
- Landscape phone. The compositions are portrait; landscape reflows by scrolling, untuned.

---

## 8. Verification

`tsc -b` clean and the full suite green at every checkpoint, plus — and this is the part the
2026-08-03 and 2026-08-06 handover entries insist on — **a real browser at 390×844**, because
this project has now twice shipped a green suite over a layout bug jsdom cannot see. Automated
tests prove the tree is internally consistent; they do not prove anything fits on a phone.

Known limitation, same as every recent session: reaching the `loggedin_*` and started-phase
states live needs a real Google sign-in plus the DevPanel phase override (§6.9's auth gap).
Whatever cannot be reached live gets said plainly rather than implied verified.
