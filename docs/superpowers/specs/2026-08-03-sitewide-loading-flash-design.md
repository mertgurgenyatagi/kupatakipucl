# Sitewide loading-flash elimination — design spec

**Status:** approved (Mert, 2026-08-03 — "Approved as-is")
**Branch:** `frontend-sweep` (continuing the branch already in progress this session)

## Purpose

Eliminate the class of "pops in late / flashes / glitches" loading behavior across the whole site — fonts swapping visibly after first paint, pages blanking out then slamming their full layout in at once, and images (forum uploads especially) appearing with no placeholder or failure handling. Mert's opening instinct was to hold every page back until literally everything is ready; the actual fix is narrower than that, because part of the site (chat, presence, the countdown) is live/streaming and never reaches a "done loading" state, so a single all-or-nothing gate would either never resolve for those sections or block the whole page behind one slow, unrelated resource.

## Investigated and excluded: the nav avatar/login-button "flash"

Before writing this spec, I traced `AppShell.tsx`'s `{!loading && ...}` nav conditionals against `ProfileGate.tsx` and `useProfile.ts`'s caching. `ProfileGate` already blocks the entire app (returns `null`) until auth resolves and, for a signed-in user, until profile+survey are loaded — and `useProfile`'s cache write (`setCached`, `useProfile.ts:62`) happens synchronously inside the same `onSnapshot` callback that flips `ProfileGate`'s own loading flag to false, *before* React ever renders `AppShell`. So by the time `AppShell` mounts and runs its own (redundant) `useProfile` call, the cache is already warm and its lazy `useState` initializer reads it synchronously — no empty render in between. Mert had no specific repro for this one either ("general impression, not a specific spot"). Conclusion: this isn't a confirmed bug, so it's not part of this pass. (The redundant fetch itself — `AppShell` and `ProfileGate` both calling `useProfile` for the same uid — is a pre-existing inefficiency, not a visual bug, and is left alone here.)

## Scope

**In scope**, three independent, verified root causes:
1. No font preloading/gating outside `/about` (FOUT sitewide).
2. Three inconsistent page-loading conventions, two of which (`return null`) are a genuine blank-then-pop.
3. Forum-uploaded images have no placeholder, no fade-in, and no failure handling; avatar/crest images swap from their fallback to the real photo with no transition.

**Explicitly out of scope:**
- Chat messages, online-presence count, the countdown, typing indicators — live streams with no "ready" state; they keep mounting and updating immediately, unchanged.
- `HeroCarousel.tsx`'s existing preload-then-render gate — already correct for a small finite local set, not touched.
- `JoinLobbyPage`'s `return null` — it's a pure redirect, not a content page; nothing to show there regardless.
- The nav avatar/login-button flash (see above) — investigated, not confirmed, excluded.
- Mobile — not relevant; this is loading-sequence behavior, not layout.

## 1. Root-level font-readiness gate

Move `useFontsReady()` out of `AboutPage.tsx` into `src/lib/useFontsReady.ts` (same implementation: polls `document.fonts.ready`, returns `true` synchronously in any environment without `document.fonts`, which covers jsdom for free — no new test mocking needed). Fold it into `ProfileGate.tsx`, the one place that already blanks the whole app:

```ts
const fontsReady = useFontsReady();
if (!fontsReady || authLoading || (user && (profileLoading || surveyLoading))) {
  return null;
}
```

This sits above `AppShell`, so nav text is covered too — no page ever paints in the fallback font, sitewide, in one place. `AboutPage.tsx` then has its own local gate and conditional content-mount deleted entirely: fonts are guaranteed ready by the time anything mounts, so the wrapper that gated its grid on `fontsReady` becomes dead code. Its content renders unconditionally again, same as every other page.

No `<link rel=preload>` in `index.html` — Vite fingerprints the fontsource package's asset URL at build time, so a static preload href would either be wrong in production or need extra build tooling to keep in sync. The gate alone is the same trade Mert already explicitly accepted for `/about` (longer wait, zero flash) — just applied once, sitewide, instead of per-page.

## 2. Standardize page-loading on skeletons

Replace the two remaining `return null` pages with skeletons, matching the convention `LeaderboardPage`/`ForumPage`/`ProfilePage` already use (inline `XSkeleton()` function in the page file, real `Frame`/`Skeleton` primitives shaped like the real layout, `aria-hidden`, `data-testid="x-skeleton"`).

- **`StatsPage.tsx`** — one `StatsSkeleton()` matching its existing `PAGE_SHELL`/`MAIN_ROW` (`[1fr_1fr_300px]`, three-column) shape: two columns of skeleton widget boxes, a third `Frame` placeholder standing in for `StatsHero`.
- **`HomePage.tsx`** — two variants, chosen by `state` (already resolved before the data-loading check, since `useVisibilityState`/`useTournamentPhase` don't depend on the results/players/leaderboard fetch):
  - `HomeHeroBandSkeleton()` for `loggedout_notstarted` — mirrors `HomeLandingLoggedOut`'s single hero band (heading bar, subheading bar, CTA-pill, four countdown-digit blocks).
  - `HomeBentoSkeleton()` for every other state — mirrors the bento shape shared by `LoggedInHome`/`LoggedInHomeStarted`/`HomeLandingLoggedOutStarted` (a welcome-banner-height bar, then a row of `Frame`-shaped placeholders in roughly the real column proportions).
- **`PredictionsPage.tsx`** — deliberately minimal, not a full skeleton: this page is a full-viewport animated intro sequence (`SignupFlow`-shaped), not a data grid, and `usePrediction`'s loading is a single fast read that usually ends in an immediate redirect anyway. Replace `return null` with a couple of centered `Skeleton` bars — reserves *some* visual continuity without investing in a pixel-matched mockup of a UI that's about to be replaced or redirected away from.

## 3. Image polish

- **`src/components/ui/avatar.tsx`** — `AvatarImage` (base-ui's primitive) only ever renders once the underlying photo has actually loaded; until then, `AvatarFallback` (initials, or the `Shield` icon for team crests) is already showing, so this was never a blank-frame bug. The gap is that the swap from fallback to photo is instant. Add the existing `animate-cotton-fade` keyframe (already used for route transitions, `index.css:206-245`) to `AvatarImage`'s className, so the swap is a quiet fade instead of a pop. Fixing this one shared component covers every avatar *and* every team crest (`TeamCrest.tsx` reuses the same primitive) — ~37+ call sites, one change.
- **`src/forum/ForumImageThumb.tsx`** — the thumbnail's box is already fixed-size (`size-16`), so there's no layout shift, but there's currently no fade and no failure handling — a broken upload shows the browser's native broken-image glyph. Add `onLoad`-tracked opacity fade-in (same `animate-cotton-fade` token, for consistency) and an `onError` fallback (a small muted placeholder icon + "Resim yüklenemedi", replacing the raw `<img>` in both the thumbnail and the lightbox).

## Error handling

- Font gate: `document.fonts.ready` doesn't have a meaningful rejection path in browsers — no timeout/fallback needed, matching the precedent already shipped on `/about` without one.
- Avatar images: unchanged — `AvatarFallback` already covers load failure, this pass only adds the transition.
- Forum images: new `onError` fallback (see above) — currently the only image category on the site with zero failure handling.

## Testing

- `ProfileGate.test.tsx` (or wherever its blocking condition is covered): extend to include `fontsReady` in the gate condition; no new mocking required since jsdom has no `document.fonts`, so the hook resolves `ready=true` synchronously in every test, same as it already does for `AboutPage.test.tsx` today.
- `AboutPage.test.tsx`: update for the removed local gate — content assertions no longer need to wait on anything, page renders unconditionally.
- New `HomePage.test.tsx` / `StatsPage.test.tsx` / `PredictionsPage.test.tsx` cases: skeleton renders (with the right variant, for Home) while the relevant hooks report `loading: true`; real content once they resolve — mirroring the existing `ForumSkeleton`/`LedgerSkeleton`/`ProfileSkeleton` test coverage.
- `avatar.test.tsx` (new or extended) and `ForumImageThumb.test.tsx` (new): fade-in class applied once the underlying `<img>` fires `load` (via `fireEvent.load`); `ForumImageThumb` additionally covers the `onError` fallback path (via `fireEvent.error`).
