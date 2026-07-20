# Design: Chatroom

Status: Self-directed (Mert explicitly delegated this unit's judgment calls — "start building using your own judgement with full autonomy without prompting me for anything" — so this doc skips the usual interactive brainstorming Q&A and documents the calls made instead, for him to review after the fact).
Build unit: 4 of 7 in the section-by-section plan (see `SPEC.md` §9b).

## Overview

The single shared, live, real-time chatroom from `SPEC.md` §6: one room for everyone (no channels), permanent scrollback (no clearing/archiving), live updates without a manual refresh. `pageAccess.ts` already gates `"chat"` to `["NST_LI", "ST_LI"]` (logged-in only, either tournament phase) from unit 1 — no changes needed there.

## Goals

- Any logged-in user can read the full, permanent message history and send new messages.
- New messages from any participant appear live for everyone currently on the page, without a refresh (`SPEC.md` §6's explicit requirement).
- Messages are never edited, deleted, or cleared — a message, once sent, is part of the permanent record.
- Sender identity (name) is shown next to each message.

## Non-Goals (explicitly deferred)

- Any visual/brand polish — bare functional skeleton, same precedent as units 2-3. Per Mert's explicit instruction for this round: "no sophisticated frontend design though, that's still for later."
- Message editing or deletion (not requested anywhere in `SPEC.md`; "permanent scrollback" argues against it, and moderation is explicitly "none").
- Rate limiting / spam prevention / profanity filtering — `SPEC.md` §6 says "Moderation: none. Full trust in the friend group."
- Sender photos in the message list — an identity/visual nicety, not required by §6's text, and the kind of polish this pass is explicitly deferring. Sender name (first + last, matching the display convention already used in `LeaderboardTable`/`PlayerList`) is enough for a functional skeleton.
- Read receipts, typing indicators, reactions, threading — none requested; §6 describes a flat live chat, and forum (a separate future unit) is where threading actually belongs.
- Message search/pagination — permanent scrollback with no stated volume concern; revisit if it ever becomes a real problem, not preemptively.

## Architecture

- **Real-time mechanism: Firestore `onSnapshot`**, not a new service. This is a deliberate call: the project's stated backend preference is "strictly free" (`SPEC.md` §7a) and everything else already runs on Firestore. Firestore's realtime listeners satisfy "live, real-time... not a refresh-to-see wall" directly, with no new dependency, no new billing surface, and no new deploy/IAM story (relevant after this session's `stopbilling` experience — every new Google Cloud surface has had a real setup cost so far; avoiding one here is a genuine simplification, not just a preference).
- **Timestamps stay plain client-side `Date.now()` numbers**, matching every other collection in this codebase (`Prediction.submittedAt`, `Profile.createdAt`, etc.) rather than introducing `serverTimestamp()`'s async-resolves-to-null-then-a-value semantics. Given the "no adversarial threat model, trust the friend group" stance already established for this project, minor client clock skew affecting message order is an acceptable bare-skeleton tradeoff, not a real problem — revisit only if it actually causes visible ordering glitches.
- **Sender name resolution reuses `usePlayers`** (currently under `src/leaderboard/`) rather than a new profile-lookup hook — it already does exactly "fetch all profiles once, expose as an array," which is what a uid→name lookup for chat needs. Since this hook is no longer leaderboard-specific once chat also depends on it, it's relocated to `src/profile/usePlayers.ts` (alongside the existing single-profile `useProfile.ts`) as part of this unit — a small, directly-motivated move, not a speculative refactor.
- **Known limitation, accepted deliberately:** `usePlayers`'s one-time fetch means a brand-new participant who completes their profile *while* another user already has the chat page open won't have their name resolved until that other user's next full reload. Given the app already gates all real activity behind profile completion (`ProfileGate`), and this project's scale (30-50 people), this is a narrow, low-consequence race — not worth a second live listener to close.

## Data Model

- `messages/{messageId}` (auto-generated Firestore ID via `addDoc`): `uid: string`, `text: string`, `createdAt: number`. No `updatedAt`/edit history — messages are immutable once sent.

## Components & Flow

- **`src/chat/messageTypes.ts`** — `Message { uid: string; text: string; createdAt: number }`.
- **`src/profile/usePlayers.ts`** (relocated from `src/leaderboard/usePlayers.ts`, same content) — used by both `leaderboard/useLeaderboard.ts`'s sibling components and the new `ChatPage`.
- **`src/chat/useMessages.ts`** — subscribes via `onSnapshot` to `messages` ordered by `createdAt` ascending, returns `{ messages: (Message & { id: string })[], loading: boolean }`. Unsubscribes on unmount.
- **`src/chat/sendMessage.ts`** — `sendMessage(uid: string, text: string): Promise<void>`, trims `text`, no-ops on empty/whitespace-only input (caller should also disable the send action for empty input, this is the defensive second layer), writes via `addDoc`.
- **`src/chat/ChatRoom.tsx`** — presentational-plus-state component: renders the message list (each message: sender's `firstName lastName` via a uid→player lookup map built from `usePlayers()`, falling back to the raw uid if no matching profile is found instead of crashing) and a text input + send button. Submitting calls `sendMessage`, then clears the input. Enter-to-send supported (standard, low-effort chat UX, not "sophisticated design").
- **`src/pages/ChatPage.tsx`** — replaces the `PlaceholderPage` wrapper: gates via `isPageAllowed("chat", state)` (matching `PredictionsPage.tsx`/`LeaderboardPage.tsx`'s existing convention exactly), then renders `ChatRoom` fed by `useMessages()` + `usePlayers()` + the current user's `uid` from `useAuth()`.

## Data Flow

`useMessages` (live) + `usePlayers` (one-time) both feed `ChatRoom`; sending a message goes through `sendMessage` → Firestore write → the sender's own `onSnapshot` subscription picks it back up like any other client's, so there's no separate "optimistic local echo" to build or keep in sync — the real-time listener already is the source of truth for what the sender sees, arriving within normal Firestore latency (typically well under a second).

## Error Handling

- `useMessages`'s `onSnapshot` error callback logs and stops `loading` (matching every other read hook's `.catch` convention), leaving whatever messages were already loaded on screen rather than clearing them — a transient listener error shouldn't blank out history the user was already reading.
- `sendMessage` rejection: `ChatRoom` catches it, shows an inline Turkish error (matching `PredictionsPage.tsx`'s established pattern for write failures), and leaves the user's typed text in the input so nothing is lost and they can retry.
- Empty/whitespace-only submissions are rejected client-side before any write is attempted (button disabled + defensive check in `sendMessage`).

## Security Rules

New `firestore.rules` block: `messages/{messageId}` — `allow read: if request.auth != null` (matches `chat`'s existing logged-in-only page gate — no reason to make chat content public when the page itself isn't reachable by logged-out visitors); `allow create: if request.auth != null && request.resource.data.uid == request.auth.uid` (a user can only ever create a message attributed to themselves); `allow update, delete: if false` (permanent scrollback, no admin panel — matches the exact pattern already used for `surveyResponses`).

## Testing Approach

Same Vitest + React Testing Library pattern as every prior unit, `firebase/firestore` mocked at the module level. `onSnapshot` is a new mocking shape not used anywhere else in this codebase yet — the mock needs to capture the callback passed to `onSnapshot` and let tests invoke it directly to simulate a new snapshot arriving (standard pattern: `vi.fn` capturing the callback argument, tests call it manually with a fake `QuerySnapshot`-shaped object, and return an unsubscribe `vi.fn` so the cleanup-on-unmount path is also testable). Key cases: `useMessages` renders an initial snapshot, updates when a new snapshot arrives, unsubscribes on unmount, degrades gracefully on an error callback; `sendMessage` trims/rejects empty text, writes the right shape, propagates a write rejection; `ChatRoom` resolves sender names via the players lookup, falls back to raw uid for an unknown sender, shows the write-error message and preserves input text on a failed send, clears input on success; `ChatPage` gates correctly via `isPageAllowed` (mirroring the exact test already written for `LeaderboardPage`).

## Setup Dependencies (needs Mert, not just Claude)

- The new `messages` collection's Firestore rule needs deploying. CLI deploy will be attempted first (now that `firebase.json`/`.firebaserc` exist from unit 3); if the same IPv6 outage recurs, the console-paste fallback used for unit 3's rules update applies here too and needs Mert to click Publish.
- Real-time multi-session verification (confirming a message sent in one browser tab actually appears live in another without a refresh) needs an actual browser — no automation available in this environment. Everything else (write succeeds, read returns the right shape, rules enforce the right permissions) can be verified via direct Firestore REST calls the way prior units' backend behavior was checked.

## Follow-ups for Later Units

- Sender photos and any visual polish — `impeccable` pass (`SPEC.md` §9a), whole-site at once.
- Message pagination/virtualization if scrollback ever grows large enough to matter (no evidence yet that it will, at this group's scale).
- Forum (unit 5) is a separate, more complex threaded system — not a chat variant, gets its own design.
