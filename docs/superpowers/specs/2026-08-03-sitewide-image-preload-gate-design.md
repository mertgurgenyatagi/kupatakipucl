# Sitewide image-preload gate — design

**Context:** follow-up to the `2026-08-03-sitewide-loading-flash-design.md` effort. That work fixed a *data*-timing bug (Firestore hooks releasing `loading: false` on a partial `fromCache` snapshot) and added skeletons for previously-blank loading states. After testing it live, Mert reported the original symptom persists on pages he tested: avatars and other images still visibly pop in after the rest of the page has already painted. He wants the loading-flash principle pushed one level further — no page reveal should ever be followed by an image resolving after the fact. `HeroCarousel` already does this (preload the full portrait set, render nothing until every one has settled); this spec generalizes that pattern to every image on every page.

## Goal

Once a page (or popup) is revealed, nothing on it should visibly finish loading afterward. Every image the page is about to show is preloaded during the same loading-state window that already covers data-fetching, and the page's existing skeleton simply stays up a bit longer to cover it.

## Mechanism

Extract `HeroCarousel.tsx`'s private `usePreloadedImages` into a shared hook:

```ts
// src/lib/useImagePreload.ts
export function useImagePreload(urls: string[]): boolean
```

Same behavior as the existing implementation: resolves each URL via a detached `Image()`, treats both `onload` and `onerror` as "settled" (a broken image must never hang the gate forever — it just falls through to that component's existing fallback, e.g. `AvatarFallback`'s shield/initials, once the page reveals), and only reports `true` once every URL in the array has settled.

Each consuming page/popup computes its own URL list from data it already has — `players.map(p => p.photoURL).filter(Boolean)`, `teams.map(t => teamCrestSrc(t.id))`, a forum post's attached image, etc. — and folds the result into its existing loading gate:

```ts
const imagesReady = useImagePreload(imageUrls);
if (dataLoading || !imagesReady) return <ExistingSkeleton />;
```

No page currently has an image-inclusive URL list computed anywhere, so this is new code per page, not a drop-in — but the gating shape (skeleton until a boolean flips) already exists everywhere from the loading-flash work, so this extends that shape rather than inventing a new one.

## Scope

**Gated — every full page:** Home (all `VisibilityState` variants — logged-out not-started's `DustHaze` hero/`AvatarStack`, logged-in not-started's `HomeLandingLoggedIn`, and the shared started-phase compositions for both login states), Leaderboard, Stats, Forum, Profile, Predictions.

**Gated — every click-to-open popup:** `TeamPopup`, `ParticipantPopup`, `MatchupPopup`. These open on a click, not a page load, so the gate applies at *open* time: the popup shows its own skeleton state until its crest/avatar images have preloaded, then reveals real content. This is a new loading phase for these three components — today they render immediately once their (already-available) data is ready.

**Large lists get no special-casing.** The 52-entry Katılımcılar list, the 36-row team table, and any other long list preload every entry, not just what's visible without scrolling — per direct instruction, consistent with `HeroCarousel`'s existing "slower load, but pictures arrive with the page" precedent.

**Static local assets (team crest SVGs) are included in the same preload lists** as remote Storage-hosted photos, for consistency — even though same-origin static assets resolve close to instantly in practice.

**Excluded — Chat, entirely.** Both `ChatRoom` surfaces (global and Special Lobby) keep today's behavior unchanged: messages render live as they arrive, with `AvatarImage`'s existing fade-in on each message's avatar. Gating live-streamed content on image preload would mean a new message visibly stalls behind a slow avatar fetch, which is a different (and worse) UX than a brief avatar fade — explicitly out of scope per direct instruction.

**Forum is bounded, not live** (confirmed this session — Forum isn't meant to behave as a live-updating feed), so its post list and attached images are treated like any other page's initial-load content: fully preloaded before the page reveals, no live-stream exception needed.

## What doesn't change

`AvatarImage`'s CSS fade-in and `ForumImageThumb`'s skeleton-then-mount internals are left as-is, not removed. Once a page-level gate has already preloaded an image, these per-instance mechanisms simply never get the chance to visibly trigger — the browser resolves `onload` near-instantly against its own cache. They remain the live (and correct) behavior for the one remaining exception: Chat.

## Testing

Every touched page and popup gets a test asserting it stays on its skeleton/loading state until images resolve, mocking `useImagePreload` the same way existing tests already mock the data-loading flags. No new testing philosophy — this extends the existing skeleton-assertion pattern established during the loading-flash work.

## Out of scope

- Any change to Chat's loading/render behavior.
- Any change to the underlying `fromCache` data-loading fix from the previous session — this spec is additive on top of it.
- Viewport-based lazy loading or any other perf optimization that would contradict "preload all, always" for long lists.
