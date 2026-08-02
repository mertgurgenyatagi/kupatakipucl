# Forum (logged-out access) & site-wide surname privacy — design spec

**Status:** approved (Mert, 2026-08-02 — "Proceed" at each stage)
**Branch:** `forum-loggedout-leaguephase`

## Purpose

Two coupled changes, built together because the first can't actually deliver on its own promise without the second:

1. **Forum opens to logged-out visitors** for every started tournament phase (league phase, pre-knockout, knockout) — visible and readable, but posting/replying/liking stay signed-in-only.
2. **Surnames become genuinely inaccessible to logged-out visitors, site-wide** — not just hidden in the UI. Motivated by this state of the site becoming search-engine indexable: a participant's full name must not appear in anything a logged-out visitor's browser receives, anywhere in the app, not only on the Forum page.

(2) can't be scoped to Forum alone: Firestore security rules can't filter individual fields out of a document read, so the only real way to keep `lastName` out of a logged-out session is to stop serving it in any document/collection a logged-out client can read at all. That touches every currently-public surface that carries participant names, not just Forum's.

## Scope note: what's in vs. out

**In scope**, because they already leak (or would immediately leak) `lastName` to a logged-out reader once these changes ship:
- Forum (`ThreadCard`, `ReplyRow`, `ThreadPopup`, `Forum.tsx`) — today's actual feature ask.
- Leaderboard's participant-name surfaces (`LeaderboardTable`, `ParticipantPopup`, `TeamPopup`'s predictor list via `PlayerList`) — these are *already* logged-out-accessible in every started phase per the current `pageAccess.ts`, so they'd break or leak the moment a real tournament phase goes live, regardless of Forum.

**Out of scope**, explicitly:
- Home's logged-out league-phase content itself — a separate, undesigned stage on the project's status grid.
- Mobile layout — existing site-wide convention, ignored everywhere.
- Any visual/layout redesign of Forum — this is functional wiring only; Forum looks the same as it does today, just reachable and partially-interactive when logged out.
- Logged-in behavior anywhere — full names keep showing exactly as they do today for signed-in viewers.

## 1. Data & backend layer

### New `publicProfiles/{uid}` collection

Holds only `{firstName, photoURL, createdAt}`. `allow read: if true`.

Written alongside `profiles/{uid}` at all three of `useProfile.ts`'s write sites:
- `saveProfile` (signup's first write)
- `updateProfilePhoto` (keeps `firstName` unchanged, refreshes `photoURL`)
- `deleteProfile` (deletes both docs)

### `profiles/{uid}` read rule tightens

From `allow read: if true` to `allow read: if request.auth != null`. The full doc (including `lastName`) becomes signed-in-only. Write rules (create/update validation, owner-only) are unchanged.

`publicProfiles/{uid}` write rules mirror `profiles`'s existing validation (owner-only, `firstName` 1–15 chars, `photoURL` a string), plus a guard that `lastName` is never present on this doc.

### `functions/leaderboard/index.js`

Drop `lastName` from the computed `LeaderboardEntry` (`recomputeLeaderboard()` currently denormalizes `profile.lastName` straight onto every entry — that's a second, independent leak of the exact same field, feeding `leaderboardCache/current`, which is publicly readable). Update the `LeaderboardEntry` TypeScript type (`src/leaderboard/leaderboardTypes.ts`) to match. Requires redeploying this Cloud Function — flagged explicitly before actually running that deploy.

### Migration script

`scripts/backfill-public-profiles.mjs`, following the same `gcloud auth print-access-token` REST pattern as the existing `scripts/seed-dummy-*.mjs`: reads every existing `profiles/{uid}` doc, writes the corresponding `publicProfiles/{uid}` doc. Must run at (or before) the rules/Cloud Function deploy — otherwise logged-out visitors see empty participant lists until it does.

## 2. Shared client-side plumbing

### `usePlayers()` becomes auth-aware

- Signed-in: subscribes to `profiles` (unchanged today — full data, including `lastName`).
- Signed-out: subscribes to `publicProfiles` (`lastName` absent from the returned shape).
- The `Player` type's `lastName` becomes optional (`lastName?: string`) to reflect this.
- Session cache key splits by source (`players:full` vs. `players:public`) so a mid-session login/logout can't serve one shape's cached data through the other's listener before the first live snapshot arrives.

### `deletedAccount.ts` — centralize name/initials formatting

- `fullName()`'s parameter type relaxes to `{ firstName: string; lastName?: string }`; when `lastName` is absent it returns first-name-only (distinct from the existing "deleted account" `null`/`undefined` case, which still returns `Silindi`).
- New shared `initials(player)` helper, replacing the 7 currently-duplicated inline `initials()`/`participantInitials()` functions across `ThreadCard.tsx`, `ReplyRow.tsx`, `ThreadPopup.tsx`, `RecentPostsPreview.tsx`, `LeaderboardTable.tsx`, `ParticipantPopup.tsx`, `TeamPopup.tsx`, `PlayerList.tsx`. Necessary, not just tidy: every one of those duplicates currently does `lastName.charAt(0)` unguarded, which throws the moment `lastName` is `undefined`. Returns a single first-initial when `lastName` is absent, two-letter monogram otherwise, `"?"` for a deleted/missing account (matching current behavior).

## 3. Forum feature

- `pageAccess.ts`: `forum` opens to logged-out for all started phases (mirrors `leaderboard`'s existing `statesFor(STARTED_PHASES, [true, false])` pattern), logged-in stays all-phases. `notstarted` remains login-required for both.
- `AppShell.tsx` `NAV_LINKS`: add "Forum" to every `loggedout_{started phase}` entry (currently just Ana Sayfa + Puan Durumu).
- `ThreadCard.tsx` / `ReplyRow.tsx` (both `compact` and full variants): like button gets `disabled={!uid}` — count stays visible (social proof), but no hover/cursor-pointer affordance, no click effect, consistent with the app's "Cursorify" convention of only real interactive elements getting a pointer cursor.
- `ThreadPopup.tsx`: `onQuote` prop passed to `ReplyRow` becomes conditional on `uid` (today it's unconditional, which would let a logged-out visitor open the quote-staging UI above a reply form that's already hidden — an orphaned affordance). The reply `PostForm` itself is already correctly gated (`{uid && (...)}` — this code path is dormant today only because Forum is currently 100% login-gated at the page level).
- `ForumPage.tsx`: passes `players` into `ParticipantPopup` (currently omitted) so it can resolve `lastName` for signed-in viewers post-split (see §4).
- Root-level `PostForm`'s existing "Konu açmak veya yanıtlamak için giriş yapmalısın." message needs no changes — it's dormant today for the same page-gating reason and just becomes reachable.
- `RecentPostsPreview.tsx` (the Home dashboard's forum widget) is untouched beyond adopting the shared `initials()` helper (§2) — its `uid` prop is required/non-null and it's only ever mounted from logged-in Home today. It doesn't need like-button gating in this pass because Home's logged-out league-phase content is explicitly out of scope (see above); it'll need the same treatment as Forum's other components whenever that stage gets designed.

## 4. Leaderboard-family correctness

Necessary because these are already live to logged-out visitors in every started phase today, not new scope:

- `LeaderboardPage.tsx`: calls `usePlayers()`, threads `players` into `LeaderboardTable`, `ParticipantPopup`, `TeamPopup`.
- `LeaderboardTable.tsx` / `ParticipantPopup.tsx` / `TeamPopup.tsx`: replace local `initials()`/`participantInitials()` and inline `${entry.firstName} ${entry.lastName}` with the shared `fullName`/`initials` helpers. Since `LeaderboardEntry` no longer carries `lastName` (§1), these three build a `playersByUid` map (via the existing `buildPlayersByUid` helper Forum already uses) and look up `lastName` there — present for signed-in viewers, absent for logged-out, same graceful-degradation the helpers already provide.
- `PlayerList.tsx`: already sources names from `Player[]` (not `LeaderboardEntry`) — swap to the shared helpers; also fixes the sort comparator's `${a.firstName} ${a.lastName}` to tolerate an absent `lastName`.
- `LeaderboardCells.tsx`: not touched — confirmed dead code (zero callers, per the existing codebase audit), not reachable by any real page.

## 5. Deployment sequencing

Order matters here because of the public/private data split:

1. Deploy updated `firestore.rules` (new `publicProfiles` rules + tightened `profiles` read) and run the `publicProfiles` backfill script together — before shipping any client code that depends on `publicProfiles` existing, so logged-out reads never race an empty collection.
2. Redeploy `functions/leaderboard` with `lastName` dropped from its output — this alone stops the `leaderboardCache` leak immediately, independent of client changes.
3. Ship the client code (this branch) — `usePlayers()`, Forum, Leaderboard-family changes.

## 6. Testing

- Unit/component tests updated wherever fixtures currently hardcode `lastName` on `LeaderboardEntry` (`LeaderboardTable.test.tsx`, `ParticipantPopup.test.tsx`, `TeamPopup.test.tsx`, `useLeaderboard.test.ts`, `ranking.test.ts`, `rankHistory.test.ts`, `teamPredictors.test.ts`) — `lastName` removed from the fixture shape to match the real (now-slimmer) type, not just left as unused dead data.
- New tests: `fullName`/`initials` graceful-degradation when `lastName` is absent; `usePlayers()` picks the right collection based on auth state; Forum's like button is genuinely non-interactive (not just visually) when logged out; `pageAccess.ts`/`AppShell.test.tsx`'s existing nav-matches-access-matrix invariant test extended to cover Forum's new logged-out states.
- Manual/Playwright verification: dev server, DevPanel forced into `loggedout_leaguephase`, confirm Forum is reachable via nav, posts render with first-name-only, like button is inert, `ParticipantPopup` opened from a Forum post shows first-name-only too; then force `loggedin_leaguephase` and confirm nothing regressed (full names, working like/reply).
