# Forum (logged-out access) & site-wide surname privacy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open Forum to logged-out visitors during every started tournament phase (read-only), and make participant surnames genuinely unreachable by a logged-out session anywhere in the app — not just hidden in Forum's UI.

**Architecture:** Split participant name data into a public subset (`publicProfiles`: firstName/photo, publicly readable) and a private full doc (`profiles`: adds lastName, signed-in-only readable) at the Firestore layer, since security rules can't filter individual fields out of a single document read. Strip the same `lastName` denormalization out of the server-computed `leaderboardCache` doc, since that's a second, independent public leak of the same field. Client code centralizes name/initials formatting into one helper pair that gracefully degrades to first-name-only when `lastName` is absent, then every consumer (Forum, Leaderboard family) adopts it.

**Tech Stack:** React 18 + TypeScript, Firebase (Firestore rules + Cloud Functions v2), Vitest + React Testing Library.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-forum-logged-out-and-name-privacy-design.md` — every task below implements one of its sections; consult it for the "why" behind any step.
- No visual/layout redesign anywhere in this plan — functional wiring only.
- Mobile layout is out of scope, per existing site-wide convention.
- Logged-in behavior must not change anywhere — full names keep showing exactly as today for signed-in viewers.
- Home's logged-out league-phase content is explicitly out of scope.
- Turkish user-facing copy stays Turkish; no new copy is introduced by this plan (only visibility/interactivity of existing copy changes).
- Follow this codebase's existing conventions exactly: `cn()` for conditional classes, `Frame`/`FrameBody` for panels, the "Cursorify" rule (only real interactive elements get `cursor-pointer`), Vitest + `@testing-library/react` with the project's established Firebase-mocking pattern (mock `firebase/firestore` functions directly, mock `../firebase` as `{ db: {} }`).

---

## Phase A — Backend / data layer

### Task 1: Firestore rules — `publicProfiles` collection + tightened `profiles` read

**Files:**
- Modify: `firestore.rules:8-22` (the existing `match /profiles/{uid}` block)

**Interfaces:**
- Produces: a new `publicProfiles/{uid}` collection, publicly readable, holding `{firstName, photoURL, createdAt}` only. `profiles/{uid}` read now requires `request.auth != null`.

This repo has no Firestore rules test harness (no emulator test suite exists) — verification here is a careful manual read plus the later tasks' passing test suites, which exercise the client code that depends on these rules being shaped this way.

- [ ] **Step 1: Edit the `profiles` match block's read rule**

In `firestore.rules`, change:

```
    match /profiles/{uid} {
      allow read: if true;
```

to:

```
    match /profiles/{uid} {
      // Tightened 2026-08-02: lastName lives only here now (see
      // publicProfiles below) — Firestore rules can't filter individual
      // fields out of a document read, so keeping lastName out of a
      // logged-out visitor's hands means the whole doc goes signed-in-only.
      allow read: if request.auth != null;
```

- [ ] **Step 2: Add the new `publicProfiles` match block immediately after the `profiles` block's closing `}`**

```
    // Public subset of `profiles` — firstName/photo only, no lastName ever.
    // Written alongside `profiles` at every profile write site
    // (src/profile/useProfile.ts). Exists so logged-out visitors (whose
    // browsing may be search-engine indexed) can never receive a
    // participant's surname, while `profiles` keeps serving full data to
    // any signed-in viewer exactly as before.
    match /publicProfiles/{uid} {
      allow read: if true;
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.firstName is string
        && request.resource.data.firstName.size() > 0
        && request.resource.data.firstName.size() <= 15
        && request.resource.data.photoURL is string
        && request.resource.data.createdAt is number
        && !("lastName" in request.resource.data);
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
```

- [ ] **Step 3: Manually re-read the full edited block for syntax correctness**

Firestore rules have no local compiler in this repo — read the edited `firestore.rules` file back top-to-bottom around both match blocks and confirm brace balance and that no other rule in the file references `profiles` in a way that assumed public read (grep the whole file for `/profiles/` to check — the earlier investigation found no other match block reads it).

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "Add publicProfiles collection, tighten profiles read to signed-in only"
```

---

### Task 2: `functions/leaderboard` — drop `lastName` from the computed leaderboard

**Files:**
- Modify: `functions/leaderboard/index.js:58-66`
- Modify: `src/leaderboard/leaderboardTypes.ts`
- Test: `src/leaderboard/leaderboardTypes.ts` has no dedicated test file (it's a pure type) — verified via the TypeScript compiler during Task 7, which updates every consumer.

**Interfaces:**
- Produces: `LeaderboardEntry` no longer has a `lastName` field. `recomputeLeaderboard()` no longer writes `lastName` into `leaderboardCache/current`.

- [ ] **Step 1: Remove `lastName` from the `LeaderboardEntry` type**

In `src/leaderboard/leaderboardTypes.ts`, change:

```ts
export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  lastName: string;
  photoURL: string;
  points: number;
  ranking: string[];
  /** Optional only so existing fixtures/tests that predate this field don't
   *  need updating — every real prediction doc has one. */
  submittedAt?: number;
}
```

to:

```ts
export interface LeaderboardEntry {
  uid: string;
  firstName: string;
  photoURL: string;
  points: number;
  ranking: string[];
  /** Optional only so existing fixtures/tests that predate this field don't
   *  need updating — every real prediction doc has one. */
  submittedAt?: number;
}
```

(Note: this intentionally leaves the codebase non-compiling until Task 7 updates every consumer — the two tasks are tightly coupled and reviewed together. Do not run the full test suite between Task 2 and Task 7; `npx tsc --noEmit` will show the expected excess-property/missing-property errors in `LeaderboardTable.tsx`, `ParticipantPopup.tsx`, `TeamPopup.tsx`, `PlayerList.tsx`, and their test files until Task 7 lands.)

- [ ] **Step 2: Remove the `lastName` line from the Cloud Function's entry construction**

In `functions/leaderboard/index.js`, change:

```js
    entries.push({
      uid: doc.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
```

to:

```js
    entries.push({
      uid: doc.id,
      firstName: profile.firstName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
```

- [ ] **Step 3: Commit**

```bash
git add functions/leaderboard/index.js src/leaderboard/leaderboardTypes.ts
git commit -m "Drop lastName from leaderboardCache — it was a second public leak of the same field"
```

Note for later deployment: this function is not redeployed by this plan's steps (deployment is a manual, developer-run action per this project's convention — see spec §5). Flag to the user before running `firebase deploy --only functions:recomputeLeaderboardOnPrediction,recomputeLeaderboardOnResult` once this branch merges.

---

### Task 3: Migration script — backfill `publicProfiles`

**Files:**
- Create: `scripts/backfill-public-profiles.mjs`

**Interfaces:**
- Produces: a one-off Node script, run by hand (`node scripts/backfill-public-profiles.mjs`), following the exact auth pattern of `scripts/seed-dummy-participants.mjs` (read that file first to copy its `gcloud auth print-access-token` + REST-call setup verbatim — do not reinvent it).

- [ ] **Step 1: Read the existing seed script for its auth/REST pattern**

Read `scripts/seed-dummy-participants.mjs` in full. It already establishes: how the script obtains a REST access token via `gcloud auth print-access-token`, the Firestore REST base URL / project ID it targets, and how it shapes a `PATCH`/`POST` REST body for a Firestore document write. Reuse that exact scaffolding — same token acquisition, same base URL construction, same error handling around a failed `gcloud` call — rather than writing a parallel implementation.

- [ ] **Step 2: Write the script**

`scripts/backfill-public-profiles.mjs` should:
1. Acquire the access token the same way the seed script does.
2. `GET` every document in the `profiles` collection via the Firestore REST API (paginated with `pageToken` if the seed script's pattern already handles pagination — mirror it; if not, a single unpaginated list call is fine at this project's real scale, ~50-100 docs).
3. For each `profiles/{uid}` doc, `PATCH` (create-or-overwrite) `publicProfiles/{uid}` with exactly `{firstName, photoURL, createdAt}` extracted from the source doc — no `lastName`, no other fields.
4. Log a running count (`Backfilled N/${total} public profiles`) and a final summary, matching this project's existing scripts' console-output style (check `scripts/set-dev-config.mjs` for tone/format if the seed script's own logging is sparse).
5. Exit non-zero with a clear message if the access token can't be obtained, same failure-mode convention as the seed script.

- [ ] **Step 3: Dry-run against the real project is a manual, out-of-band action — do not run it automatically**

This script writes to the real, single Firebase project this codebase points at (no dev/prod split exists — see `PROJECT_STATE.md` §1). Flag to the user that running it is their call, to be done as part of the Task 1 rules deploy (spec §5's sequencing: rules + backfill together, before shipping client code that depends on `publicProfiles` existing).

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-public-profiles.mjs
git commit -m "Add one-off migration script to backfill publicProfiles from existing profiles"
```

---

## Phase B — Shared client-side plumbing

### Task 4: `deletedAccount.ts` — optional-lastName `fullName`, shared `initials`

**Files:**
- Modify: `src/profile/deletedAccount.ts`
- Test: Create `src/profile/deletedAccount.test.ts`

**Interfaces:**
- Produces:
  - `fullName(player: { firstName: string; lastName?: string } | null | undefined): string`
  - `firstNameOnly(player: { firstName: string } | null | undefined): string` (unchanged signature/behavior)
  - `initials(player: { firstName: string; lastName?: string } | null | undefined): string` — **new**
  - `avatarSrc(player: { photoURL: string } | null | undefined): string` (unchanged)
- Consumed by: every task in Phase C and D below.

- [ ] **Step 1: Write the failing tests**

Create `src/profile/deletedAccount.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fullName, firstNameOnly, initials, avatarSrc, DELETED_ACCOUNT_LABEL, DELETED_ACCOUNT_AVATAR } from "./deletedAccount";

describe("fullName", () => {
  it("joins first and last name when both are present", () => {
    expect(fullName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("falls back to first-name-only when lastName is absent (logged-out data)", () => {
    expect(fullName({ firstName: "Ada" })).toBe("Ada");
  });

  it("returns the deleted-account label when the player itself is null or undefined", () => {
    expect(fullName(null)).toBe(DELETED_ACCOUNT_LABEL);
    expect(fullName(undefined)).toBe(DELETED_ACCOUNT_LABEL);
  });
});

describe("firstNameOnly", () => {
  it("returns just the first name", () => {
    expect(firstNameOnly({ firstName: "Ada" })).toBe("Ada");
  });

  it("returns the deleted-account label when null", () => {
    expect(firstNameOnly(null)).toBe(DELETED_ACCOUNT_LABEL);
  });
});

describe("initials", () => {
  it("returns a two-letter monogram when both names are present", () => {
    expect(initials({ firstName: "Ada", lastName: "Lovelace" })).toBe("AL");
  });

  it("returns a single first-initial when lastName is absent (logged-out data)", () => {
    expect(initials({ firstName: "Ada" })).toBe("A");
  });

  it("returns a bare question mark for a deleted/missing account", () => {
    expect(initials(null)).toBe("?");
    expect(initials(undefined)).toBe("?");
  });
});

describe("avatarSrc", () => {
  it("returns the player's photo URL", () => {
    expect(avatarSrc({ photoURL: "a.png" })).toBe("a.png");
  });

  it("returns the deleted-account avatar when null", () => {
    expect(avatarSrc(null)).toBe(DELETED_ACCOUNT_AVATAR);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/profile/deletedAccount.test.ts`
Expected: FAIL — `initials` is not exported yet, and `fullName({ firstName: "Ada" })` currently returns `"Ada undefined"` (the old implementation always interpolates `player.lastName`).

- [ ] **Step 3: Rewrite `deletedAccount.ts`**

Replace the full file with:

```ts
// A uid with no matching entry in the currently-loaded players list means
// the account behind it was deleted (deleteProfile wipes the profiles/{uid}
// doc, but old chat messages / forum posts / likes / mentions that uid made
// are left in place) — every surface that looks up an author by uid should
// render these the same way rather than leaking a raw Firebase uid or a
// generic "Bilinmeyen" that reads like a bug.
export const DELETED_ACCOUNT_LABEL = "Silindi";
export const DELETED_ACCOUNT_AVATAR = "/brand/kupatakip-logo-white.svg";

interface NamedPlayer {
  firstName: string;
  lastName?: string;
}

// `lastName` is optional here (not just on a deleted account) because a
// logged-out visitor's player data comes from `publicProfiles`, which never
// carries lastName at all (2026-08-02 — see the name-privacy design spec).
// That's a distinct case from "no player found" below, which still means a
// deleted account and still renders the Silindi label.
export function fullName(player: NamedPlayer | null | undefined): string {
  if (!player) return DELETED_ACCOUNT_LABEL;
  return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
}

export function firstNameOnly(player: { firstName: string } | null | undefined): string {
  return player ? player.firstName : DELETED_ACCOUNT_LABEL;
}

// Single shared home for what used to be 7 duplicated inline `initials()`
// functions across Forum/Leaderboard components (not-started-audit-style
// dedup, 2026-08-02) — duplicating it meant every copy assumed `lastName`
// was always a real string and crashed on `undefined.charAt(0)` the moment
// a logged-out-sourced player (no lastName) reached it.
export function initials(player: NamedPlayer | null | undefined): string {
  if (!player) return "?";
  const first = player.firstName.charAt(0);
  const last = player.lastName ? player.lastName.charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

export function avatarSrc(player: { photoURL: string } | null | undefined): string {
  return player ? player.photoURL : DELETED_ACCOUNT_AVATAR;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/profile/deletedAccount.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/profile/deletedAccount.ts src/profile/deletedAccount.test.ts
git commit -m "Make fullName degrade gracefully without lastName, add shared initials() helper"
```

---

### Task 5: `usePlayers()` becomes auth-aware

**Files:**
- Modify: `src/profile/usePlayers.ts`
- Test: Modify `src/profile/usePlayers.test.ts`

**Interfaces:**
- Consumes: `useAuth()` from `../auth/AuthProvider` (existing hook, returns `{ user, loading }`).
- Produces: `Player` type gains optional `lastName`; `usePlayers()` subscribes to `profiles` when `user` is present, `publicProfiles` when not, with per-source session-cache keys (`players:full` / `players:public`).

- [ ] **Step 1: Write the failing tests**

Modify `src/profile/usePlayers.test.ts` — add the auth mock at the top (matching `AppShell.test.tsx`'s existing pattern) and new test cases:

```ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockUnsubscribe = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));

import { usePlayers } from "./usePlayers";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;

describe("usePlayers", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockCollection.mockClear();
    mockUnsubscribe.mockReset();
    mockUseAuth.mockReturnValue({ user: { uid: "me" }, loading: false });
    clearSessionCache();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("subscribes to the full profiles collection when signed in", () => {
    renderHook(() => usePlayers());
    expect(mockCollection).toHaveBeenCalledWith({}, "profiles");
  });

  it("subscribes to publicProfiles when signed out", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderHook(() => usePlayers());
    expect(mockCollection).toHaveBeenCalledWith({}, "publicProfiles");
  });

  it("returns an empty list before any profiles exist", async () => {
    const { result } = renderHook(() => usePlayers());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
  });

  it("maps each profile doc to a Player with uid set from the doc id", async () => {
    const { result } = renderHook(() => usePlayers());
    act(() =>
      capturedOnNext({
        docs: [
          {
            id: "uid1",
            data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }),
          },
        ],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
    ]);
  });

  it("maps a publicProfiles doc to a Player with no lastName, when signed out", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { result } = renderHook(() => usePlayers());
    act(() =>
      capturedOnNext({
        docs: [{ id: "uid1", data: () => ({ firstName: "Ada", photoURL: "a.png", createdAt: 1 }) }],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([{ uid: "uid1", firstName: "Ada", photoURL: "a.png", createdAt: 1 }]);
  });

  it("stops loading and leaves players empty when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePlayers());
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load players", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("updates live when a new profile is added to a later snapshot", async () => {
    const { result } = renderHook(() => usePlayers());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() =>
      capturedOnNext({
        docs: [{ id: "uid1", data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }) }],
      })
    );
    await waitFor(() => expect(result.current.players).toHaveLength(1));
  });

  it("re-subscribes to the other collection when auth state changes", () => {
    const { rerender } = renderHook(() => usePlayers());
    expect(mockCollection).toHaveBeenLastCalledWith({}, "profiles");

    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender();
    expect(mockCollection).toHaveBeenLastCalledWith({}, "publicProfiles");
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("unsubscribes the live listener on unmount", () => {
    const { unmount } = renderHook(() => usePlayers());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify the new/changed ones fail**

Run: `npx vitest run src/profile/usePlayers.test.ts`
Expected: FAIL on the auth-awareness cases — the current implementation always subscribes to `"profiles"` regardless of auth state.

- [ ] **Step 3: Rewrite `usePlayers.ts`**

```ts
// src/profile/usePlayers.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { Profile } from "./profileTypes";
import { getCached, setCached } from "../lib/sessionCache";

export interface Player extends Omit<Profile, "lastName"> {
  uid: string;
  // Optional, not just on a deleted account: absent whenever this player's
  // data came from `publicProfiles` (a logged-out session never receives
  // lastName at all — see the 2026-08-02 name-privacy design spec).
  lastName?: string;
}

/**
 * not-started-audit item 09: was a one-shot `getDocs`, cached for the
 * session — so a new sign-up or a changed name/photo never showed up
 * anywhere this list feeds (chat, forum, the home participant list) for
 * anyone already on the site until a hard reload. Live listener now, same
 * "show cached immediately, let the first snapshot silently reconcile it"
 * pattern useMessages.ts already established.
 *
 * Auth-aware since 2026-08-02: signed-in visitors subscribe to `profiles`
 * (full data, including lastName); signed-out visitors subscribe to
 * `publicProfiles` (lastName never present — Firestore rules can't filter
 * individual fields out of a read, so this is a genuinely separate,
 * separately-gated collection, not a client-side redaction). Cache keys are
 * split by source so a mid-session login/logout can't serve one shape's
 * cached data through the other's listener before the first live snapshot
 * lands.
 */
export function usePlayers() {
  const { user } = useAuth();
  const source = user ? "profiles" : "publicProfiles";
  const cacheKey = user ? "players:full" : "players:public";

  const [players, setPlayers] = useState<Player[]>(() => getCached<Player[]>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => getCached<Player[]>(cacheKey) === undefined);

  useEffect(() => {
    const cached = getCached<Player[]>(cacheKey);
    if (cached !== undefined) {
      setPlayers(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const unsubscribe = onSnapshot(
      collection(db, source),
      (snapshot) => {
        const next = snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
          uid: docSnap.id,
          ...(docSnap.data() as Profile),
        }));
        setCached(cacheKey, next);
        setPlayers(next);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load players", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [source, cacheKey]);

  return { players, loading };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/profile/usePlayers.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/profile/usePlayers.ts src/profile/usePlayers.test.ts
git commit -m "Make usePlayers auth-aware: profiles when signed in, publicProfiles when not"
```

---

### Task 6: `useProfile.ts` — write/delete `publicProfiles` alongside `profiles`

**Files:**
- Modify: `src/profile/useProfile.ts:118-185` (`saveProfile`, `updateProfilePhoto`, `deleteProfile`)
- Test: Modify `src/profile/useProfile.test.tsx`

**Interfaces:**
- Consumes: `writeBatch` from `firebase/firestore` (new import).
- Produces: every write to `profiles/{uid}` now has a matching write to `publicProfiles/{uid}` in the same batch; `deleteProfile` deletes both.

- [ ] **Step 1: Read the existing test file to match its current mocking pattern**

Read `src/profile/useProfile.test.tsx` in full before editing anything — it already mocks `firebase/firestore`'s `setDoc`/`deleteDoc`/`doc`/`onSnapshot` in some project-specific shape; this task must extend that same mock object to also cover `writeBatch` (a mock batch object exposing `.set()`, `.delete()`, and an async `.commit()` that the test can assert against), not introduce a second, differently-styled mock.

- [ ] **Step 2: Write/update the failing tests**

Add or update cases (exact assertions depend on the file's real existing structure from Step 1, but the required coverage is):

- `saveProfile` calls `writeBatch(db)`, then `.set(doc(db, "profiles", uid), profile)` and `.set(doc(db, "publicProfiles", uid), { firstName, photoURL, createdAt })` (no `lastName` on the second call), then `.commit()`.
- `updateProfilePhoto` batches the same pair, with `publicProfiles`'s write reflecting only the refreshed `photoURL` (firstName/createdAt unchanged).
- `deleteProfile` batches `.delete(doc(db, "profiles", uid))` and `.delete(doc(db, "publicProfiles", uid))`, then `.commit()`.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/profile/useProfile.test.tsx`
Expected: FAIL — the current implementation only writes/deletes `profiles`.

- [ ] **Step 4: Update `useProfile.ts`**

Add `writeBatch` to the `firebase/firestore` import, then change the three functions:

```ts
import { doc, deleteDoc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
```

```ts
export async function saveProfile(
  uid: string,
  firstName: string,
  lastName: string,
  photoFile: File
): Promise<Profile> {
  const compressed = await compressImage(photoFile, {
    maxDimension: PROFILE_PHOTO_MAX_DIMENSION,
    quality: PROFILE_PHOTO_QUALITY,
  });
  const photoRef = ref(storage, `profile-photos/${uid}-${Date.now()}`);
  await uploadBytes(photoRef, compressed, { cacheControl: IMMUTABLE_CACHE_CONTROL });
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { firstName, lastName, photoURL, createdAt: Date.now() };
  const batch = writeBatch(db);
  batch.set(doc(db, "profiles", uid), profile);
  batch.set(doc(db, "publicProfiles", uid), {
    firstName: profile.firstName,
    photoURL: profile.photoURL,
    createdAt: profile.createdAt,
  });
  await batch.commit();
  setCached(cacheKey(uid), profile);
  return profile;
}

export async function updateProfilePhoto(
  uid: string,
  current: Profile,
  photoFile: File
): Promise<Profile> {
  const compressed = await compressImage(photoFile, {
    maxDimension: PROFILE_PHOTO_MAX_DIMENSION,
    quality: PROFILE_PHOTO_QUALITY,
  });
  const photoRef = ref(storage, `profile-photos/${uid}-${Date.now()}`);
  await uploadBytes(photoRef, compressed, { cacheControl: IMMUTABLE_CACHE_CONTROL });
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { ...current, photoURL };
  const batch = writeBatch(db);
  batch.set(doc(db, "profiles", uid), profile);
  batch.set(doc(db, "publicProfiles", uid), {
    firstName: profile.firstName,
    photoURL: profile.photoURL,
    createdAt: profile.createdAt,
  });
  await batch.commit();
  setCached(cacheKey(uid), profile);
  if (current.photoURL) {
    try {
      await deleteObject(ref(storage, current.photoURL));
    } catch (err) {
      console.error("Failed to delete previous profile photo from storage", err);
    }
  }
  return profile;
}

export async function deleteProfile(uid: string, photoURL: string | null): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "profiles", uid));
  batch.delete(doc(db, "publicProfiles", uid));
  await batch.commit();
  deleteCached(cacheKey(uid));
  if (photoURL) {
    try {
      await deleteObject(ref(storage, photoURL));
    } catch (err) {
      console.error("Failed to delete profile photo from storage", err);
    }
  }
}
```

(`useProfile()`'s own read side and `subscribeToProfile` are unchanged — they read a single, specific, already-known uid in an always-authenticated context, per the design spec §1's scope note.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/profile/useProfile.test.tsx`
Expected: PASS, all cases.

- [ ] **Step 6: Commit**

```bash
git add src/profile/useProfile.ts src/profile/useProfile.test.tsx
git commit -m "Write and delete publicProfiles alongside profiles at every profile write site"
```

---

## Phase C — Leaderboard-family correctness

### Task 7: Strip `lastName` reliance from `LeaderboardTable`, `ParticipantPopup`, `TeamPopup`, `PlayerList`, and thread `players` through from `LeaderboardPage`

This is one task, not five, because none of these five files compiles or behaves correctly without all the others — Task 2 already removed `lastName` from `LeaderboardEntry`, so this task's job is entirely "put full-name display back, sourced from `players` instead."

**Files:**
- Modify: `src/pages/LeaderboardPage.tsx`
- Modify: `src/leaderboard/LeaderboardTable.tsx`
- Modify: `src/leaderboard/ParticipantPopup.tsx`
- Modify: `src/leaderboard/TeamPopup.tsx`
- Modify: `src/leaderboard/PlayerList.tsx`
- Test: Modify `src/leaderboard/LeaderboardTable.test.tsx`, `src/leaderboard/ParticipantPopup.test.tsx`, `src/leaderboard/TeamPopup.test.tsx`, `src/leaderboard/PlayerList.test.tsx`, `src/leaderboard/useLeaderboard.test.ts`, `src/leaderboard/ranking.test.ts`, `src/leaderboard/rankHistory.test.ts`, `src/leaderboard/teamPredictors.test.ts`

**Interfaces:**
- Consumes: `fullName`/`initials` from `../profile/deletedAccount` (Task 4), `buildPlayersByUid` from `../profile/playersByUid` (existing), `Player`/`usePlayers` from `../profile/usePlayers` (Task 5).
- Produces: `LeaderboardTable`, `ParticipantPopup`, `TeamPopup` each gain a required `players: Player[]` prop.

- [ ] **Step 1: Update every `LeaderboardEntry`-typed test fixture to drop `lastName`**

Remove the `lastName: "..."` field from every object literal typed (explicitly or via prop inference) as `LeaderboardEntry` in these files — grep first to make sure none are missed:

Run: `grep -rn "lastName" src/leaderboard/*.test.ts src/leaderboard/*.test.tsx`

Known occurrences to fix (from direct inspection):
- `src/leaderboard/ranking.test.ts:6` — `return { uid, firstName: uid, lastName: "", photoURL: "", points, ranking: [] };` → drop `lastName: "",`
- `src/leaderboard/rankHistory.test.ts:10` — `return { uid, firstName: uid, lastName: "", photoURL: "", points: 0, ranking };` → drop `lastName: "",`
- `src/leaderboard/teamPredictors.test.ts:7` — `return { uid, firstName: uid, lastName: "", photoURL: "", points, ranking };` → drop `lastName: "",`
- `src/leaderboard/useLeaderboard.test.ts:49,61` — the two inline `entries` array literals → drop `lastName: "Lovelace",`
- `src/leaderboard/LeaderboardTable.test.tsx` — every `entries={[...]}` literal (5 occurrences) → drop each `lastName: "..."` field
- `src/leaderboard/ParticipantPopup.test.tsx:23-40` — `baseEntry`/`otherEntry` → drop `lastName: "Lovelace"` / `lastName: "Turing"`, plus any further occurrences later in the file (re-check with the grep from this step)
- `src/leaderboard/TeamPopup.test.tsx:26-42` — `entryA`/`entryB` → drop `lastName: "Lovelace"` / `lastName: "Turing"`, plus any further occurrences later in the file
- `src/leaderboard/PlayerList.test.tsx:32` — the inline `leaderboardEntries` literal → drop `lastName: "Lovelace"` (the top-level `players` fixture at lines 6-9 keeps its `lastName` — that one is a `Player`, not a `LeaderboardEntry`, and stays as-is)

- [ ] **Step 2: Add `players` fixtures and thread the new prop into every render call in these same four test files**

`LeaderboardTable.test.tsx`, `ParticipantPopup.test.tsx`, `TeamPopup.test.tsx` don't currently pass a `players` prop at all (it doesn't exist yet). Add a shared fixture near the top of each file:

```ts
const PLAYERS = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 1 },
];
```

(adjust `uid`/`firstName`/`lastName` values per file to match each file's existing entry fixtures exactly, so the uid join lines up), and add `players={PLAYERS}` to every `<LeaderboardTable ...>`, `<ParticipantPopup ...>`, `<TeamPopup ...>` render call in these three files. Existing assertions like `expect(rows[0]).toHaveTextContent("Ada Lovelace")` stay unchanged in wording — they should still pass once Step 4 below wires `players` in correctly, since `players` now supplies the same names the removed `entry.lastName` used to.

Add one new test per file confirming the degraded case:

```ts
// LeaderboardTable.test.tsx — append inside the existing describe block
it("shows first-name-only when a players entry has no lastName (logged-out data)", () => {
  render(
    <LeaderboardTable
      entries={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: [] }]}
      players={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", createdAt: 1 }]}
    />
  );
  const rows = screen.getAllByRole("row").slice(1);
  expect(rows[0]).toHaveTextContent("Ada");
  expect(rows[0]).not.toHaveTextContent("Lovelace");
});
```

Write the equivalent for `ParticipantPopup.test.tsx` (asserting the `DialogTitle` text) and `TeamPopup.test.tsx` (asserting the predictor row text) using each file's own existing render helper and fixture shapes.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/leaderboard/LeaderboardTable.test.tsx src/leaderboard/ParticipantPopup.test.tsx src/leaderboard/TeamPopup.test.tsx src/leaderboard/PlayerList.test.tsx src/leaderboard/useLeaderboard.test.ts src/leaderboard/ranking.test.ts src/leaderboard/rankHistory.test.ts src/leaderboard/teamPredictors.test.ts`
Expected: FAIL — TypeScript errors (excess `lastName` property on `LeaderboardEntry` literals) and/or a missing required `players` prop, until Step 4 lands.

- [ ] **Step 4: Update `LeaderboardTable.tsx`**

```ts
import { memo, useMemo } from "react";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
import { assignRanks } from "./ranking";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Frame, FrameBody } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  players: Player[];
  revealCorrectness?: boolean;
  onHoverEntry?: (uid: string | null) => void;
  onSelectEntry?: (uid: string) => void;
}
```

Remove the local `function initials(firstName, lastName) {...}`. Inside the component, after `const ranked = assignRanks(entries);`, add:

```ts
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
```

Replace the avatar-fallback line:

```tsx
                          <AvatarFallback className="bg-secondary font-mono text-[0.6rem] text-color_secondary">
                            {initials(entry.firstName, entry.lastName)}
                          </AvatarFallback>
```

with:

```tsx
                          <AvatarFallback className="bg-secondary font-mono text-[0.6rem] text-color_secondary">
                            {initials({ firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName })}
                          </AvatarFallback>
```

and the name line:

```tsx
                          <span className="truncate font-display text-sm font-medium text-color_text">
                            {entry.firstName} {entry.lastName}
                          </span>
```

with:

```tsx
                          <span className="truncate font-display text-sm font-medium text-color_text">
                            {fullName({ firstName: entry.firstName, lastName: playersByUid.get(entry.uid)?.lastName })}
                          </span>
```

- [ ] **Step 5: Update `ParticipantPopup.tsx`**

Add to the imports:

```ts
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
```

Add `players: Player[];` to `ParticipantPopupProps` (place it next to `entries` with a doc comment: `/** Needed to resolve lastName for signed-in viewers — LeaderboardEntry no longer carries it (2026-08-02). */`). Remove the local `function initials(firstName, lastName) {...}`.

Inside the component body, after the existing `const { outcomes } = useDevMatches();` line, add:

```ts
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
  const displayedPlayer = displayedUid
    ? { firstName: displayed!.entry.firstName, lastName: playersByUid.get(displayedUid)?.lastName }
    : null;
```

(`displayed` is already established above as `ranked ?? lastRanked`; `displayedPlayer` is only ever read when `displayed` is truthy, matching every call site below.)

Replace:

```tsx
                  <AvatarFallback className="bg-color_accent/20 font-mono text-sm text-color_text">
                    {initials(displayed.entry.firstName, displayed.entry.lastName)}
                  </AvatarFallback>
```

with:

```tsx
                  <AvatarFallback className="bg-color_accent/20 font-mono text-sm text-color_text">
                    {initials(displayedPlayer)}
                  </AvatarFallback>
```

Replace:

```tsx
                  <DialogTitle className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-color_text sm:text-xl">
                    {displayed.entry.firstName} {displayed.entry.lastName}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {displayed.entry.firstName} {displayed.entry.lastName} katılımcı popup'ı: sıra,
                    puan, tahminler, anket cevapları ve zaman içindeki sıralaması.
                  </DialogDescription>
```

with:

```tsx
                  <DialogTitle className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-color_text sm:text-xl">
                    {fullName(displayedPlayer)}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {fullName(displayedPlayer)} katılımcı popup'ı: sıra,
                    puan, tahminler, anket cevapları ve zaman içindeki sıralaması.
                  </DialogDescription>
```

Update the destructured props at the top of the component to include `players`:

```ts
export const ParticipantPopup = memo(function ParticipantPopup({
  ranked,
  entries,
  players,
  results,
  onOpenChange,
  onSelectTeam,
  tournamentStarted,
}: ParticipantPopupProps) {
```

- [ ] **Step 6: Update `TeamPopup.tsx`**

Add to the imports:

```ts
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
```

Add `players: Player[];` to `TeamPopupProps` (same placement/comment convention as Step 5). Remove the local `function participantInitials(firstName, lastName) {...}`. Add `players,` to the destructured props (it's currently destructured starting at line 476 per the existing `onSelectParticipant,` — add `players,` alongside it). Near where `predictors` is computed (the `useMemo` calling `getTeamPredictors`), add:

```ts
  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
```

Replace:

```tsx
                              <AvatarFallback
                                className="bg-secondary font-mono text-color_secondary"
                                style={{ fontSize: `${(t.rowAvatar * 0.343).toFixed(3)}rem` }}
                              >
                                {participantInitials(p.entry.firstName, p.entry.lastName)}
                              </AvatarFallback>
```

with:

```tsx
                              <AvatarFallback
                                className="bg-secondary font-mono text-color_secondary"
                                style={{ fontSize: `${(t.rowAvatar * 0.343).toFixed(3)}rem` }}
                              >
                                {initials({ firstName: p.entry.firstName, lastName: playersByUid.get(p.entry.uid)?.lastName })}
                              </AvatarFallback>
```

and:

```tsx
                            <span
                              className="min-w-0 flex-1 truncate font-display font-medium text-color_text group-hover:underline"
                              style={{ fontSize: `${t.fsName}rem` }}
                            >
                              {p.entry.firstName} {p.entry.lastName}
                            </span>
```

with:

```tsx
                            <span
                              className="min-w-0 flex-1 truncate font-display font-medium text-color_text group-hover:underline"
                              style={{ fontSize: `${t.fsName}rem` }}
                            >
                              {fullName({ firstName: p.entry.firstName, lastName: playersByUid.get(p.entry.uid)?.lastName })}
                            </span>
```

- [ ] **Step 7: Update `PlayerList.tsx`**

```ts
import { Player } from "../profile/usePlayers";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TEAMS } from "../predictions/teams";
import { fullName, initials } from "../profile/deletedAccount";

interface PlayerListProps {
  players: Player[];
  showFullNames: boolean;
  leaderboardEntries?: LeaderboardEntry[];
}

function rankingNames(ranking: string[]): string {
  return ranking.map((id) => TEAMS.find((t) => t.id === id)?.name ?? id).join(", ");
}

export function PlayerList({ players, showFullNames, leaderboardEntries }: PlayerListProps) {
  if (!showFullNames) {
    return (
      <p>
        {players.length} kişi katıldı: {players.map((p) => p.firstName).join(", ")}
      </p>
    );
  }

  const entryByUid = new Map((leaderboardEntries ?? []).map((e) => [e.uid, e]));

  return (
    <ul>
      {players.map((player) => {
        const entry = entryByUid.get(player.uid);
        return (
          <li key={player.uid}>
            <img src={player.photoURL} alt="" />
            {fullName(player)}
            {leaderboardEntries && (entry ? ` — ${rankingNames(entry.ranking)}` : " — tahmin göndermedi")}
          </li>
        );
      })}
    </ul>
  );
}
```

(`PlayerList` never actually rendered `initials()` before — it used `<img>` directly, not an `Avatar`/`AvatarFallback` — so `initials` is imported here only if a later reviewer wants a fallback; if the existing `<img>`-only markup has no fallback path today, don't add one that isn't already there. Leave `initials` out of this file's import if it ends up unused — check with the file as edited before committing.)

The sort comparator lives in the parent that sorts `players` before passing them in — grep for `.localeCompare` near `PlayerList`'s callers to find it (not in `PlayerList.tsx` itself per the file as read). Wherever it is, change:

```ts
`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")
```

to:

```ts
fullName(a).localeCompare(fullName(b), "tr")
```

- [ ] **Step 8: Update `LeaderboardPage.tsx` to fetch and thread `players`**

Add the import and hook call:

```ts
import { usePlayers } from "../profile/usePlayers";
```

```ts
  const { players } = usePlayers();
```

(place it alongside the existing `const { entries, loading } = useLeaderboard();` line). Add `players={players}` to the three JSX call sites: `<LeaderboardTable entries={entries} ... />`, `<ParticipantPopup ranked={selectedRanked} entries={entries} ... />`, `<TeamPopup teamId={selectedTeamId} entries={entries} ... />`.

- [ ] **Step 9: Run the full leaderboard test suite and verify it passes**

Run: `npx vitest run src/leaderboard src/pages/LeaderboardPage.test.tsx`
Expected: PASS, all cases, including the new degraded-name cases from Step 2.

- [ ] **Step 10: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors remaining from the `LeaderboardEntry` type change (this is the point where Task 2's intentionally-broken intermediate state gets fully resolved).

- [ ] **Step 11: Commit**

```bash
git add src/pages/LeaderboardPage.tsx src/leaderboard/LeaderboardTable.tsx src/leaderboard/ParticipantPopup.tsx src/leaderboard/TeamPopup.tsx src/leaderboard/PlayerList.tsx src/leaderboard/LeaderboardTable.test.tsx src/leaderboard/ParticipantPopup.test.tsx src/leaderboard/TeamPopup.test.tsx src/leaderboard/PlayerList.test.tsx src/leaderboard/useLeaderboard.test.ts src/leaderboard/ranking.test.ts src/leaderboard/rankHistory.test.ts src/leaderboard/teamPredictors.test.ts
git commit -m "Thread players through Leaderboard family to restore full names via the new shared helpers"
```

---

## Phase D — Forum feature

### Task 8: `pageAccess.ts` — open Forum to logged-out visitors for started phases

**Files:**
- Modify: `src/state/pageAccess.ts`
- Test: Create `src/state/pageAccess.test.ts` (none currently exists — `AppShell.test.tsx`'s "NAV_LINKS matches PAGE_ACCESS" suite exercises it indirectly, but the access rule itself has no direct unit test yet)

**Interfaces:**
- Produces: `isPageAllowed("forum", state)` now returns `true` for `loggedout_leaguephase`, `loggedout_preknockout`, `loggedout_knockout` (previously `false` for all three), unchanged (`true`) for every logged-in state and `loggedout_notstarted` (unchanged `false`).

- [ ] **Step 1: Write the failing test**

Create `src/state/pageAccess.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isPageAllowed } from "./pageAccess";

describe("forum access", () => {
  it("is allowed for every logged-in state, including notstarted", () => {
    expect(isPageAllowed("forum", "loggedin_notstarted")).toBe(true);
    expect(isPageAllowed("forum", "loggedin_leaguephase")).toBe(true);
    expect(isPageAllowed("forum", "loggedin_preknockout")).toBe(true);
    expect(isPageAllowed("forum", "loggedin_knockout")).toBe(true);
  });

  it("is blocked for logged-out visitors before the tournament starts", () => {
    expect(isPageAllowed("forum", "loggedout_notstarted")).toBe(false);
  });

  it("is allowed for logged-out visitors in every started phase", () => {
    expect(isPageAllowed("forum", "loggedout_leaguephase")).toBe(true);
    expect(isPageAllowed("forum", "loggedout_preknockout")).toBe(true);
    expect(isPageAllowed("forum", "loggedout_knockout")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/state/pageAccess.test.ts`
Expected: FAIL on the third `it` block — `forum` currently requires login in every phase.

- [ ] **Step 3: Update `pageAccess.ts`**

Change:

```ts
// Rules below come from onboarding/pagemap-questionnaires/pagemap-round-01.md
// (round 1 answers): forum is logged-in-only in every phase now (previously
// open to logged-out visitors once started — Q3 explicitly closed that).
const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: statesFor(ALL_PHASES, [true]),
  leaderboard: statesFor(STARTED_PHASES, [true, false]),
  forum: statesFor(ALL_PHASES, [true]),
  stats: statesFor(STARTED_PHASES, [true]),
  profile: statesFor(ALL_PHASES, [true]),
};
```

to:

```ts
// Reopened to logged-out visitors 2026-08-02 (reversing the closure noted
// below) for every started phase — same statesFor(STARTED_PHASES, [true,
// false]) shape as `leaderboard` already uses. Posting/replying/liking stay
// signed-in-only regardless (enforced both in the UI and, independently, by
// firestore.rules' forumPosts create/update rules) — see the name-privacy
// design spec for why this pairs with the profiles/publicProfiles split.
const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: statesFor(ALL_PHASES, [true]),
  leaderboard: statesFor(STARTED_PHASES, [true, false]),
  forum: [...statesFor(ALL_PHASES, [true]), ...statesFor(STARTED_PHASES, [false])],
  stats: statesFor(STARTED_PHASES, [true]),
  profile: statesFor(ALL_PHASES, [true]),
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/state/pageAccess.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/state/pageAccess.ts src/state/pageAccess.test.ts
git commit -m "Open Forum to logged-out visitors for every started tournament phase"
```

---

### Task 9: `AppShell.tsx` — add Forum to the logged-out started-phase nav

**Files:**
- Modify: `src/shell/AppShell.tsx`
- Test: Modify `src/shell/AppShell.test.tsx`

**Interfaces:**
- Produces: `STARTED_LOGGEDOUT_LINKS` gains a `{ path: "/forum", label: "Forum" }` entry.

- [ ] **Step 1: Update the one existing test that currently asserts Forum's absence**

In `src/shell/AppShell.test.tsx`, the test `"shows leaderboard but not forum, stats or predictions when started and not logged in"` (around line 82) currently asserts:

```ts
    expect(screen.queryByText("Forum")).not.toBeInTheDocument();
```

Change the whole test to reflect the new expected behavior — rename it and flip the assertion:

```ts
  it("shows leaderboard and forum but not stats or predictions when started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    renderShell();
    expect(screen.getByText("Puan Durumu")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.getByText("Hakkında")).toBeInTheDocument();
    expect(screen.queryByText("İstatistikler")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
  });
```

The existing `"NAV_LINKS matches PAGE_ACCESS"` generic test (`it.each(STATE_FIXTURES)`) needs no changes — it already derives its expectations from `isPageAllowed`, which Task 8 already updated, so it will automatically start requiring Forum's link to be present for `loggedout_leaguephase` once Step 2 below lands.

- [ ] **Step 2: Run the tests to verify the renamed one fails**

Run: `npx vitest run src/shell/AppShell.test.tsx`
Expected: FAIL on the renamed test (Forum link not found) and on the `"NAV_LINKS matches PAGE_ACCESS"` case for `loggedout_leaguephase` (rendered forum link missing vs. `isPageAllowed` now expecting it present).

- [ ] **Step 3: Update `AppShell.tsx`**

Change:

```ts
// Forum dropped for logged-out visitors here (previously included) — round-1
// pagemap answer: forum is logged-in-only in every phase now, no exceptions.
const STARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/leaderboard", label: "Puan Durumu" },
  { path: "/about", label: "Hakkında" },
];
```

to:

```ts
// Forum re-added for logged-out visitors 2026-08-02, reversing the earlier
// round-1 pagemap closure — see src/state/pageAccess.ts's matching comment.
const STARTED_LOGGEDOUT_LINKS: NavLink[] = [
  { path: "/", label: "Ana Sayfa" },
  { path: "/leaderboard", label: "Puan Durumu" },
  { path: "/forum", label: "Forum" },
  { path: "/about", label: "Hakkında" },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shell/AppShell.test.tsx`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/shell/AppShell.tsx src/shell/AppShell.test.tsx
git commit -m "Add Forum to the top nav for logged-out visitors once the tournament has started"
```

---

### Task 10: `ThreadCard.tsx` / `ReplyRow.tsx` — disable the like button when logged out; adopt shared `initials`

**Files:**
- Modify: `src/forum/ThreadCard.tsx`
- Modify: `src/forum/ReplyRow.tsx`
- Test: Modify `src/forum/ThreadCard.test.tsx`, `src/forum/ReplyRow.test.tsx`

**Interfaces:**
- Consumes: `initials` from `../profile/deletedAccount` (Task 4).
- Produces: the like `<button>` in both components gets `disabled={!uid}` and drops its interactive styling when `uid` is null; clicking it while logged out no longer calls `onToggleLike`.

- [ ] **Step 1: Write the failing tests**

Append to `src/forum/ThreadCard.test.tsx`:

```ts
  it("disables the like button and does not call onToggleLike when logged out", () => {
    const onToggleLike = vi.fn();
    renderCard({ uid: null, onToggleLike });
    const likeButton = screen.getByLabelText("Beğenmek için giriş yapmalısın");
    expect(likeButton).toBeDisabled();
    fireEvent.click(likeButton);
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it("still shows the like count when logged out", () => {
    const likesByPost = new Map([["root1", new Set(["uid2"])]]);
    renderCard({ uid: null, likesByPost });
    expect(screen.getByText("1")).toBeInTheDocument();
  });
```

Append to `src/forum/ReplyRow.test.tsx`:

```ts
  it("disables the like button and does not call onToggleLike when logged out", () => {
    const onToggleLike = vi.fn();
    renderRow({ uid: null, onToggleLike });
    const likeButton = screen.getByLabelText("Beğenmek için giriş yapmalısın");
    expect(likeButton).toBeDisabled();
    fireEvent.click(likeButton);
    expect(onToggleLike).not.toHaveBeenCalled();
  });

  it("disables the like button in compact mode too when logged out", () => {
    const onToggleLike = vi.fn();
    renderRow({ uid: null, onToggleLike, compact: true });
    const likeButton = screen.getByLabelText("Beğenmek için giriş yapmalısın");
    expect(likeButton).toBeDisabled();
    fireEvent.click(likeButton);
    expect(onToggleLike).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/forum/ThreadCard.test.tsx src/forum/ReplyRow.test.tsx`
Expected: FAIL — the like button has no `disabled` state today and its `aria-label` doesn't change based on `uid`.

- [ ] **Step 3: Update `ThreadCard.tsx`**

Replace the local `function initials(firstName, lastName) {...}` — delete it, and add to the imports:

```ts
import { fullName, avatarSrc, initials } from "../profile/deletedAccount";
```

(replacing the existing `import { fullName, avatarSrc } from "../profile/deletedAccount";`). Replace every `author ? initials(author.firstName, author.lastName) : "?"` occurrence with `initials(author)`.

Replace the like button:

```tsx
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          aria-pressed={liked}
          aria-label={liked ? "Beğeniyi geri al" : "Beğen"}
          className={cn(
            "-ml-1.5 flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent",
            liked ? "text-color_accent" : "text-color_textsecondary hover:text-color_accent"
          )}
        >
```

with:

```tsx
        <button
          type="button"
          onClick={() => uid && onToggleLike(post.id)}
          disabled={!uid}
          aria-pressed={liked}
          aria-label={!uid ? "Beğenmek için giriş yapmalısın" : liked ? "Beğeniyi geri al" : "Beğen"}
          className={cn(
            "-ml-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent",
            !uid
              ? "cursor-default text-color_textsecondary"
              : liked
                ? "cursor-pointer text-color_accent"
                : "cursor-pointer text-color_textsecondary hover:text-color_accent"
          )}
        >
```

- [ ] **Step 4: Update `ReplyRow.tsx`**

Same import change (delete the local `initials`, add `initials` to the `deletedAccount` import). Both the `compact` branch's like button and the full branch's like button get the identical treatment as Step 3 (same `onClick`/`disabled`/`aria-label`/className pattern), applied to each of `ReplyRow.tsx`'s two like `<button>` elements (one inside `if (compact) { ... }`, one in the main return).

Also replace `author ? initials(author.firstName, author.lastName) : "?"` with `initials(author)` in both branches.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/forum/ThreadCard.test.tsx src/forum/ReplyRow.test.tsx`
Expected: PASS, all cases (confirm no prior test broke — e.g. the existing `"shows the like count and calls onToggleLike with the post id"` test in `ThreadCard.test.tsx` renders with the default `uid="uid1"`, so it stays unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/forum/ThreadCard.tsx src/forum/ReplyRow.tsx src/forum/ThreadCard.test.tsx src/forum/ReplyRow.test.tsx
git commit -m "Disable Forum's like button (not just no-op it) when logged out"
```

---

### Task 11: `ThreadPopup.tsx` — gate the quote button on `uid`; adopt shared `initials`

**Files:**
- Modify: `src/forum/ThreadPopup.tsx`
- Test: Modify `src/forum/ThreadPopup.test.tsx`

**Interfaces:**
- Produces: `ReplyRow`'s `onQuote` prop is only passed when `uid` is non-null.

- [ ] **Step 1: Write the failing test**

Append to `src/forum/ThreadPopup.test.tsx`:

```ts
  it("does not show the quote button on replies when logged out", async () => {
    const reply = makePost({ id: "r1", parentId: "root1", uid: "uid2", text: "bir yanıt" });
    renderPopup({ uid: null, posts: [makePost(), reply] });
    await screen.findByText("bir yanıt");
    expect(screen.queryByLabelText("Alıntıla")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/forum/ThreadPopup.test.tsx`
Expected: FAIL — `onQuote={handleQuote}` is currently passed unconditionally.

- [ ] **Step 3: Update `ThreadPopup.tsx`**

Replace the local `function initials(firstName, lastName) {...}` — delete it, import `initials` from `../profile/deletedAccount` alongside the existing `fullName, avatarSrc` import, and replace `author ? initials(author.firstName, author.lastName) : "?"` with `initials(author)`.

Change:

```tsx
                          onQuote={handleQuote}
```

to:

```tsx
                          onQuote={uid ? handleQuote : undefined}
```

(this is the `<ReplyRow ... onQuote={handleQuote} ... />` call inside the `replies.map(...)` block.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/forum/ThreadPopup.test.tsx`
Expected: PASS, all cases (including the existing `"stages a quote from a reply's quote button into the reply composer"` test, which renders with the default `uid="uid1"` and is unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/forum/ThreadPopup.tsx src/forum/ThreadPopup.test.tsx
git commit -m "Hide the reply quote button when logged out, matching the already-hidden reply composer"
```

---

### Task 12: `RecentPostsPreview.tsx` — adopt shared `initials`

**Files:**
- Modify: `src/forum/RecentPostsPreview.tsx`
- Test: Modify `src/forum/RecentPostsPreview.test.tsx` (read it first to confirm the exact existing assertions before editing — not otherwise read during planning)

No behavior change here (this component stays logged-in-only per the design spec's explicit scope note) — this task exists purely to finish the `initials()` de-duplication from Task 4, so no component in Forum is left with the old crash-prone inline version.

- [ ] **Step 1: Read the current test file**

Read `src/forum/RecentPostsPreview.test.tsx` in full to see whether any existing test exercises the avatar-fallback initials rendering (e.g. a player with no avatar image) — if so, note its exact current assertion text so Step 3 doesn't change it.

- [ ] **Step 2: Run the existing tests to confirm current green baseline**

Run: `npx vitest run src/forum/RecentPostsPreview.test.tsx`
Expected: PASS (baseline, before this task's edit).

- [ ] **Step 3: Update `RecentPostsPreview.tsx`**

Delete the local `function initials(firstName, lastName) {...}`, add `initials` to the existing `import { fullName, firstNameOnly, avatarSrc } from "../profile/deletedAccount";` line, and replace `author ? initials(author.firstName, author.lastName) : "?"` with `initials(author)`.

- [ ] **Step 4: Run the tests to verify nothing broke**

Run: `npx vitest run src/forum/RecentPostsPreview.test.tsx`
Expected: PASS, unchanged from Step 2's baseline (this is a pure refactor — behavior for a fully-populated `Player` is identical, since `initials()` with a present `lastName` produces the same two-letter output the old inline function did).

- [ ] **Step 5: Commit**

```bash
git add src/forum/RecentPostsPreview.tsx
git commit -m "Adopt the shared initials() helper in RecentPostsPreview, completing the dedup"
```

---

### Task 13: `ForumPage.tsx` — pass `players` into `ParticipantPopup`; update the now-obsolete logged-out-blocked test

**Files:**
- Modify: `src/pages/ForumPage.tsx`
- Test: Modify `src/pages/ForumPage.test.tsx`

**Interfaces:**
- Produces: `<ParticipantPopup players={players} .../>` inside `ForumPage`.

- [ ] **Step 1: Update the mocked `ParticipantPopup` and the now-wrong test in `ForumPage.test.tsx`**

The mocked `ParticipantPopup` at the top of `ForumPage.test.tsx` needs a `players` prop added to its type signature (even if the mock itself doesn't render anything with it, the type must match) — extend:

```ts
vi.mock("../leaderboard/ParticipantPopup", () => ({
  ParticipantPopup: ({
    ranked,
    players,
    tournamentStarted,
    onOpenChange,
  }: {
    ranked: { entry: { uid: string } } | null;
    players: { uid: string }[];
    tournamentStarted: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div>
      <p>participant-popup:{ranked?.entry.uid ?? "none"}:{players.length}:{String(tournamentStarted)}</p>
      <button onClick={() => onOpenChange(false)}>close-popup</button>
    </div>
  ),
}));
```

Update the two existing tests that assert on `"participant-popup:..."` text to include the new `players.length` segment:

```ts
  it("opens the participant popup with the right rank/tournamentStarted, and closes it", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUseTournamentPhase.mockReturnValue("notstarted");
    render(<ForumPage />);
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:uid2:2:false")).toBeInTheDocument();
    fireEvent.click(screen.getByText("close-popup"));
    expect(screen.getByText("participant-popup:none:2:false")).toBeInTheDocument();
  });

  it("passes tournamentStarted=true to the participant popup once the tournament has started", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    render(<ForumPage />);
    fireEvent.click(screen.getByText("select-participant"));
    expect(screen.getByText("participant-popup:uid2:2:true")).toBeInTheDocument();
  });
```

(the `:2` reflects the existing `beforeEach`'s `mockUsePlayers.mockReturnValue({ players: [PLAYER1, PLAYER2], loading: false });` — two players.)

Replace the now-obsolete test:

```ts
  it("shows the blocked message for a logged-out visitor even once the tournament's started", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    render(<ForumPage />);
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });
```

with:

```ts
  it("renders Forum (not the blocked message) for a logged-out visitor once the tournament's started", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUseAuth.mockReturnValue({ user: null });
    render(<ForumPage />);
    expect(screen.queryByText("Bu bölüm şu anda kullanılamıyor.")).not.toBeInTheDocument();
    expect(screen.getByText("forum:null:2:2")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify the new/changed ones fail**

Run: `npx vitest run src/pages/ForumPage.test.tsx`
Expected: FAIL — `ParticipantPopup` isn't given a `players` prop yet, and the logged-out-started case still shows the blocked message (Task 8 already fixed `isPageAllowed` itself, but `ForumPage.tsx` doesn't yet forward `players`, which is what this specific test now checks for via the mock's rendered output).

- [ ] **Step 3: Update `ForumPage.tsx`**

Change:

```tsx
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={() => {}}
        tournamentStarted={phase !== "notstarted"}
      />
```

to:

```tsx
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={() => {}}
        tournamentStarted={phase !== "notstarted"}
      />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/ForumPage.test.tsx`
Expected: PASS, all cases.

- [ ] **Step 5: Run the full test suite and type-check as a final gate for this plan**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS / no errors, project-wide.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ForumPage.tsx src/pages/ForumPage.test.tsx
git commit -m "Pass players into ForumPage's ParticipantPopup; Forum is now genuinely reachable logged-out"
```

---

## Post-plan manual verification (not automated — do after all tasks land)

Per the design spec §5's deployment sequencing and §6's manual test plan:

1. Deploy `firestore.rules` + run `scripts/backfill-public-profiles.mjs` together (flag both to the user before running — real deploys against the single live Firebase project).
2. Redeploy `functions/leaderboard` (flag to the user before running).
3. Dev server + DevPanel: force `loggedout_leaguephase`, confirm Forum is reachable via nav, posts render with first-name-only, the like button is visually inert (no hover, no click effect), and opening a post's author via `ParticipantPopup` shows first-name-only too.
4. Force `loggedin_leaguephase` and confirm nothing regressed — full names throughout, working like/reply/quote.
