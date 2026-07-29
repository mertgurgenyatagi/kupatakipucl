# Design: Special Lobby

Status: Product spec fully locked by Mert across 9 rounds of interactive Q&A (`onboarding/speciallobby-questionnaires/special-lobby-round-1.md` through `round-9.md`) before this technical design started. This doc covers the *how*, not the *what* — none of the product decisions in those files are re-litigated here. Three additional architecture-level questions were asked and resolved during this brainstorm (scope reality, rollout strategy, membership storage) and are folded into the sections below.

## Overview

A private, invite-only friend-group sub-scope of the main app. Up to 3 lobbies creatable per user, up to 3 joinable at once, invite-only via shareable deep links (no public discovery). Lobbies get their own chat thread and their own filtered view of the participant-status widget. Full product rationale lives in the 9 questionnaire rounds; this doc assumes that spec as given.

**Critical scope-reality finding from this brainstorm:** the product spec was written assuming three lobby-aware surfaces — a dedicated Chat page, a dedicated Rankings page, and Home. Neither of the first two actually exists as a reachable surface during the `notstarted` tournament phase (the only phase this feature targets, per Mert's own scoping):

- There is no standalone Chat route, ever. Chat only exists embedded in `HomeLandingLoggedIn.tsx`'s "Sohbet" cell.
- `/leaderboard` exists as a route, but `pageAccess.ts`'s `PAGE_ACCESS` table excludes `notstarted` entirely — the page renders only "Bu bölüm şu anda kullanılamıyor." during this phase and isn't in the nav.

Confirmed with Mert directly: **build only what exists today.** No new standalone Chat page, no unlocking Leaderboard early. The lobby-aware surface is exactly two embedded cells on the logged-in Home page: "Sohbet" (wraps `ChatRoom`) and "Katılımcılar" (`ParticipantStatusList`, the prediction-submission-status widget, which doubles as the closest thing to "rankings" that exists pre-tournament — real leaderboard math has no live page to attach to right now).

**Rollout:** one cohesive branch/PR at the end, built in internal phases (data layer → lobby CRUD → chat → Home integration → panel/polish), matching how the last two large features this session (optimization sweep, forum rebuild) landed.

## Goals

- Any signed-in participant can create up to 3 lobbies and belong to up to 3 at once.
- Lobbies are invite-only via a shareable deep link; no in-app search-and-add, no public listing.
- Home's Sohbet and Katılımcılar cells each independently switch between "Genel" and any of the user's lobbies via a small cycling arrow control, defaulting to the most-recently-joined lobby once a user has one.
- A lobby's chat is a fully separate thread (not a filtered view of global chat), with quiet system messages for creation/join/leave/removal/rename.
- A lobby's Katılımcılar view is the existing widget fed a lobby-filtered player/submitter set — no new component needed.
- A single management panel (modal) handles rename, invite-link generation, member list, leave, and creator-only delete.

## Non-Goals (explicitly deferred or out of scope)

- Forum — dropped entirely from lobby scope (Round 1); the existing forum, including its Home preview cell, is untouched.
- Predictions submission page — stays global; you submit once, not per-lobby (Round 7).
- Stats page — entirely untouched.
- Anything about the `started` tournament phases — this feature is scoped to `notstarted` only, matching Mert's explicit instruction and the site's current state (started-phase pages are still placeholder blurbs).
- Mobile-specific work.
- A standalone Chat page or an early-unlocked Leaderboard page — see the scope-reality finding above.
- Server-side enforcement of the 3-lobby create/join caps — see Error Handling & Known Limitations.
- Automated Firestore rules testing (emulator suite) — see Testing Approach.
- Cascading deletes of a lobby's `messages`/associated invite docs when the lobby itself is deleted — see Error Handling.

## Architecture

- **Membership: subcollection, not an array field.** `lobbies/{lobbyId}/members/{uid}` (one doc per member, doc ID = uid) rather than a `memberUids` array on the lobby doc. This was the one genuine fork in this design — resolved with Mert in favor of the subcollection specifically because it lets the security rule verify a join is backed by a real, unexpired invite via `exists()`/`get()`, matching the rigor already applied elsewhere in `firestore.rules` this session (forum quote integrity, field validation). An array-field join would only be checkable by the client, meaning a leaked lobby ID could let someone bypass invite links entirely.
- **Invites: top-level collection, not nested.** `lobbyInvites/{inviteId}` rather than `lobbies/{id}/invites/{id}`, so a deep-link URL only needs to carry the invite ID (`#/join/:inviteId`) and can resolve the lobby without the link needing to embed its ID too.
- **No Cloud Functions, no new backend infra.** Matches the rest of this codebase exactly — system-message text is authored and written by whichever client's action triggers it (there's no trusted server to author it instead), and there's no counter/aggregate document backing the 3-lobby caps.
- **Presence and typing indicators are not lobby-scoped data.** They reuse the existing global `presence`/`typingStatus` collections unchanged; a lobby view just filters the same global data down to that lobby's member uids client-side. No new collections, no new rules.
- **`ChatRoom.tsx` and `ParticipantStatusList.tsx` stay lobby-agnostic.** Both are already pure, prop-driven components. All lobby-awareness lives in the composition layer (`LoggedInHome.tsx` / `HomeLandingLoggedIn.tsx`), which decides which data source feeds each cell based on that cell's own switcher state. `ChatRoom.tsx` needs exactly one addition: rendering a message's optional `system` field as a centered muted line instead of a bubble.

## Data Model

**`lobbies/{lobbyId}`**
```
name: string          // ≤15 chars, editable by any member
createdByUid: string  // immutable; powers the crown icon + "started by" credit
createdAt: number
```

**`lobbies/{lobbyId}/members/{uid}`** (doc ID = uid)
```
uid: string           // duplicated from doc ID so collection-group queries can filter on it
joinedAt: number
viaInviteId: string | null  // null only for the creator's own bootstrap membership — see rules below
```

**`lobbyInvites/{inviteId}`** (top-level)
```
lobbyId: string
createdByUid: string
createdAt: number
expiresAt: number    // createdAt + 1 hour
```
No update or delete path. Expired docs are simply ignored by every read and never cleaned up — a deliberate no-op, not an oversight, at this data volume.

**`lobbies/{lobbyId}/messages/{messageId}`** — same shape as the existing top-level `messages` collection (`uid`, `text`, `createdAt`, `deleted?`, `quoted*?`), plus:
```
system?: { kind: "created" | "joined" | "left" | "removed" | "renamed"; subjectUid?: string }
```
When present, `text` holds the actual Turkish display copy, baked in at write-time by the triggering client (e.g. the joining user's own client writes `{system: {kind: "joined", subjectUid: <them>}, text: "Ahmet katıldı."}`). No render-time i18n/formatting layer — there's no server whose reconstruction of that string would need to be trusted anyway.

## Components & Flow

**Hooks** (all following the existing dedup-subscription-registry pattern from `useProfile.ts`/`usePosts.ts`/`usePlayers.ts` — module-level registry, reference-counted, live via `onSnapshot`):
- `useMyLobbies()` — a `collectionGroup("members").where("uid", "==", myUid)` listener (which lobby IDs I'm in + my own `joinedAt`, powering the "default to most-recently-joined" rule) joined against a `where(documentId(), "in", lobbyIds)` listener on `lobbies` (name/createdByUid for display). At most 3 IDs either way. Dedup-keyed by uid. Powers both Home cells' switcher option lists.
- `useLobbyMembers(lobbyId: string | null)` — live listener on `lobbies/{id}/members`, dedup-keyed by **lobbyId** (both Home cells could plausibly show the same lobby at once). Null-safe, mirroring `useProfile(uid: string | null)`.
- `useLobbyMessages(lobbyId: string | null)` — mirrors `useMessages()`'s 50-message live window + `loadOlder()` pagination, pointed at `lobbies/{id}/messages`, null-safe. Shared pagination logic extracted into one helper both hooks call rather than duplicated.

Member/player display data comes from filtering the already-fetched global `players` roster (`usePlayers()`) down to whatever `useLobbyMembers()` returns, via the existing `buildPlayersByUid()` helper — no new player-fetching.

**Action functions**, one file each, matching the existing `src/forum/createPost.ts` convention: `createLobby()` (writes the lobby doc *and* the creator's own bootstrap `members/{uid}` doc — `viaInviteId: null` — as one batch, plus the `created` system message), `generateLobbyInvite(lobbyId)`, `joinLobbyViaInvite(inviteId)`, `leaveLobby(lobbyId)` (auto-deletes the lobby if the leaver is both creator and last member), `removeMember(lobbyId, uid)`, `renameLobby(lobbyId, name)` (also writes the `renamed` system message), `deleteLobby(lobbyId)`.

**New UI components:**
- `LobbySwitcher` — the "› Genel" chevron control. Cycles General → Lobby A → Lobby B → Lobby C → wraps to General. Reuses the site's existing accent color token. Every occurrence (Home's two cells) is fully independent — no shared "current lobby" state, no persistence; each mount computes its own default (most-recently-joined lobby, or General) fresh from `useMyLobbies()`.
- `LobbyManagementPanel` — a `Dialog`-based modal (shadcn, already in the codebase): inline name/rename (≤15 chars), a "Get invite link" button (generates a fresh 1-hour link on demand — no passive auto-ready link, no reset/cooldown mechanic), member list (name + photo, crown icon for the creator, presence dot reusing the existing indicator), "Leave lobby" (no confirmation), and — creator-only — "Delete lobby" (confirmation required, matching the existing account-deletion pattern in `ProfilePage.tsx`).
- `JoinLobbyPage` — new route `/join/:inviteId`. See Error Handling for its full outcome matrix.

**One new piece of infrastructure:** no toast/snackbar component exists anywhere in this codebase yet (`src/components/ui/` has `avatar`, `frame`, `skeleton`, `table`, `button`, `dialog` — no toast). Adding shadcn's own toast primitive (`sonner`, via the same `npx shadcn add` flow the other primitives came in through) for the two manually-dismissed error toasts the spec calls for (at-cap, dead link), rather than a bespoke implementation or an unrelated library.

## Data Flow

Home's two cells (`HomeLandingLoggedIn.tsx`) each hold their own switcher selection state, computed once per mount from `useMyLobbies()`. Based on that selection, each cell independently calls either the existing global hooks (`useMessages()`, global `players`/`submitterUids`) or the new lobby-scoped equivalents (`useLobbyMessages(lobbyId)`, `useLobbyMembers(lobbyId)` filtered against the global roster), and feeds the result into the unchanged `ChatRoom`/`ParticipantStatusList` components. Joining via `/join/:inviteId` writes a `members/{uid}` doc (rule-verified against the referenced invite) and a `joined` system message in the same lobby's `messages` subcollection, then redirects to `/`.

## Error Handling & Known Limitations

**`/join/:inviteId` outcome matrix:**
1. Not signed in → redirect to `/`. No new-signup-via-link flow (explicitly out of scope, Round 3).
2. Invite doesn't exist, or `expiresAt` has passed → toast "no longer valid" → redirect to `/`.
3. Invite's `lobbyId` points at a since-deleted lobby → same "no longer valid" treatment (the join write fails the rule's `exists()` check on the lobby doc; surfaced identically to case 2).
4. Already a member → silent no-op redirect, no error, no duplicate write.
5. Already at the 3-lobby cap → toast explaining the limit, checked client-side via `useMyLobbies()`'s count *before* attempting any write.
6. Otherwise → join succeeds, `joined` system message written, redirect to `/`.

**A lobby disappearing out from under a live view.** If a currently-selected lobby (in either Home cell) is deleted or the viewer is removed from it, `useMyLobbies()`'s live update surfaces this in real time — the switcher falls back to "Genel" automatically rather than showing a broken state for a lobby the user is no longer in.

**Known, accepted limitations (flagged explicitly, not silent):**
- The 3-lobby create/join caps are enforced client-side only. Firestore rules can't count across a collection-group query at write time, and there's no server to maintain a counter. A normal user can't exceed the cap through the UI; someone bypassing the UI entirely via raw Firestore calls could. Same treatment already given to rate-limiting elsewhere in this app.
- Deleting a lobby does not cascade-delete its `messages` subcollection or any `lobbyInvites` docs referencing it. They become permanently unreadable (rules require membership; none remain) but aren't actively cleaned up — avoids needing either a Cloud Function or client-side recursive batch-deletes for data that costs negligible storage and can never be read again anyway.
- Renaming enforces the same 15-char cap client-side (`maxLength`) and server-side (mirrored rule check), matching the existing profile/forum pattern.

## Security Rules

New `firestore.rules` blocks, following the existing field-validation-heavy style:

- `lobbies/{lobbyId}`: `read` requires an existing `members/{request.auth.uid}` doc under this lobby; `create` open to any signed-in user with `name` validated (string, 1–15 chars) and `createdByUid == request.auth.uid`; `update` (rename) requires an existing member doc and the same name validation, restricted to the `name` field only via `diff().affectedKeys()`; `delete` requires `resource.data.createdByUid == request.auth.uid`.
- `lobbies/{lobbyId}/members/{uid}`: `read` requires an existing member doc for the requester. `create` requires `request.auth.uid == uid`, then branches: either `request.resource.data.viaInviteId == null` **and** `get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.createdByUid == request.auth.uid` (the creator's own bootstrap membership, written in the same batch as the lobby doc itself), **or** `viaInviteId` references a `lobbyInvites` doc whose `lobbyId` matches this lobby and whose `expiresAt > request.time` (a normal invite-gated join). `delete` allowed if `request.auth.uid == uid` (leaving) **or** `get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.createdByUid == request.auth.uid` (the creator removing someone else — checked against the *lobby* doc's own field, not the member doc, which carries no such data).
- `lobbyInvites/{inviteId}`: `read` for any signed-in user (a not-yet-member needs to resolve the token before joining); `create` requires an existing member doc for the requester on the referenced `lobbyId`, plus `expiresAt` validated as `createdAt + 1 hour`; no `update`/`delete`.
- `lobbies/{lobbyId}/messages/{messageId}`: mirrors the existing top-level `messages` rules (text length ≤360, sender-only `deleted` flip, no real update/delete otherwise), gated additionally on an existing member doc for `read`/`create`.

## Testing Approach

Same Vitest + RTL conventions as the rest of this codebase: `vi.mock` per file, `act()`-wrapped `onSnapshot` callback invocation, captured `(query, onNext, onError)` mock args.

- **Hooks:** `useMyLobbies`/`useLobbyMembers`/`useLobbyMessages` get the same dedup / live-update / unsubscribe-refcount / null-safety test shape already proven for `useProfile`/`usePosts`/`usePlayers`.
- **Actions:** one test file per action function, mocking the relevant Firestore calls, matching the existing `createPost.test.ts`/`deletePost.test.ts` style — success path plus each rejection a rule would produce.
- **Components:** `LobbySwitcher` (cycling/wraparound, default-selection logic), `LobbyManagementPanel` (rename validation, invite generation, leave vs. creator-only-and-confirmed delete), `JoinLobbyPage` (every branch of the outcome matrix above).
- **Integration:** `HomeLandingLoggedIn`/`LoggedInHome` — both cells switch independently and feed the right data source; the disappearing-lobby-falls-back-to-Genel behavior.
- **Firestore rules:** no automated rules-testing harness (`@firebase/rules-unit-testing`/emulator) exists in this repo, and every rules change this session so far has been verified by hand-reasoning plus a live deploy and a Playwright spot-check. Continuing that approach here rather than standing up an emulator suite, even though this feature's rules are the most complex yet (the invite-gated membership check especially) — still small and reviewable enough to reason through directly. This is a real trade-off, not an oversight; worth a different call if the security surface here ever feels like it warrants the heavier setup.

## Setup Dependencies (needs Mert, not just Claude)

- New `firestore.rules` blocks need deploying (`firebase deploy --only firestore:rules`), same as every prior rules change this session.
- Real invite-link, multi-session join behavior (confirming a link generated in one browser session actually joins a different account in another) needs an actual browser — Playwright can drive this against the real dev server + real Firestore backend, same pattern as this session's earlier spot-checks.

## Follow-ups for Later Work (explicitly not this pass)

- A real lobby-scoped leaderboard, once the site-wide Leaderboard page itself unlocks post-tournament-start.
- A standalone Chat page, if one ever gets built independent of this feature.
- Anything about lobby behavior once the tournament moves past `notstarted`.
