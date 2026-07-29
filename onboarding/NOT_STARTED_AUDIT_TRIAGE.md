# Not-started stage — full audit, triaged

Written 2026-07-29. Follow-up to `onboarding/NOT_STARTED_REVIEW.md` (which covered UX rough edges) — this one is a security/practice/efficiency pass over the same stage (logged-out Home, logged-in Home, forum, sign-up, profile), excluding mobile and anything only "wrong" because the data is currently fake. Delivered as an interactive artifact (23 items, a note box under each); Mert filled it in and pasted his calls back verbatim below. Grouped here by when it happens, not by category, since that's what actually drives the work queue.

---

## Done (2026-07-29)

All 12 "do now" items were implemented the same session, on top of `main` (not a separate branch). `tsc -b` clean, 582/582 tests passing, `firestore.rules` deployed live.

**04. No field-level validation in any write rule — length, type, or shape.** ✅
> Fix without overkill.
Added to `firestore.rules`: `profiles` (name length 1–15, `photoURL` is a string), `surveyResponses` (age/footballKnowledge ranges, enum checks), `predictions` (ranking is a 36-entry list), `messages` (text 1–360 chars), `forumPosts` (text ≤360, empty only if an image carries the post).

**05. Forum quotes can be fabricated.** ✅
> Fix without overkill.
`forumPosts` create rule now requires that a non-null `quotedPostId` actually exists and that `quotedAuthorUid` matches that post's real `uid` — not validated against the quoted post's *current* text, since a later edit is expected to diverge from the cached snapshot on purpose.

**08. Deleting a profile or a post never cleans up its Storage files.** ✅
> Fix without overkill.
`deleteProfile` now also deletes `profile-photos/{uid}`. `deletePost` takes a third `imageURLs` param (root + every cascaded reply's image) and deletes each from Storage after the Firestore batch commits — best-effort, one missing file doesn't block the rest.

**09. Data freshness is inconsistent across the app.** ✅
> Okay you gotta fix that.
`useProfile`, `usePlayers`, and `usePosts` are all live `onSnapshot` listeners now (previously one-shot `getDoc`/`getDocs` cached per session). `useProfile` specifically got a deduped shared-subscription registry keyed by uid, doubling as the fix for item 20.

**10. Forum posts have no length cap; chat is capped at 360.** ✅
> Cap it at 360 too. Flag at 300, same deal.
`postTypes.ts` now has `POST_MAX_LENGTH`/`POST_LENGTH_WARNING_AT` mirroring chat's constants; enforced in `PostForm.tsx`'s textarea + counter, `createPost.ts`, `editPost.ts`, and server-side in the rules (item 04).

**11. No rate limiting anywhere.** ✅
> Fix without overkill.
New `useSendCooldown` hook (1.2s) wired into `ChatComposer` and `PostForm` — disables the send button and no-ops a duplicate submit for a beat after each successful send. Explicitly *not* a real distributed rate limiter (would need Cloud Functions/App Check) — this only guards against accidental double-sends and a looping/buggy client, which matches "without overkill" for a trust-the-friend-group site.

**15. Sign-up's name fields have no character limit.** ✅
> Cap both at 15.
`maxLength={15}` added to both inputs in `NameStep.tsx`, plus the same 15-char cap enforced server-side (item 04).

**17. The forum re-downloads its entire post history on every single action.** ✅
> Fix it without overkill.
Folded into item 09's `usePosts` conversion — a live listener means every write is reflected immediately without ever re-fetching the whole collection. `refetch` is kept as a no-op purely so `onPosted`/`onRefetch` props threaded through PostForm/Forum/ThreadPopup didn't all need touching.

**18. Chat search re-downloads the entire message history every time.** ✅
> Fix without overkill.
`searchMessages.ts` split into `fetchAllMessagesForSearch()` + pure `filterMessagesByTerm()`. `ChatRoom.tsx` now fetches once per search session (cached in a ref) and filters locally on every later keystroke; closing and reopening search fetches fresh.

**19. No code-splitting — the production bundle ships the entire dev panel.** ✅
> Remove all tuner pages, no use for them anymore.
Deleted `TeamPopupTuner.tsx`, `StatsPageTuner.tsx`, `HomeLoggedInTuner.tsx`, `ForumTuner.tsx`, `ColorTuner.tsx` and their five `/dev/*` routes in `App.tsx`. Left `teamPopupTuning.ts`/`statsPageTuning.ts` alone — real production components (`TeamPopup`, `StatsPage`, `BarChartWidget`, `NumberBox`, `RankedStatList`) still import their `DEFAULT_*` constants from those files.

**20. Your own profile gets fetched twice on first load of nearly every page.** ✅
> Fix.
Fixed by item 09's `useProfile` rewrite: a module-level subscription registry keyed by uid means `AppShell` and the routed page share one `onSnapshot` listener instead of each opening their own; the listener only actually closes once every mount for that uid has unmounted.

**21. Every "who's online" / "who hasn't submitted" list rebuilds its own lookup.** ✅
> Fix without overkill.
New `buildPlayersByUid()` in `profile/playersByUid.ts`, replacing the three separate `new Map(players.map(...))` call sites in `ChatRoom.tsx`, `Forum.tsx`, and `RecentPostsPreview.tsx` (the last of which wasn't even memoized before — now is).

---

## Skip (explicit)

**22. The logged-in Home participant popup is fed hand-built placeholder stats.**
> Eh, fix if you feel like it. I suggest skip but your call. → **Skipping** — matches reality pre-tournament (everyone genuinely is rank #1/0pts), and Mert's own lean was skip.

**23. No moderation or reporting path for uploaded images.**
> Trust the friend group. → No action; this is a confirmed standing design choice, not a gap.

---

## Deferred — after the dev panel is retired

**01. Any signed-in participant can overwrite match results for everyone** (`results` write rule).
**02. Any signed-in participant can flip the tournament phase site-wide** (`tournamentState` write rule).
**03. Dev-only Firestore collections are writable in production, not just in dev builds** (`devConfig`/`devMatches`).
> All three: **We'll fix after we have no use for dev panel.** All three currently rely on "any signed-in user" write access specifically because the dev panel needs it — tightening them (e.g. to Mert's own uid) is real scope, sequenced after the dev panel itself is gone, not bundled into today's pass. Note this is somewhat in tension with item 19 (removing the *tuner pages* now) — the tuners are separate from the core `/dev` DevPanel + `devConfig`/`devMatches`/`results`-writing itself, which stays until later per this item.

---

## Deferred — at/before deployment

**06. Nothing stops the site from being indexed if the link ever leaks** (no `robots.txt`/`noindex`).
> We'll fix at deployment.

**07. 17 known vulnerabilities in production dependencies (3 high)** (`npm audit`, via outdated Firebase SDK).
> We'll fix at deployment.

**13. Link-preview tags point at a domain that isn't actually hosted** (`kupatakipucl.web.app` OG tags, no `firebase.json` hosting config).
> We'll fix before deployment.

---

## Deferred — later / eventually, no fixed trigger

**12. The "temporary" results write rule has no real path to being tightened.**
> We'll fix eventually.

**14. No Content-Security-Policy.**
> We'll fix later.

**16. No centralized error or crash reporting.**
> We'll fix later.

---

## Full artifact reference

Original interactive artifact: https://claude.ai/code/artifact/2af32256-883f-4a1f-a3e0-712be87d4dfb — 23 items with descriptions in full; this file only carries Mert's verdicts against each, grouped by timing. Read the artifact (or ask Claude to re-derive it from the code) if the one-line summary above isn't enough context when any of these actually get picked up.
