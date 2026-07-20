# Design: Forum

Status: Self-directed (same delegation as unit 4 — Mert explicitly asked for continued full autonomy through this unit and the next while away).
Build unit: 5 of 7 in the section-by-section plan (see `SPEC.md` §9b).

## Overview

The 4chan-style threaded forum from `SPEC.md` §6: top-level posts act as thread headers, with replies and replies-to-replies (arbitrary-depth nesting, not flat chronological replies — "replies-to-replies" is explicit spec wording, distinct from vanilla 4chan's flat reply list). Image uploads only, no video/gif. No length cap on text. `pageAccess.ts` already gates `"forum"` to `["NST_LI", "ST_NLI", "ST_LI"]` — notably includes `ST_NLI` (started, **logged out**), unlike chat which is logged-in-only in every state. This one fact drives several decisions below.

## Goals

- Any user in an allowed visibility state (which includes one logged-out state, `ST_NLI`) can read the full forum: every thread and every reply, at any nesting depth.
- Any logged-in user can start a new top-level thread, or reply to any existing post (including replying to a reply).
- Posts may optionally include one image (no video/gif).
- No length cap on post text.
- Sender identity (name) shown per post, reusing the same `usePlayers` lookup chat already established.

## Non-Goals (explicitly deferred)

- Visual/brand polish — bare functional skeleton, same precedent as units 2-4. Mert's explicit instruction stands for this unit too.
- Moderation of any kind — `SPEC.md` §6: "Moderation: none. Full trust in the friend group."
- Post editing or deletion — not requested anywhere in `SPEC.md`; matches chat's "immutable once sent" precedent from unit 4 (same reasoning: no admin panel, no moderation, simplicity).
- Upvoting/rating, rich text/markdown formatting, thread sorting/pagination, collapsing deep reply chains — none requested; a flat "everything renders, oldest first" tree is enough for a bare skeleton at this group's scale.
- Multiple images per post — `SPEC.md` doesn't ask for it, one optional image per post is enough.

## Architecture

- **One-time reads, not real-time.** Unlike chat, `SPEC.md` §6 doesn't say the forum needs live updates — chat's "live, real-time" requirement is chat-specific wording, not repeated for forum. A discussion forum where people reply over time doesn't need `onSnapshot`; a plain fetch-on-mount (matching `useResults`/`useLeaderboard`'s existing pattern) is simpler and consistent with the majority of this codebase. Revisit only if this ever feels stale in practice.
- **Flat collection with a `parentId` reference, not Firestore subcollections.** `forumPosts/{postId}`: `parentId: string | null` (`null` = top-level thread). The full flat list is fetched once and assembled into a tree client-side (`buildThreadTree`), the same "fetch everything, compute the shape in memory" approach `useLeaderboard` already uses for scoring — reasonable at this project's scale (30-50 people), avoids Firestore subcollection query complexity for arbitrary depth.
- **Forum posts are publicly readable in Firestore rules**, not gated to `request.auth != null` — because `pageAccess.ts` explicitly allows `ST_NLI` (logged-out) to see the forum. This mirrors unit 3's exact reasoning for `profiles`/`predictions`/`results`: the app UI is what actually enforces "don't show this to `NST_NLI` visitors" (there's no clean way to encode "tournament phase" into a Firestore rule without duplicating that logic server-side, and `SPEC.md`'s own stance — "trust the friend group, no adversarial threat model" — doesn't ask for that enforcement anyway). Writes (`create`) require auth + self-attributed `uid`, matching every other collection's write rule in this codebase.
- **Images upload before the Firestore write, not after.** `createPost` uploads the image (if any) to `forum-images/{uid}-{timestamp}` first, gets the download URL, then writes one Firestore document with `imageURL` already set — a single write, no "create doc, then patch it with the image URL" two-step dance.
- **Image type allowlist, not a wildcard-minus-gif.** `SPEC.md` says "no video/gif" — rather than trying to express "any image except gif" in Storage rules (awkward), both the file input's `accept` attribute and the Storage rule explicitly allowlist `image/png`, `image/jpeg`, `image/webp`. Simpler to read, and covers what people actually post.
- **Sender-name resolution reuses `usePlayers`** (from `src/profile/`, already relocated there for chat) — third consumer now, further confirming that relocation was the right call.

## Data Model

- `forumPosts/{postId}` (auto-generated Firestore ID): `uid: string`, `text: string`, `imageURL: string | null`, `parentId: string | null`, `createdAt: number`. Immutable once created — no edit history, matching chat's precedent.

## Components & Flow

- **`src/forum/postTypes.ts`** — `ForumPost { uid: string; text: string; imageURL: string | null; parentId: string | null; createdAt: number }`.
- **`src/forum/usePosts.ts`** — one-time fetch of the whole `forumPosts` collection (mirrors `useResults.ts` exactly, just a different collection/type), returns `{ posts: (ForumPost & { id: string })[]; loading: boolean }`.
- **`src/forum/buildThreadTree.ts`** — pure function `buildThreadTree(posts): ThreadNode[]` where `ThreadNode { post: PostWithId; children: ThreadNode[] }`. Groups by `parentId`, sorts top-level posts and each node's children by `createdAt` ascending. No Firestore involved — independently unit-testable.
- **`src/forum/createPost.ts`** — `createPost(uid: string, text: string, imageFile: File | null, parentId: string | null): Promise<void>`. Trims text; rejects empty text with no image (a post needs at least text or an image — an empty post with nothing at all is meaningless, but text-only and image-only are both fine). Uploads the image first if present, then writes the post doc.
- **`src/forum/PostForm.tsx`** — reusable compose form (textarea + optional file input + submit), used both for starting a new thread (`parentId={null}`) and for replying to any existing post (`parentId={post.id}`). Same inline-error-on-failure, preserve-input convention as `ChatRoom`.
- **`src/forum/ThreadNode.tsx`** — renders one post (sender name via the `usePlayers` lookup, text, image if present), a `PostForm` for replying to it, and recursively renders its `children` array (each child is itself a `ThreadNode`).
- **`src/forum/Forum.tsx`** — top-level: a `PostForm` for starting a new thread, then the list of top-level `ThreadNode`s built from `usePosts()` + `buildThreadTree()`, with names resolved via `usePlayers()`.
- **`src/pages/ForumPage.tsx`** — replaces the `PlaceholderPage` wrapper: `isPageAllowed("forum", state)` gate (unlike chat/predictions/leaderboard, this state can legitimately be logged-out — so this page must not assume `user` is non-null the way `ChatPage`/`PredictionsPage` safely do; new-thread/reply forms should only render when actually logged in, read-only browsing works either way), then renders `Forum`.

## Data Flow

`usePosts` (flat list) + `usePlayers` (name lookup) feed `Forum`, which calls `buildThreadTree` once to shape the data, then recursively renders `ThreadNode`s. Creating a post (new thread or reply) goes through `createPost` → Storage upload (if image) → Firestore write. `usePosts` exposes a `refetch()` alongside `posts`/`loading` (a small addition beyond a bare one-time fetch — re-runs the same query, not a live listener), which `PostForm` calls on a successful post so the poster immediately sees their own new post without a manual page reload. This doesn't contradict the no-`onSnapshot` decision above: it's a self-triggered refresh of your own action, not a cross-user live feed — another participant's reply still won't appear until the next natural page load, which stays the accepted bare-skeleton gap.

## Error Handling

- `usePosts` read failure: logs and stops loading, matching every other read hook's `.catch` convention (`useResults`, `usePlayers`, etc.).
- `createPost` failure (upload or write): `PostForm` catches it, shows an inline Turkish error, preserves the typed text and selected image so nothing is lost — same convention as `ChatRoom`'s send-failure handling.
- Empty submission (no text AND no image) is rejected client-side before any write is attempted.

## Security Rules

- **Firestore** `forumPosts/{postId}`: `allow read: if true` (public — see Architecture); `allow create: if request.auth != null && request.resource.data.uid == request.auth.uid`; `allow update, delete: if false` (immutable, no admin panel).
- **Storage** `forum-images/{imageId}`: `allow read: if true` (public, matching the post visibility above); `allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024 && request.resource.contentType in ['image/png', 'image/jpeg', 'image/webp']` (5MB cap, same as `profile-photos`; explicit type allowlist, no gif).

## Testing Approach

Same Vitest + React Testing Library pattern as every prior unit, Firestore/Storage mocked at the module level. Key cases: `buildThreadTree` — flat list → correct nested shape, multi-level nesting (reply-to-a-reply), chronological ordering at each level, empty input → empty output; `usePosts` — standard one-time-read hook cases (populates, error degrades gracefully); `createPost` — text-only, image-only, both, rejects fully-empty, propagates write/upload rejection; `PostForm` — submits with the right `parentId`, preserves input on failure, rejects empty submission; `ThreadNode` — renders a post and recursively renders 2+ levels of nested children correctly; `ForumPage` — gates correctly, and specifically confirms the compose form doesn't render (or doesn't attempt to post) when the visitor is logged out in `ST_NLI`, since forum is the first page in this app where "allowed to view" and "allowed to post" genuinely diverge.

## Setup Dependencies (needs Mert, not just Claude)

- Firestore rules deploy, Storage rules deploy: same CLI-first-then-console-fallback story as every prior unit's rules changes. If the IPv6 outage from unit 4 is still ongoing, these stay committed-but-undeployed, batched with chat's same outstanding item.
- Manual browser verification: image upload actually rendering, and the recursive nested-reply UI actually reading sensibly at 3+ levels deep — no browser automation available in this session.

## Follow-ups for Later Units

- Real-time forum updates (if the one-time-read gap ever proves annoying in practice).
- Visual polish, image thumbnails/lightbox — `impeccable` pass (`SPEC.md` §9a).
- Stats page (unit 6) and automated results ingestion (unit 7, `SPEC.md` §7) remain separate, unbuilt.
