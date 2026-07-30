# Special Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let participants create up to 3 private, invite-only friend-group lobbies (up to 3 joinable at once), each with its own chat thread and its own filtered view of the prediction-submission-status widget, surfaced through Home's existing "Sohbet" and "Katılımcılar" cells.

**Architecture:** New `lobbies`/`lobbyInvites` Firestore collections (membership as a subcollection, invite-gated via security rules), a small independent cycling switcher on each of Home's two embedded cells, and a single management modal for rename/invite/members/leave/delete. No Cloud Functions — all writes (including system chat messages) are authored by the triggering client, matching this codebase's existing serverless pattern.

**Tech Stack:** React 18 + TypeScript + Vite, Firebase (Auth/Firestore/Storage), react-router-dom (HashRouter), Tailwind v4 + shadcn/ui (`@base-ui/react` primitives), Vitest + React Testing Library, `sonner` (new dependency, added in Task 16).

Full product spec: `onboarding/speciallobby-questionnaires/special-lobby-round-1.md` through `round-9.md`. Full technical design: `docs/superpowers/specs/2026-07-29-special-lobby-design.md`. Read both before starting if anything below is unclear — this plan translates them, it doesn't restate their reasoning.

## Global Constraints

- Lobby name: 1–15 characters (matches `NameStep.tsx`'s profile-name cap).
- Message text (including lobby messages): 1–360 characters (matches `MESSAGE_MAX_LENGTH` in `src/chat/messageTypes.ts`).
- Max 3 lobbies a user can create; max 3 a user can be a member of at once. Client-side enforced only — no server-side counter (see design doc's Known Limitations).
- Invite links expire exactly 1 hour after creation. Multiple can coexist per lobby; generating a new one never invalidates another.
- All new user-facing copy is Turkish, matching 100% of the existing site (see any existing page for tone/voice — short, plain, no exclamation points).
- No Cloud Functions. Every Firestore write in this feature is a direct client SDK call (`addDoc`/`setDoc`/`updateDoc`/`deleteDoc`/`writeBatch`), same as every existing action file in `src/forum/`, `src/chat/`, `src/profile/`.
- This feature only applies during the `notstarted` tournament phase — no new code should branch on `useTournamentPhase()`/`useVisibilityState()` for started-phase behavior; those pages/flows are untouched.
- Test convention throughout: Vitest + React Testing Library, `vi.mock("firebase/firestore", ...)` per file, `onSnapshot` mocks captured via `mockOnSnapshot.mockImplementation((query, onNext, onError) => {...})` and invoked manually inside `act(...)`.

---

## Phase 1 — Data layer

### Task 1: Lobby types

**Files:**
- Create: `src/lobbies/lobbyTypes.ts`

**Interfaces:**
- Consumes: `Message` from `src/chat/messageTypes.ts`.
- Produces: `Lobby`, `LobbyWithId`, `LobbyMember`, `LobbyInvite`, `LobbyInviteWithId`, `LobbySystemKind`, `LobbySystemInfo`, `LobbyMessage`, `LOBBY_NAME_MAX_LENGTH`, `LOBBY_MAX_OWNED`, `LOBBY_MAX_JOINED`, `LOBBY_INVITE_LIFETIME_MS` — every later task imports from here.

This is a types-only file (no Firestore calls), so there's no red/green test cycle — write it directly, then verify it compiles.

- [ ] **Step 1: Write the file**

```ts
// src/lobbies/lobbyTypes.ts
import { Message } from "../chat/messageTypes";

export interface Lobby {
  name: string;
  createdByUid: string;
  createdAt: number;
}

export interface LobbyWithId extends Lobby {
  id: string;
}

export interface LobbyMember {
  uid: string;
  joinedAt: number;
  /** Which invite doc this membership was created from. `null` only for the
   *  creator's own bootstrap membership, written in the same operation as
   *  the lobby doc itself — there's no invite to reference at that moment. */
  viaInviteId: string | null;
}

export interface LobbyInvite {
  lobbyId: string;
  createdByUid: string;
  createdAt: number;
  expiresAt: number;
}

export interface LobbyInviteWithId extends LobbyInvite {
  id: string;
}

export type LobbySystemKind = "created" | "joined" | "left" | "removed" | "renamed";

export interface LobbySystemInfo {
  kind: LobbySystemKind;
  /** Who this system message narrates about. May differ from the message's
   *  own `uid` (the acting writer) — e.g. for "removed", `uid` is the
   *  creator performing the removal, `subjectUid` is the person removed. */
  subjectUid: string;
}

export interface LobbyMessage extends Message {
  system?: LobbySystemInfo;
}

export const LOBBY_NAME_MAX_LENGTH = 15;
export const LOBBY_MAX_OWNED = 3;
export const LOBBY_MAX_JOINED = 3;
export const LOBBY_INVITE_LIFETIME_MS = 60 * 60 * 1000;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit`
Expected: no errors mentioning `lobbyTypes.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lobbies/lobbyTypes.ts
git commit -m "Add Special Lobby data types"
```

---

### Task 2: `useMyLobbies` hook

**Files:**
- Create: `src/lobbies/useMyLobbies.ts`
- Test: `src/lobbies/useMyLobbies.test.ts`

**Interfaces:**
- Consumes: `Lobby`, `LobbyMember` from `./lobbyTypes` (Task 1).
- Produces: `MyLobby` (`Lobby & { id: string; myJoinedAt: number }`), `useMyLobbies(uid: string | null): { lobbies: MyLobby[]; loading: boolean }`. Consumed by Task 17 (`LobbySwitcher`), Task 18 (`JoinLobbyPage`, for the at-cap check), and Task 20 (Home wiring).

This is the most involved hook in the feature: a live `collectionGroup("members")` query (which lobby IDs am I in, and when did I join each) composed with a live `where(documentId(), "in", ids)` query on `lobbies` itself (name/createdByUid for display). Dedup-by-uid, following `useProfile.ts`'s exact registry shape (module-level `Map`, reference-counted `listeners: Set`, identity-guarded via a captured `thisSub`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/useMyLobbies.test.ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockCollectionGroup = vi.fn((_db: unknown, name: string) => ({ kind: "collectionGroup", name }));
const mockCollection = vi.fn((_db: unknown, name: string) => ({ kind: "collection", name }));
const mockWhere = vi.fn((field: unknown, op: string, value: unknown) => ({ field, op, value }));
const mockDocumentId = vi.fn(() => "__name__");
const mockQuery = vi.fn((base: { kind: string }, ...clauses: unknown[]) => ({ ...base, clauses }));
const mockUnsubMembers = vi.fn();
const mockUnsubLobbyDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collectionGroup: (...args: unknown[]) => mockCollectionGroup(...(args as [unknown, string])),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  where: (...args: unknown[]) => mockWhere(...(args as [unknown, string, unknown])),
  documentId: () => mockDocumentId(),
  query: (...args: unknown[]) => mockQuery(...(args as [{ kind: string }])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useMyLobbies } from "./useMyLobbies";

interface FakeMemberDoc {
  ref: { parent: { parent: { id: string } } };
  data: () => { uid: string; joinedAt: number };
}
interface FakeLobbyDoc {
  id: string;
  data: () => { name: string; createdByUid: string; createdAt: number };
}
type MembersCallback = (snapshot: { docs: FakeMemberDoc[] }) => void;
type LobbyDocsCallback = (snapshot: { docs: FakeLobbyDoc[] }) => void;
type ErrorCallback = (err: Error) => void;

function memberDoc(lobbyId: string, uid: string, joinedAt: number): FakeMemberDoc {
  return { ref: { parent: { parent: { id: lobbyId } } }, data: () => ({ uid, joinedAt }) };
}
function lobbyDoc(id: string, name: string, createdByUid: string, createdAt: number): FakeLobbyDoc {
  return { id, data: () => ({ name, createdByUid, createdAt }) };
}

describe("useMyLobbies", () => {
  let capturedMembersNext: MembersCallback;
  let capturedMembersError: ErrorCallback;
  let capturedLobbyDocsNext: LobbyDocsCallback | null;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubMembers.mockReset();
    mockUnsubLobbyDocs.mockReset();
    capturedLobbyDocsNext = null;
    mockOnSnapshot.mockImplementation((queryArg: { kind: string }, onNext: unknown, onError: unknown) => {
      if (queryArg.kind === "collectionGroup") {
        capturedMembersNext = onNext as MembersCallback;
        capturedMembersError = onError as ErrorCallback;
        return mockUnsubMembers;
      }
      capturedLobbyDocsNext = onNext as LobbyDocsCallback;
      return mockUnsubLobbyDocs;
    });
  });

  it("returns loading=false and no lobbies when uid is null", async () => {
    const { result } = renderHook(() => useMyLobbies(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lobbies).toEqual([]);
  });

  it("returns an empty list without querying lobby docs when the user has no memberships", async () => {
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lobbies).toEqual([]);
    expect(capturedLobbyDocsNext).toBeNull();
  });

  it("joins membership docs with lobby details once both snapshots arrive", async () => {
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "Fener Grubu", "creator1", 50)] }));
    await waitFor(() => expect(result.current.lobbies).toHaveLength(1));
    expect(result.current.lobbies[0]).toEqual({
      id: "lobby1",
      name: "Fener Grubu",
      createdByUid: "creator1",
      createdAt: 50,
      myJoinedAt: 100,
    });
  });

  it("re-subscribes to lobby docs when the membership set changes", async () => {
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1)] }));
    await waitFor(() => expect(result.current.lobbies).toHaveLength(1));

    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100), memberDoc("lobby2", "me", 200)] }));
    expect(mockUnsubLobbyDocs).toHaveBeenCalledTimes(1);
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1), lobbyDoc("lobby2", "B", "c2", 2)] }));
    await waitFor(() => expect(result.current.lobbies).toHaveLength(2));
  });

  it("stops loading on a membership listener error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load my lobby memberships", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("shares one pair of subscriptions across two simultaneous mounts for the same uid", async () => {
    const first = renderHook(() => useMyLobbies("me"));
    const second = renderHook(() => useMyLobbies("me"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1)] }));
    await waitFor(() => expect(first.result.current.lobbies).toHaveLength(1));
    await waitFor(() => expect(second.result.current.lobbies).toHaveLength(1));
  });

  it("only unsubscribes both listeners once every mount has unmounted", async () => {
    const first = renderHook(() => useMyLobbies("me"));
    const second = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1)] }));

    first.unmount();
    expect(mockUnsubMembers).not.toHaveBeenCalled();
    expect(mockUnsubLobbyDocs).not.toHaveBeenCalled();

    second.unmount();
    expect(mockUnsubMembers).toHaveBeenCalledTimes(1);
    expect(mockUnsubLobbyDocs).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/useMyLobbies.test.ts`
Expected: FAIL — `Cannot find module './useMyLobbies'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/useMyLobbies.ts
import { useEffect, useState } from "react";
import { collection, collectionGroup, documentId, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Lobby, LobbyMember } from "./lobbyTypes";

export interface MyLobby extends Lobby {
  id: string;
  myJoinedAt: number;
}

interface MembershipEntry {
  lobbyId: string;
  joinedAt: number;
}

interface MyLobbiesSubscription {
  unsubscribeMembers: () => void;
  unsubscribeLobbyDocs: () => void;
  listeners: Set<(lobbies: MyLobby[]) => void>;
  memberships: MembershipEntry[];
  lobbyDocs: Map<string, Lobby>;
  latest: MyLobby[] | undefined;
}

const subscriptions = new Map<string, MyLobbiesSubscription>();

function recompute(sub: MyLobbiesSubscription): MyLobby[] {
  return sub.memberships
    .map((m) => {
      const lobby = sub.lobbyDocs.get(m.lobbyId);
      return lobby ? { ...lobby, id: m.lobbyId, myJoinedAt: m.joinedAt } : null;
    })
    .filter((l): l is MyLobby => l !== null);
}

function emit(sub: MyLobbiesSubscription): void {
  sub.latest = recompute(sub);
  sub.listeners.forEach((listener) => listener(sub.latest!));
}

function resubscribeLobbyDocs(uid: string, thisSub: MyLobbiesSubscription): void {
  thisSub.unsubscribeLobbyDocs();
  const ids = thisSub.memberships.map((m) => m.lobbyId);
  if (ids.length === 0) {
    thisSub.lobbyDocs = new Map();
    thisSub.unsubscribeLobbyDocs = () => {};
    emit(thisSub);
    return;
  }
  thisSub.unsubscribeLobbyDocs = onSnapshot(
    query(collection(db, "lobbies"), where(documentId(), "in", ids)),
    (snapshot) => {
      if (subscriptions.get(uid) !== thisSub) return;
      thisSub.lobbyDocs = new Map(snapshot.docs.map((d) => [d.id, d.data() as Lobby]));
      emit(thisSub);
    },
    (err: Error) => {
      console.error("Failed to load my lobbies' details", err);
    }
  );
}

function subscribeToMyLobbies(uid: string, onChange: (lobbies: MyLobby[]) => void): () => void {
  let sub = subscriptions.get(uid);
  if (!sub) {
    const thisSub: MyLobbiesSubscription = {
      unsubscribeMembers: () => {},
      unsubscribeLobbyDocs: () => {},
      listeners: new Set(),
      memberships: [],
      lobbyDocs: new Map(),
      latest: undefined,
    };
    thisSub.unsubscribeMembers = onSnapshot(
      query(collectionGroup(db, "members"), where("uid", "==", uid)),
      (snapshot) => {
        if (subscriptions.get(uid) !== thisSub) return;
        thisSub.memberships = snapshot.docs.map((docSnap) => ({
          lobbyId: docSnap.ref.parent.parent!.id,
          joinedAt: (docSnap.data() as LobbyMember).joinedAt,
        }));
        resubscribeLobbyDocs(uid, thisSub);
      },
      (err: Error) => {
        console.error("Failed to load my lobby memberships", err);
      }
    );
    subscriptions.set(uid, thisSub);
    sub = thisSub;
  }
  sub.listeners.add(onChange);
  if (sub.latest !== undefined) onChange(sub.latest);

  return () => {
    const current = subscriptions.get(uid);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.unsubscribeMembers();
      current.unsubscribeLobbyDocs();
      subscriptions.delete(uid);
    }
  };
}

export function useMyLobbies(uid: string | null) {
  const [lobbies, setLobbies] = useState<MyLobby[]>([]);
  const [loading, setLoading] = useState(uid !== null);

  useEffect(() => {
    if (!uid) {
      setLobbies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToMyLobbies(uid, (next) => {
      setLobbies(next);
      setLoading(false);
    });
  }, [uid]);

  return { lobbies, loading };
}
```

Note on the "stops loading" test: a membership-listener error leaves `loading` stuck `true` unless something flips it. Since `onChange` is what flips `loading` to `false` in the hook, and the error callback above only `console.error`s without calling `emit`/`onChange`, add `setLoading(false)` directly in that error path too — update the error callback to:

```ts
      (err: Error) => {
        console.error("Failed to load my lobby memberships", err);
        thisSub.latest = thisSub.latest ?? [];
        emit(thisSub);
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/useMyLobbies.test.ts`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/useMyLobbies.ts src/lobbies/useMyLobbies.test.ts
git commit -m "Add useMyLobbies hook"
```

---

### Task 3: `useLobbyMembers` hook

**Files:**
- Create: `src/lobbies/useLobbyMembers.ts`
- Test: `src/lobbies/useLobbyMembers.test.ts`

**Interfaces:**
- Consumes: `LobbyMember` from `./lobbyTypes` (Task 1).
- Produces: `useLobbyMembers(lobbyId: string | null): { members: LobbyMember[]; loading: boolean }`. Consumed by Task 19 (`LobbyManagementPanel`'s member list) and Task 20 (Home wiring, to filter the global player roster down to lobby members).

Dedup-by-**lobbyId** (not uid) — both of Home's cells could plausibly show the same lobby at once, so this needs its own shared-subscription registry, distinct from `useMyLobbies`'s per-uid one. Structure mirrors `useProfile.ts` almost exactly, just subscribing to a subcollection instead of a single doc.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/useLobbyMembers.test.ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLobbyMembers } from "./useLobbyMembers";

type SnapshotCallback = (snapshot: { docs: { data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;
interface Captured {
  path: string[];
  onNext: SnapshotCallback;
  onError: ErrorCallback;
}

describe("useLobbyMembers", () => {
  let captured: Captured[];

  function lastFor(lobbyId: string): Captured {
    const match = [...captured].reverse().find((c) => c.path.includes(lobbyId));
    if (!match) throw new Error(`no onSnapshot call captured for lobby ${lobbyId}`);
    return match;
  }

  beforeEach(() => {
    captured = [];
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation(
      (collectionRef: { path: string[] }, onNext: SnapshotCallback, onError: ErrorCallback) => {
        captured.push({ path: collectionRef.path, onNext, onError });
        return mockUnsubscribe;
      }
    );
  });

  it("returns loading=false and no members when lobbyId is null", async () => {
    const { result } = renderHook(() => useLobbyMembers(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
  });

  it("returns the member list once a snapshot arrives", async () => {
    const { result } = renderHook(() => useLobbyMembers("lobby1"));
    act(() =>
      lastFor("lobby1").onNext({ docs: [{ data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) }] })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([{ uid: "uid1", joinedAt: 100, viaInviteId: null }]);
  });

  it("updates live when a member joins on a later snapshot", async () => {
    const { result } = renderHook(() => useLobbyMembers("lobby1"));
    act(() =>
      lastFor("lobby1").onNext({ docs: [{ data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) }] })
    );
    await waitFor(() => expect(result.current.members).toHaveLength(1));

    act(() =>
      lastFor("lobby1").onNext({
        docs: [
          { data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) },
          { data: () => ({ uid: "uid2", joinedAt: 200, viaInviteId: "invite1" }) },
        ],
      })
    );
    await waitFor(() => expect(result.current.members).toHaveLength(2));
  });

  it("stops loading and shows an empty list when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useLobbyMembers("lobby1"));
    act(() => lastFor("lobby1").onError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
    consoleErrorSpy.mockRestore();
  });

  it("shares one live subscription across two simultaneous mounts for the same lobbyId", async () => {
    const first = renderHook(() => useLobbyMembers("lobby1"));
    const second = renderHook(() => useLobbyMembers("lobby1"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    act(() =>
      lastFor("lobby1").onNext({ docs: [{ data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) }] })
    );
    await waitFor(() => expect(first.result.current.members).toHaveLength(1));
    await waitFor(() => expect(second.result.current.members).toHaveLength(1));
  });

  it("only unsubscribes once every mount for that lobbyId has unmounted", async () => {
    const first = renderHook(() => useLobbyMembers("lobby1"));
    const second = renderHook(() => useLobbyMembers("lobby1"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    second.unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("opens independent subscriptions for two different lobby ids", () => {
    renderHook(() => useLobbyMembers("lobby1"));
    renderHook(() => useLobbyMembers("lobby2"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/useLobbyMembers.test.ts`
Expected: FAIL — `Cannot find module './useLobbyMembers'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/useLobbyMembers.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMember } from "./lobbyTypes";

interface LobbyMembersSubscription {
  unsubscribe: () => void;
  listeners: Set<(members: LobbyMember[]) => void>;
  latest: LobbyMember[] | undefined;
}

const subscriptions = new Map<string, LobbyMembersSubscription>();

function subscribeToLobbyMembers(lobbyId: string, onChange: (members: LobbyMember[]) => void): () => void {
  let sub = subscriptions.get(lobbyId);
  if (!sub) {
    const thisSub: LobbyMembersSubscription = {
      unsubscribe: () => {},
      listeners: new Set(),
      latest: undefined,
    };
    thisSub.unsubscribe = onSnapshot(
      collection(db, "lobbies", lobbyId, "members"),
      (snapshot) => {
        if (subscriptions.get(lobbyId) !== thisSub) return;
        const next = snapshot.docs.map((d) => d.data() as LobbyMember);
        thisSub.latest = next;
        thisSub.listeners.forEach((listener) => listener(next));
      },
      (err: Error) => {
        console.error("Failed to load lobby members", err);
        thisSub.latest = thisSub.latest ?? [];
        thisSub.listeners.forEach((listener) => listener(thisSub.latest!));
      }
    );
    subscriptions.set(lobbyId, thisSub);
    sub = thisSub;
  }
  sub.listeners.add(onChange);
  if (sub.latest !== undefined) onChange(sub.latest);

  return () => {
    const current = subscriptions.get(lobbyId);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.unsubscribe();
      subscriptions.delete(lobbyId);
    }
  };
}

export function useLobbyMembers(lobbyId: string | null) {
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [loading, setLoading] = useState(lobbyId !== null);

  useEffect(() => {
    if (!lobbyId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToLobbyMembers(lobbyId, (next) => {
      setMembers(next);
      setLoading(false);
    });
  }, [lobbyId]);

  return { members, loading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/useLobbyMembers.test.ts`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/useLobbyMembers.ts src/lobbies/useLobbyMembers.test.ts
git commit -m "Add useLobbyMembers hook"
```

---

### Task 4: Shared pagination helper + `useLobbyMessages`

**Files:**
- Create: `src/chat/paginatedMessages.ts`
- Modify: `src/chat/useMessages.ts` (refactor to use the new helper — public API and behavior stay identical)
- Create: `src/lobbies/useLobbyMessages.ts`
- Test: `src/lobbies/useLobbyMessages.test.ts`
- Existing test, must keep passing unchanged: `src/chat/useMessages.test.ts`

**Interfaces:**
- Produces: `MESSAGE_PAGE_SIZE`, `subscribeToRecentMessages<T extends { createdAt: number }>(collectionRef, onNext, onError): Unsubscribe`, `fetchOlderMessages<T extends { createdAt: number }>(collectionRef, beforeCreatedAt): Promise<(T & {id: string})[]>` from `paginatedMessages.ts` — consumed by both `useMessages.ts` and `useLobbyMessages.ts`.
- Produces: `useLobbyMessages(lobbyId: string | null): { messages: LobbyMessageWithId[]; loading: boolean; loadOlder: () => Promise<void>; loadingOlder: boolean; hasMoreOlder: boolean }` — same shape as `useMessages()`, consumed by Task 20 (Home wiring) and fed straight into the unchanged `ChatRoom`.

**Deliberate deviation from the design doc, noted here rather than silently:** the design doc's hooks list says all three new hooks "follow the existing dedup-subscription-registry pattern." `useLobbyMessages` doesn't get one — unlike `useLobbyMembers` (Task 3), which genuinely can have two simultaneous consumers (both Home cells could show the same lobby), lobby *messages* only ever have one consumer at a time (Home's single Sohbet cell). A dedup registry there would add real complexity to guard against a scenario that can't happen with today's UI. This matches the existing global `useMessages()`'s own precedent — it doesn't have a dedup registry either, for the same reason.

- [ ] **Step 1: Write the failing test for the new hook**

```ts
// src/lobbies/useLobbyMessages.test.ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockQuery = vi.fn((...args: unknown[]) => ({ constraints: args.slice(1) }));
const mockOrderBy = vi.fn((field: string, direction?: string) => ({ type: "orderBy", field, direction }));
const mockLimit = vi.fn((n: number) => ({ type: "limit", n }));
const mockStartAfter = vi.fn((value: unknown) => ({ type: "startAfter", value }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as [string, string?])),
  limit: (...args: unknown[]) => mockLimit(...(args as [number])),
  startAfter: (...args: unknown[]) => mockStartAfter(...(args as [unknown])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLobbyMessages } from "./useLobbyMessages";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;

function doc(id: string, uid: string, text: string, createdAt: number) {
  return { id, data: () => ({ uid, text, createdAt }) };
}

describe("useLobbyMessages", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockGetDocs.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("returns loading=false and no messages when lobbyId is null", async () => {
    const { result } = renderHook(() => useLobbyMessages(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("subscribes to that lobby's own messages subcollection", () => {
    renderHook(() => useLobbyMessages("lobby1"));
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages");
  });

  it("loads and chronologically orders the live window", async () => {
    const { result } = renderHook(() => useLobbyMessages("lobby1"));
    act(() => capturedOnNext({ docs: [doc("newest", "uid1", "b", 200), doc("oldest", "uid1", "a", 100)] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages.map((m) => m.id)).toEqual(["oldest", "newest"]);
  });

  it("renders a system message doc with its system field intact", async () => {
    const { result } = renderHook(() => useLobbyMessages("lobby1"));
    act(() =>
      capturedOnNext({
        docs: [
          {
            id: "sys1",
            data: () => ({
              uid: "uid1",
              text: "Ahmet katıldı.",
              createdAt: 100,
              system: { kind: "joined", subjectUid: "uid1" },
            }),
          },
        ],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages[0].system).toEqual({ kind: "joined", subjectUid: "uid1" });
  });

  it("resets to a fresh, empty state when lobbyId changes", async () => {
    const { result, rerender } = renderHook(({ lobbyId }) => useLobbyMessages(lobbyId), {
      initialProps: { lobbyId: "lobby1" as string | null },
    });
    act(() => capturedOnNext({ docs: [doc("m1", "uid1", "a", 100)] }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    rerender({ lobbyId: "lobby2" });
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
  });

  it("stops loading when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useLobbyMessages("lobby1"));
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    consoleErrorSpy.mockRestore();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useLobbyMessages("lobby1"));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  describe("loadOlder", () => {
    it("fetches the next page before the oldest currently-loaded message", async () => {
      const { result } = renderHook(() => useLobbyMessages("lobby1"));
      const fullPage = Array.from({ length: 50 }, (_, i) => doc(`m${i}`, "uid1", "x", (i + 1) * 10));
      act(() => capturedOnNext({ docs: [...fullPage].reverse() }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockGetDocs.mockResolvedValue({ docs: [doc("older1", "uid1", "y", 5)] });
      await act(async () => {
        await result.current.loadOlder();
      });

      expect(mockStartAfter).toHaveBeenCalledWith(10);
      expect(result.current.messages[0].id).toBe("older1");
    });

    it("does nothing when lobbyId is null", async () => {
      const { result } = renderHook(() => useLobbyMessages(null));
      await act(async () => {
        await result.current.loadOlder();
      });
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/useLobbyMessages.test.ts`
Expected: FAIL — `Cannot find module './useLobbyMessages'`.

- [ ] **Step 3: Extract the shared pagination helper**

```ts
// src/chat/paginatedMessages.ts
import {
  CollectionReference,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Unsubscribe,
} from "firebase/firestore";

// Both the global chat and every lobby's chat cap their live window to the
// most recent page — older history is reachable on demand via
// fetchOlderMessages, a one-time (non-live) fetch. Shared here rather than
// duplicated between useMessages.ts and useLobbyMessages.ts.
export const MESSAGE_PAGE_SIZE = 50;

interface WithCreatedAt {
  createdAt: number;
}

function toDocWithId<T>(docSnap: { id: string; data: () => unknown }): T & { id: string } {
  return { id: docSnap.id, ...(docSnap.data() as T) };
}

export function subscribeToRecentMessages<T extends WithCreatedAt>(
  messagesCollection: CollectionReference,
  onNext: (docs: (T & { id: string })[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(messagesCollection, orderBy("createdAt", "desc"), limit(MESSAGE_PAGE_SIZE)),
    (snapshot) => onNext(snapshot.docs.map((d) => toDocWithId<T>(d)).reverse()),
    onError
  );
}

export async function fetchOlderMessages<T extends WithCreatedAt>(
  messagesCollection: CollectionReference,
  beforeCreatedAt: number
): Promise<(T & { id: string })[]> {
  const snapshot = await getDocs(
    query(messagesCollection, orderBy("createdAt", "desc"), startAfter(beforeCreatedAt), limit(MESSAGE_PAGE_SIZE))
  );
  return snapshot.docs.map((d) => toDocWithId<T>(d)).reverse();
}
```

- [ ] **Step 4: Refactor `useMessages.ts` to use the helper**

Replace the full contents of `src/chat/useMessages.ts` with:

```ts
// src/chat/useMessages.ts
import { useCallback, useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "./messageTypes";
import { getCached, setCached } from "../lib/sessionCache";
import { MESSAGE_PAGE_SIZE, subscribeToRecentMessages, fetchOlderMessages } from "./paginatedMessages";

export interface MessageWithId extends Message {
  id: string;
}

const CACHE_KEY = "liveMessages";

export function useMessages() {
  const cached = getCached<MessageWithId[]>(CACHE_KEY);
  const [liveMessages, setLiveMessages] = useState<MessageWithId[]>(cached ?? []);
  const [olderMessages, setOlderMessages] = useState<MessageWithId[]>([]);
  const [loading, setLoading] = useState(cached === undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  useEffect(() => {
    return subscribeToRecentMessages<Message>(
      collection(db, "messages"),
      (docs) => {
        setCached(CACHE_KEY, docs);
        setLiveMessages(docs);
        setLoading(false);
        if (docs.length < MESSAGE_PAGE_SIZE) setHasMoreOlder(false);
      },
      (err: Error) => {
        console.error("Failed to load messages", err);
        setLoading(false);
      }
    );
  }, []);

  const loadOlder = useCallback(async () => {
    const oldest = olderMessages[0] ?? liveMessages[0];
    if (!oldest || loadingOlder || !hasMoreOlder) return;

    setLoadingOlder(true);
    try {
      const docs = await fetchOlderMessages<Message>(collection(db, "messages"), oldest.createdAt);
      if (docs.length < MESSAGE_PAGE_SIZE) setHasMoreOlder(false);
      if (docs.length > 0) setOlderMessages((prev) => [...docs, ...prev]);
    } catch (err) {
      console.error("Failed to load older messages", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [olderMessages, liveMessages, loadingOlder, hasMoreOlder]);

  return {
    messages: [...olderMessages, ...liveMessages],
    loading,
    loadOlder,
    loadingOlder,
    hasMoreOlder,
  };
}
```

- [ ] **Step 5: Verify the existing `useMessages.test.ts` still passes unchanged**

Run: `npx vitest run src/chat/useMessages.test.ts`
Expected: PASS, all 13 existing tests — no edits to that test file. If anything fails, the refactor changed observable behavior; fix `useMessages.ts` or `paginatedMessages.ts` until it matches exactly (do not edit the test to compensate).

- [ ] **Step 6: Write `useLobbyMessages.ts`**

```ts
// src/lobbies/useLobbyMessages.ts
import { useCallback, useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMessage } from "./lobbyTypes";
import { MESSAGE_PAGE_SIZE, subscribeToRecentMessages, fetchOlderMessages } from "../chat/paginatedMessages";

export interface LobbyMessageWithId extends LobbyMessage {
  id: string;
}

export function useLobbyMessages(lobbyId: string | null) {
  const [liveMessages, setLiveMessages] = useState<LobbyMessageWithId[]>([]);
  const [olderMessages, setOlderMessages] = useState<LobbyMessageWithId[]>([]);
  const [loading, setLoading] = useState(lobbyId !== null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  useEffect(() => {
    setOlderMessages([]);
    setHasMoreOlder(true);
    if (!lobbyId) {
      setLiveMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToRecentMessages<LobbyMessage>(
      collection(db, "lobbies", lobbyId, "messages"),
      (docs) => {
        setLiveMessages(docs);
        setLoading(false);
        if (docs.length < MESSAGE_PAGE_SIZE) setHasMoreOlder(false);
      },
      (err: Error) => {
        console.error("Failed to load lobby messages", err);
        setLoading(false);
      }
    );
  }, [lobbyId]);

  const loadOlder = useCallback(async () => {
    if (!lobbyId) return;
    const oldest = olderMessages[0] ?? liveMessages[0];
    if (!oldest || loadingOlder || !hasMoreOlder) return;

    setLoadingOlder(true);
    try {
      const docs = await fetchOlderMessages<LobbyMessage>(
        collection(db, "lobbies", lobbyId, "messages"),
        oldest.createdAt
      );
      if (docs.length < MESSAGE_PAGE_SIZE) setHasMoreOlder(false);
      if (docs.length > 0) setOlderMessages((prev) => [...docs, ...prev]);
    } catch (err) {
      console.error("Failed to load older lobby messages", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [lobbyId, olderMessages, liveMessages, loadingOlder, hasMoreOlder]);

  return {
    messages: [...olderMessages, ...liveMessages],
    loading,
    loadOlder,
    loadingOlder,
    hasMoreOlder,
  };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lobbies/useLobbyMessages.test.ts`
Expected: PASS, all 9 tests.

- [ ] **Step 8: Commit**

```bash
git add src/chat/paginatedMessages.ts src/chat/useMessages.ts src/lobbies/useLobbyMessages.ts src/lobbies/useLobbyMessages.test.ts
git commit -m "Extract shared message pagination helper; add useLobbyMessages"
```

---

## Phase 2 — Lobby actions

### Task 5: `sendLobbyMessage` + `sendLobbySystemMessage`

**Files:**
- Create: `src/lobbies/sendLobbyMessage.ts`
- Test: `src/lobbies/sendLobbyMessage.test.ts`

**Interfaces:**
- Consumes: `QuotedMessage` from `src/chat/sendMessage.ts`, `MESSAGE_MAX_LENGTH` from `src/chat/messageTypes.ts`, `LobbyMessage`/`LobbySystemKind` from `./lobbyTypes` (Task 1).
- Produces: `sendLobbyMessage(lobbyId, uid, text, mentionedUids?, quoted?): Promise<void>`, `sendLobbySystemMessage(lobbyId, actingUid, kind, subjectUid, subjectFirstName): Promise<void>`, `buildLobbySystemText(kind, subjectFirstName): string`. `sendLobbySystemMessage` is consumed by every action in Tasks 6–10 that narrates an event; `sendLobbyMessage` is consumed by Task 15 (`ChatComposer`).

The distinction that matters here: a system message's `uid` field is always the **acting** client (whoever's write this is — required by the security rule's sender-only check in Task 13), while `system.subjectUid` is who the message is **about**. These are the same person for `created`/`joined`/`left`/`renamed`, but differ for `removed` — the creator is acting, the removed person is the subject.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/sendLobbyMessage.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { sendLobbyMessage, sendLobbySystemMessage } from "./sendLobbyMessage";

describe("sendLobbyMessage", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: "msg1" });
  });

  it("writes a trimmed message to that lobby's messages subcollection", async () => {
    await sendLobbyMessage("lobby1", "uid1", "  Merhaba  ");
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ uid: "uid1", text: "Merhaba" }));
  });

  it("does nothing for empty/whitespace-only text", async () => {
    await sendLobbyMessage("lobby1", "uid1", "   ");
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("caps text at 360 characters", async () => {
    await sendLobbyMessage("lobby1", "uid1", "x".repeat(400));
    const written = mockAddDoc.mock.calls[0][1] as { text: string };
    expect(written.text).toHaveLength(360);
  });

  it("includes mentionedUids only when present", async () => {
    await sendLobbyMessage("lobby1", "uid1", "hey", ["uid2"]);
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ mentionedUids: ["uid2"] }));

    mockAddDoc.mockClear();
    await sendLobbyMessage("lobby1", "uid1", "hey");
    expect(mockAddDoc.mock.calls[0][1]).not.toHaveProperty("mentionedUids");
  });

  it("includes quote fields when a quoted message is passed", async () => {
    await sendLobbyMessage("lobby1", "uid1", "reply", [], { id: "orig1", uid: "uid2", text: "original" });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ quotedMessageId: "orig1", quotedAuthorUid: "uid2", quotedText: "original" })
    );
  });
});

describe("sendLobbySystemMessage", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: "msg1" });
  });

  it("writes uid as the acting user, and system.subjectUid as the narrated-about person", async () => {
    await sendLobbySystemMessage("lobby1", "creatorUid", "removed", "removedUid", "Ahmet");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        uid: "creatorUid",
        text: "Ahmet çıkarıldı.",
        system: { kind: "removed", subjectUid: "removedUid" },
      })
    );
  });

  it("uses the joined phrasing for a join event", async () => {
    await sendLobbySystemMessage("lobby1", "uid1", "joined", "uid1", "Zeynep");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Zeynep katıldı.", system: { kind: "joined", subjectUid: "uid1" } })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/sendLobbyMessage.test.ts`
Expected: FAIL — `Cannot find module './sendLobbyMessage'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/sendLobbyMessage.ts
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { MESSAGE_MAX_LENGTH } from "../chat/messageTypes";
import { QuotedMessage } from "../chat/sendMessage";
import { LobbyMessage, LobbySystemKind } from "./lobbyTypes";

export async function sendLobbyMessage(
  lobbyId: string,
  uid: string,
  text: string,
  mentionedUids: string[] = [],
  quoted?: QuotedMessage | null
): Promise<void> {
  const trimmed = text.trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!trimmed) return;
  const message: LobbyMessage = { uid, text: trimmed, createdAt: Date.now() };
  if (mentionedUids.length > 0) message.mentionedUids = mentionedUids;
  if (quoted) {
    message.quotedMessageId = quoted.id;
    message.quotedAuthorUid = quoted.uid;
    message.quotedText = quoted.text;
  }
  await addDoc(collection(db, "lobbies", lobbyId, "messages"), message);
}

export function buildLobbySystemText(kind: LobbySystemKind, subjectFirstName: string): string {
  switch (kind) {
    case "created":
      return "Grup oluşturuldu.";
    case "joined":
      return `${subjectFirstName} katıldı.`;
    case "left":
      return `${subjectFirstName} ayrıldı.`;
    case "removed":
      return `${subjectFirstName} çıkarıldı.`;
    case "renamed":
      return `${subjectFirstName} grubu yeniden adlandırdı.`;
  }
}

export async function sendLobbySystemMessage(
  lobbyId: string,
  actingUid: string,
  kind: LobbySystemKind,
  subjectUid: string,
  subjectFirstName: string
): Promise<void> {
  const message: LobbyMessage = {
    uid: actingUid,
    text: buildLobbySystemText(kind, subjectFirstName),
    createdAt: Date.now(),
    system: { kind, subjectUid },
  };
  await addDoc(collection(db, "lobbies", lobbyId, "messages"), message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/sendLobbyMessage.test.ts`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/sendLobbyMessage.ts src/lobbies/sendLobbyMessage.test.ts
git commit -m "Add sendLobbyMessage and sendLobbySystemMessage"
```

---

### Task 6: `createLobby`

**Files:**
- Create: `src/lobbies/createLobby.ts`
- Test: `src/lobbies/createLobby.test.ts`

**Interfaces:**
- Consumes: `Lobby`, `LobbyMember`, `LOBBY_NAME_MAX_LENGTH` from `./lobbyTypes`, `buildLobbySystemText` from `./sendLobbyMessage` (Task 5).
- Produces: `createLobby(uid: string, name: string, creatorFirstName: string): Promise<string>` (returns the new lobby's id). Consumed by Task 19 (`LobbyManagementPanel`'s "create new" entry point, wired in Task 20).

Writes the lobby doc, the creator's own bootstrap `members/{uid}` doc (`viaInviteId: null`), and the `created` system message as **one batch** — this is deliberate, not just convenient: it means the creator's membership and the lobby doc always exist together or not at all, so there's never a moment where a lobby exists without its creator already being a member (which the Task 13 security rule's bootstrap-membership check relies on).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/createLobby.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockWriteBatch = vi.fn();
const mockDoc = vi.fn((...args: unknown[]) => {
  if (args.length === 1) return { id: "generated-lobby-id" };
  const [, ...path] = args as [unknown, ...string[]];
  return { path };
});
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  doc: (...args: unknown[]) => mockDoc(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { createLobby } from "./createLobby";

interface FakeBatch {
  set: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}

describe("createLobby", () => {
  let batch: FakeBatch;

  beforeEach(() => {
    mockDoc.mockClear();
    mockCollection.mockClear();
    batch = { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);
  });

  it("returns the newly generated lobby id", async () => {
    const id = await createLobby("uid1", "Fener Grubu", "Ahmet");
    expect(id).toBe("generated-lobby-id");
  });

  it("writes the lobby doc, the creator's bootstrap member doc, and a created system message in one batch", async () => {
    await createLobby("uid1", "Fener Grubu", "Ahmet");
    expect(batch.set).toHaveBeenCalledTimes(3);
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Fener Grubu", createdByUid: "uid1" })
    );
    expect(batch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ uid: "uid1", viaInviteId: null }));
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: "Grup oluşturuldu.", system: { kind: "created", subjectUid: "uid1" } })
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("trims the name to 15 characters", async () => {
    await createLobby("uid1", "Bu isim gerçekten çok uzun bir grup ismi", "Ahmet");
    const lobbyWrite = batch.set.mock.calls.find((call) => "name" in (call[1] as object));
    expect((lobbyWrite![1] as { name: string }).name).toHaveLength(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/createLobby.test.ts`
Expected: FAIL — `Cannot find module './createLobby'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/createLobby.ts
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Lobby, LobbyMember, LobbyMessage, LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";
import { buildLobbySystemText } from "./sendLobbyMessage";

export async function createLobby(uid: string, name: string, creatorFirstName: string): Promise<string> {
  const trimmedName = name.trim().slice(0, LOBBY_NAME_MAX_LENGTH);
  const lobbyRef = doc(collection(db, "lobbies"));
  const memberRef = doc(db, "lobbies", lobbyRef.id, "members", uid);
  const systemMessageRef = doc(collection(db, "lobbies", lobbyRef.id, "messages"));

  const lobby: Lobby = { name: trimmedName, createdByUid: uid, createdAt: Date.now() };
  const member: LobbyMember = { uid, joinedAt: Date.now(), viaInviteId: null };
  const systemMessage: LobbyMessage = {
    uid,
    text: buildLobbySystemText("created", creatorFirstName),
    createdAt: Date.now(),
    system: { kind: "created", subjectUid: uid },
  };

  const batch = writeBatch(db);
  batch.set(lobbyRef, lobby);
  batch.set(memberRef, member);
  batch.set(systemMessageRef, systemMessage);
  await batch.commit();

  return lobbyRef.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/createLobby.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/createLobby.ts src/lobbies/createLobby.test.ts
git commit -m "Add createLobby action"
```

---

### Task 7: `generateLobbyInvite`

**Files:**
- Create: `src/lobbies/generateLobbyInvite.ts`
- Test: `src/lobbies/generateLobbyInvite.test.ts`

**Interfaces:**
- Consumes: `LobbyInvite`, `LOBBY_INVITE_LIFETIME_MS` from `./lobbyTypes`.
- Produces: `generateLobbyInvite(lobbyId: string, createdByUid: string): Promise<string>` (returns the new invite's id, used to build the shareable `#/join/:inviteId` URL). Consumed by Task 19 (`LobbyManagementPanel`'s "Get invite link" button).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/generateLobbyInvite.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { generateLobbyInvite } from "./generateLobbyInvite";
import { LOBBY_INVITE_LIFETIME_MS } from "./lobbyTypes";

describe("generateLobbyInvite", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: "invite1" });
  });

  it("writes an invite doc referencing the lobby and returns its new id", async () => {
    const id = await generateLobbyInvite("lobby1", "uid1");
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbyInvites");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ lobbyId: "lobby1", createdByUid: "uid1" }));
    expect(id).toBe("invite1");
  });

  it("sets expiresAt exactly one hour after createdAt", async () => {
    await generateLobbyInvite("lobby1", "uid1");
    const written = mockAddDoc.mock.calls[0][1] as { createdAt: number; expiresAt: number };
    expect(written.expiresAt - written.createdAt).toBe(LOBBY_INVITE_LIFETIME_MS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/generateLobbyInvite.test.ts`
Expected: FAIL — `Cannot find module './generateLobbyInvite'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/generateLobbyInvite.ts
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyInvite, LOBBY_INVITE_LIFETIME_MS } from "./lobbyTypes";

export async function generateLobbyInvite(lobbyId: string, createdByUid: string): Promise<string> {
  const now = Date.now();
  const invite: LobbyInvite = {
    lobbyId,
    createdByUid,
    createdAt: now,
    expiresAt: now + LOBBY_INVITE_LIFETIME_MS,
  };
  const docRef = await addDoc(collection(db, "lobbyInvites"), invite);
  return docRef.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/generateLobbyInvite.test.ts`
Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/generateLobbyInvite.ts src/lobbies/generateLobbyInvite.test.ts
git commit -m "Add generateLobbyInvite action"
```

---

### Task 8: `joinLobbyViaInvite`

**Files:**
- Create: `src/lobbies/joinLobbyViaInvite.ts`
- Test: `src/lobbies/joinLobbyViaInvite.test.ts`

**Interfaces:**
- Consumes: `LobbyInvite`, `LobbyMember`, `LOBBY_MAX_JOINED` from `./lobbyTypes`, `sendLobbySystemMessage` from `./sendLobbyMessage` (Task 5).
- Produces: `JoinLobbyResult` (a discriminated union: `{outcome: "joined"|"already-member"; lobbyId: string}` or `{outcome: "invalid-or-expired"|"at-cap"}`), `joinLobbyViaInvite(inviteId, uid, joinerFirstName, currentLobbyCount): Promise<JoinLobbyResult>`. Consumed by Task 18 (`JoinLobbyPage`), which maps each outcome to its corresponding redirect/toast per the design doc's outcome matrix.

`currentLobbyCount` is passed in by the caller (already available from `useMyLobbies()`) rather than queried again here — keeps this function a pure sequence of reads/writes with no dependency on React hooks.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/joinLobbyViaInvite.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { joinLobbyViaInvite } from "./joinLobbyViaInvite";

function snap(exists: boolean, data?: unknown) {
  return { exists: () => exists, data: () => data };
}

describe("joinLobbyViaInvite", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockAddDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("returns invalid-or-expired when the invite doesn't exist", async () => {
    mockGetDoc.mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "invalid-or-expired" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("returns invalid-or-expired when the invite has expired", async () => {
    mockGetDoc.mockResolvedValueOnce(
      snap(true, { lobbyId: "lobby1", createdByUid: "creator", createdAt: 0, expiresAt: Date.now() - 1000 })
    );
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "invalid-or-expired" });
  });

  it("returns invalid-or-expired when the referenced lobby no longer exists", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "invalid-or-expired" });
  });

  it("returns already-member without writing anything when already a member", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(true, { name: "Fener Grubu", createdByUid: "c", createdAt: 0 }))
      .mockResolvedValueOnce(snap(true, { uid: "uid1", joinedAt: 1, viaInviteId: null }));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 1);
    expect(result).toEqual({ outcome: "already-member", lobbyId: "lobby1" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("returns at-cap when the joiner already has 3 lobbies", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(true, { name: "Fener Grubu", createdByUid: "c", createdAt: 0 }))
      .mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 3);
    expect(result).toEqual({ outcome: "at-cap" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("joins successfully and writes a joined system message", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(true, { name: "Fener Grubu", createdByUid: "c", createdAt: 0 }))
      .mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "joined", lobbyId: "lobby1" });
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: ["lobbies", "lobby1", "members", "uid1"] },
      expect.objectContaining({ uid: "uid1", viaInviteId: "invite1" })
    );
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Ahmet katıldı.", system: { kind: "joined", subjectUid: "uid1" } })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/joinLobbyViaInvite.test.ts`
Expected: FAIL — `Cannot find module './joinLobbyViaInvite'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/joinLobbyViaInvite.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyInvite, LobbyMember, LOBBY_MAX_JOINED } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export type JoinLobbyResult =
  | { outcome: "joined"; lobbyId: string }
  | { outcome: "already-member"; lobbyId: string }
  | { outcome: "invalid-or-expired" }
  | { outcome: "at-cap" };

export async function joinLobbyViaInvite(
  inviteId: string,
  uid: string,
  joinerFirstName: string,
  currentLobbyCount: number
): Promise<JoinLobbyResult> {
  const inviteSnap = await getDoc(doc(db, "lobbyInvites", inviteId));
  if (!inviteSnap.exists()) return { outcome: "invalid-or-expired" };

  const invite = inviteSnap.data() as LobbyInvite;
  if (invite.expiresAt <= Date.now()) return { outcome: "invalid-or-expired" };

  const lobbySnap = await getDoc(doc(db, "lobbies", invite.lobbyId));
  if (!lobbySnap.exists()) return { outcome: "invalid-or-expired" };

  const memberSnap = await getDoc(doc(db, "lobbies", invite.lobbyId, "members", uid));
  if (memberSnap.exists()) return { outcome: "already-member", lobbyId: invite.lobbyId };

  if (currentLobbyCount >= LOBBY_MAX_JOINED) return { outcome: "at-cap" };

  const member: LobbyMember = { uid, joinedAt: Date.now(), viaInviteId: inviteId };
  await setDoc(doc(db, "lobbies", invite.lobbyId, "members", uid), member);
  await sendLobbySystemMessage(invite.lobbyId, uid, "joined", uid, joinerFirstName);

  return { outcome: "joined", lobbyId: invite.lobbyId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/joinLobbyViaInvite.test.ts`
Expected: PASS, all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/joinLobbyViaInvite.ts src/lobbies/joinLobbyViaInvite.test.ts
git commit -m "Add joinLobbyViaInvite action"
```

---

### Task 9: `leaveLobby`

**Files:**
- Create: `src/lobbies/leaveLobby.ts`
- Test: `src/lobbies/leaveLobby.test.ts`

**Interfaces:**
- Consumes: `LobbyMember`, `LobbyWithId` from `./lobbyTypes`, `sendLobbySystemMessage` from `./sendLobbyMessage`.
- Produces: `leaveLobby(lobby: LobbyWithId, uid: string, leaverFirstName: string, remainingMembers: LobbyMember[]): Promise<void>`. Consumed by Task 19 (`LobbyManagementPanel`'s "Leave lobby" button, no confirmation dialog per spec).

Three branches, matching the design doc addendum: (1) creator + zero remaining members → delete member doc and lobby doc, no system message; (2) creator + others remain → transfer `createdByUid` to whoever has the earliest `joinedAt` among `remainingMembers`, then delete the leaver's member doc and announce; (3) non-creator → just delete and announce. `remainingMembers` is passed in by the caller (already has it from `useLobbyMembers()`, filtered to exclude the leaver) rather than re-queried here.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/leaveLobby.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockDeleteDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { leaveLobby } from "./leaveLobby";
import { LobbyWithId } from "./lobbyTypes";

const lobby: LobbyWithId = { id: "lobby1", name: "Fener Grubu", createdByUid: "creator1", createdAt: 0 };

describe("leaveLobby", () => {
  beforeEach(() => {
    mockDeleteDoc.mockReset();
    mockUpdateDoc.mockReset();
    mockAddDoc.mockReset();
    mockDeleteDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("deletes both the member doc and the lobby doc when the creator is the sole remaining member", async () => {
    await leaveLobby(lobby, "creator1", "Ahmet", []);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "creator1"] });
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("transfers ownership to the next-oldest remaining member when the creator leaves and others remain", async () => {
    const remaining = [
      { uid: "uid2", joinedAt: 200, viaInviteId: "i1" },
      { uid: "uid3", joinedAt: 100, viaInviteId: "i2" },
    ];
    await leaveLobby(lobby, "creator1", "Ahmet", remaining);
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] }, { createdByUid: "uid3" });
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "creator1"] });
    expect(mockDeleteDoc).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Ahmet ayrıldı.", system: { kind: "left", subjectUid: "creator1" } })
    );
  });

  it("just removes a non-creator member and announces it, no ownership change", async () => {
    await leaveLobby(lobby, "uid2", "Zeynep", [{ uid: "creator1", joinedAt: 0, viaInviteId: null }]);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
    expect(mockDeleteDoc).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Zeynep ayrıldı.", system: { kind: "left", subjectUid: "uid2" } })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/leaveLobby.test.ts`
Expected: FAIL — `Cannot find module './leaveLobby'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/leaveLobby.ts
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMember, LobbyWithId } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export async function leaveLobby(
  lobby: LobbyWithId,
  uid: string,
  leaverFirstName: string,
  remainingMembers: LobbyMember[]
): Promise<void> {
  const isCreator = lobby.createdByUid === uid;

  if (isCreator && remainingMembers.length === 0) {
    await deleteDoc(doc(db, "lobbies", lobby.id, "members", uid));
    await deleteDoc(doc(db, "lobbies", lobby.id));
    return;
  }

  if (isCreator) {
    const nextOwner = [...remainingMembers].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    await updateDoc(doc(db, "lobbies", lobby.id), { createdByUid: nextOwner.uid });
  }

  await deleteDoc(doc(db, "lobbies", lobby.id, "members", uid));
  await sendLobbySystemMessage(lobby.id, uid, "left", uid, leaverFirstName);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/leaveLobby.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/leaveLobby.ts src/lobbies/leaveLobby.test.ts
git commit -m "Add leaveLobby action"
```

---

### Task 10: `removeMember`

**Files:**
- Create: `src/lobbies/removeMember.ts`
- Test: `src/lobbies/removeMember.test.ts`

**Interfaces:**
- Consumes: `sendLobbySystemMessage` from `./sendLobbyMessage`.
- Produces: `removeMember(lobbyId: string, creatorUid: string, removedUid: string, removedFirstName: string): Promise<void>`. Consumed by Task 19 (creator-only "remove" action next to each non-creator row in the member list).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/removeMember.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockDeleteDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { removeMember } from "./removeMember";

describe("removeMember", () => {
  beforeEach(() => {
    mockDeleteDoc.mockReset();
    mockAddDoc.mockReset();
    mockDeleteDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("deletes the removed member's doc", async () => {
    await removeMember("lobby1", "creator1", "uid2", "Zeynep");
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
  });

  it("writes a removed system message authored by the creator, about the removed person", async () => {
    await removeMember("lobby1", "creator1", "uid2", "Zeynep");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        uid: "creator1",
        text: "Zeynep çıkarıldı.",
        system: { kind: "removed", subjectUid: "uid2" },
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/removeMember.test.ts`
Expected: FAIL — `Cannot find module './removeMember'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/removeMember.ts
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export async function removeMember(
  lobbyId: string,
  creatorUid: string,
  removedUid: string,
  removedFirstName: string
): Promise<void> {
  await deleteDoc(doc(db, "lobbies", lobbyId, "members", removedUid));
  await sendLobbySystemMessage(lobbyId, creatorUid, "removed", removedUid, removedFirstName);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/removeMember.test.ts`
Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/removeMember.ts src/lobbies/removeMember.test.ts
git commit -m "Add removeMember action"
```

---

### Task 11: `renameLobby`

**Files:**
- Create: `src/lobbies/renameLobby.ts`
- Test: `src/lobbies/renameLobby.test.ts`

**Interfaces:**
- Consumes: `LOBBY_NAME_MAX_LENGTH` from `./lobbyTypes`, `sendLobbySystemMessage` from `./sendLobbyMessage`.
- Produces: `renameLobby(lobbyId: string, uid: string, renamerFirstName: string, newName: string): Promise<void>`. Consumed by Task 19 (`LobbyManagementPanel`'s inline name field, editable by any member).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/renameLobby.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockUpdateDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { renameLobby } from "./renameLobby";

describe("renameLobby", () => {
  beforeEach(() => {
    mockUpdateDoc.mockReset();
    mockAddDoc.mockReset();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("updates the name field and announces the rename", async () => {
    await renameLobby("lobby1", "uid1", "Ahmet", "Yeni İsim");
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] }, { name: "Yeni İsim" });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Ahmet grubu yeniden adlandırdı.", system: { kind: "renamed", subjectUid: "uid1" } })
    );
  });

  it("trims the new name to 15 characters", async () => {
    await renameLobby("lobby1", "uid1", "Ahmet", "Bu isim gerçekten çok uzun bir grup ismi");
    const written = mockUpdateDoc.mock.calls[0][1] as { name: string };
    expect(written.name).toHaveLength(15);
  });

  it("does nothing for an empty/whitespace-only name", async () => {
    await renameLobby("lobby1", "uid1", "Ahmet", "   ");
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/renameLobby.test.ts`
Expected: FAIL — `Cannot find module './renameLobby'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/renameLobby.ts
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";
import { sendLobbySystemMessage } from "./sendLobbyMessage";

export async function renameLobby(
  lobbyId: string,
  uid: string,
  renamerFirstName: string,
  newName: string
): Promise<void> {
  const trimmed = newName.trim().slice(0, LOBBY_NAME_MAX_LENGTH);
  if (!trimmed) return;
  await updateDoc(doc(db, "lobbies", lobbyId), { name: trimmed });
  await sendLobbySystemMessage(lobbyId, uid, "renamed", uid, renamerFirstName);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/renameLobby.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/renameLobby.ts src/lobbies/renameLobby.test.ts
git commit -m "Add renameLobby action"
```

---

### Task 12: `deleteLobby`

**Files:**
- Create: `src/lobbies/deleteLobby.ts`
- Test: `src/lobbies/deleteLobby.test.ts`

**Interfaces:**
- Produces: `deleteLobby(lobbyId: string): Promise<void>`. Consumed by Task 19 (creator-only "Delete lobby" button, gated behind a confirmation dialog in the UI layer — this function itself performs no confirmation, that's the caller's job).

Deletes every `members/{uid}` doc *and* the lobby doc itself, in one batch — required, not optional (see design doc's Known Limitations: every read rule checks for the requester's own member doc, not the lobby doc's existence, so leaving member docs behind would let former members keep reading forever). Does **not** touch the `messages` subcollection or any `lobbyInvites` docs — those become unreadable once every member doc is gone, and cleaning them up isn't worth a recursive batch-delete for a potentially-unbounded history (see design doc).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lobbies/deleteLobby.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockWriteBatch = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

interface FakeBatch {
  delete: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { deleteLobby } from "./deleteLobby";

describe("deleteLobby", () => {
  let batch: FakeBatch;

  beforeEach(() => {
    mockGetDocs.mockReset();
    batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);
  });

  it("deletes every member doc and the lobby doc itself in one batch", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { ref: { path: ["lobbies", "lobby1", "members", "uid1"] } },
        { ref: { path: ["lobbies", "lobby1", "members", "uid2"] } },
      ],
    });

    await deleteLobby("lobby1");

    expect(batch.delete).toHaveBeenCalledTimes(3);
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid1"] });
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("still deletes the lobby doc even with zero members", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await deleteLobby("lobby1");
    expect(batch.delete).toHaveBeenCalledTimes(1);
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/deleteLobby.test.ts`
Expected: FAIL — `Cannot find module './deleteLobby'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lobbies/deleteLobby.ts
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export async function deleteLobby(lobbyId: string): Promise<void> {
  const membersSnap = await getDocs(collection(db, "lobbies", lobbyId, "members"));
  const batch = writeBatch(db);
  membersSnap.docs.forEach((memberDoc) => batch.delete(memberDoc.ref));
  batch.delete(doc(db, "lobbies", lobbyId));
  await batch.commit();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/deleteLobby.test.ts`
Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/deleteLobby.ts src/lobbies/deleteLobby.test.ts
git commit -m "Add deleteLobby action"
```

---

## Phase 3 — Firestore rules

### Task 13: Security rules for lobbies, members, invites, lobby messages

**Files:**
- Modify: `firestore.rules` (append new `match` blocks inside the existing `match /databases/{database}/documents {` body, alongside `profiles`/`messages`/etc.)

No red/green cycle here — this project has no rules-testing harness (see design doc's Testing Approach), so verification is hand-reasoning plus a live deploy, matching every prior rules change this session.

- [ ] **Step 1: Append these blocks to `firestore.rules`**

```
    // Special Lobby: private friend-group sub-scopes. Membership is a
    // subcollection (not an array field) specifically so joining can be
    // verified against a real invite via exists()/get() — see design doc
    // docs/superpowers/specs/2026-07-29-special-lobby-design.md.
    match /lobbies/{lobbyId} {
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/lobbies/$(lobbyId)/members/$(request.auth.uid));
      allow create: if request.auth != null
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.name.size() <= 15
        && request.resource.data.createdByUid == request.auth.uid;
      // Two distinct shapes: a rename (any current member) or an ownership
      // transfer (only the departing creator, only to an existing member —
      // see leaveLobby.ts's ownership-transfer branch).
      allow update: if request.auth != null && (
        (
          exists(/databases/$(database)/documents/lobbies/$(lobbyId)/members/$(request.auth.uid))
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name'])
          && request.resource.data.name is string
          && request.resource.data.name.size() > 0
          && request.resource.data.name.size() <= 15
        ) || (
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['createdByUid'])
          && resource.data.createdByUid == request.auth.uid
          && exists(/databases/$(database)/documents/lobbies/$(lobbyId)/members/$(request.resource.data.createdByUid))
        )
      );
      allow delete: if request.auth != null && resource.data.createdByUid == request.auth.uid;
    }

    match /lobbies/{lobbyId}/members/{uid} {
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/lobbies/$(lobbyId)/members/$(request.auth.uid));
      // Two shapes: the creator's own bootstrap membership (no invite exists
      // yet at lobby-creation time), or a normal invite-gated join.
      allow create: if request.auth != null
        && request.auth.uid == uid
        && (
          (
            request.resource.data.viaInviteId == null
            && get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.createdByUid == request.auth.uid
          ) || (
            request.resource.data.viaInviteId is string
            && get(/databases/$(database)/documents/lobbyInvites/$(request.resource.data.viaInviteId)).data.lobbyId == lobbyId
            && get(/databases/$(database)/documents/lobbyInvites/$(request.resource.data.viaInviteId)).data.expiresAt > request.time.toMillis()
          )
        );
      // Self-removal (leaving) or creator-removes-someone-else — also used
      // by deleteLobby.ts to clear every member doc when the whole lobby goes.
      allow delete: if request.auth != null
        && (
          request.auth.uid == uid
          || get(/databases/$(database)/documents/lobbies/$(lobbyId)).data.createdByUid == request.auth.uid
        );
    }

    match /lobbyInvites/{inviteId} {
      // Readable by any signed-in user — a not-yet-member needs to resolve
      // the token before they have any membership doc to gate on.
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && exists(/databases/$(database)/documents/lobbies/$(request.resource.data.lobbyId)/members/$(request.auth.uid))
        && request.resource.data.createdByUid == request.auth.uid
        && request.resource.data.expiresAt == request.resource.data.createdAt + 3600000;
      allow update, delete: if false;
    }

    match /lobbies/{lobbyId}/messages/{messageId} {
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/lobbies/$(lobbyId)/members/$(request.auth.uid));
      allow create: if request.auth != null
        && exists(/databases/$(database)/documents/lobbies/$(lobbyId)/members/$(request.auth.uid))
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 360;
      allow update: if request.auth != null
        && resource.data.uid == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['deleted'])
        && request.resource.data.deleted == true;
      allow delete: if false;
    }
```

- [ ] **Step 2: Deploy**

Run: `firebase deploy --only firestore:rules`
Expected: deploy succeeds (same command used for every prior rules change this session).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "Add Firestore security rules for Special Lobby"
```

---

## Phase 4 — Chat integration

### Task 14: System-message rendering in `ChatRoom`

**Files:**
- Modify: `src/chat/ChatRoom.tsx`
- Modify: `src/chat/ChatRoom.test.tsx` (add one test to the existing suite)

**Interfaces:**
- Consumes: `LobbySystemInfo` from `src/lobbies/lobbyTypes.ts` (Task 1).
- Produces: `ChatRoomProps.messages` now accepts an optional `system?: LobbySystemInfo` per message (widened from `MessageWithId[]` to `(MessageWithId & { system?: LobbySystemInfo })[]`) — this is how Task 20 feeds lobby messages (which do carry `system`) through the same, otherwise-unchanged component.

A system message renders as a centered, muted line with no avatar, no bubble, no header, no quote/delete/reply affordances — it's never mistaken for something a person said. Everything else about `MessageRow` stays as-is; the system check is a short-circuit at the top.

- [ ] **Step 1: Widen the props type and add the system-message branch**

In `src/chat/ChatRoom.tsx`, add the import and widen `messages`:

```ts
import { LobbySystemInfo } from "../lobbies/lobbyTypes";
```

```ts
interface ChatRoomProps {
  uid: string;
  players: Player[];
  messages: (MessageWithId & { system?: LobbySystemInfo })[];
  onLoadOlder: () => void;
  loadingOlder: boolean;
  hasMoreOlder: boolean;
  typingUids: string[];
  onSelectParticipant: (uid: string) => void;
}
```

Update `MessageRow`'s own prop type for `message` the same way, then add this as the very first check inside `MessageRow`, before anything else in its body:

```tsx
if (message.system) {
  return (
    <li className="flex justify-center py-1">
      <span className="text-xs text-color_textsecondary italic">{message.text}</span>
    </li>
  );
}
```

- [ ] **Step 2: Add a test to the existing `ChatRoom.test.tsx`**

Open `src/chat/ChatRoom.test.tsx`, find its existing render helper/fixture setup (it already builds a `players` array and a `messages` array to pass to `ChatRoom`), and add one test alongside the others using that same helper:

```tsx
it("renders a system message as a plain centered line, not a bubble", () => {
  // Use the file's existing render helper, with a messages array containing
  // one system-flagged entry:
  // { id: "sys1", uid: "uid1", text: "Ahmet katıldı.", createdAt: 100,
  //   system: { kind: "joined", subjectUid: "uid1" } }
  // Assert the rendered text "Ahmet katıldı." appears, and that it is NOT
  // inside an element carrying the row's normal bubble classes (no
  // "rounded-xl" ancestor) — e.g.:
  // expect(screen.getByText("Ahmet katıldı.").closest(".rounded-xl")).toBeNull();
});
```

- [ ] **Step 3: Run the full ChatRoom suite**

Run: `npx vitest run src/chat/ChatRoom.test.tsx`
Expected: PASS, including the new test and every pre-existing one unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/chat/ChatRoom.tsx src/chat/ChatRoom.test.tsx
git commit -m "Render lobby system messages as plain centered lines in ChatRoom"
```

---

### Task 15: Lobby-aware sending in `ChatComposer`

**Files:**
- Modify: `src/chat/ChatComposer.tsx`
- Modify: `src/chat/ChatComposer.test.tsx` (add tests to the existing suite)

**Interfaces:**
- Consumes: `sendLobbyMessage` from `src/lobbies/sendLobbyMessage.ts` (Task 5).
- Produces: `ChatComposerProps` gains an optional `lobbyId?: string | null`. When set, `handleSubmit` calls `sendLobbyMessage(lobbyId, ...)` instead of the global `sendMessage(...)`.

**Scope decision, noted rather than silently applied:** typing indicators (`setTypingStatus`) stay a Genel-only feature — they are **not** wired up for lobby chat in this pass. The existing `typingStatus` collection has no concept of *which* chat someone is typing in; reusing it as-is for a lobby would make someone typing in Genel incorrectly show as "typing" inside every lobby's filtered view too. Building a correct lobby-scoped version needs either a new per-lobby subcollection or a schema change to the existing global one — real scope beyond what any of the 9 questionnaire rounds asked for, and typing indicators are cosmetic, not structural. `ChatComposer` simply skips calling `setTypingStatus`/`reportTyping` when `lobbyId` is set. Online-count/presence is unaffected — that's a static "are they on the site" fact, not a "what are they doing right now" one, so filtering the existing global data for it (already covered in Task 20) stays correct.

- [ ] **Step 1: Add `lobbyId` and branch the send/typing calls**

In `src/chat/ChatComposer.tsx`:

```ts
import { sendLobbyMessage } from "../lobbies/sendLobbyMessage";
```

```ts
interface ChatComposerProps {
  uid: string;
  players: Player[];
  quoted: QuotedMessage | null;
  onClearQuote: () => void;
  lobbyId?: string | null;
}
```

```ts
export function ChatComposer({ uid, players, quoted, onClearQuote, lobbyId = null }: ChatComposerProps) {
```

Replace `reportTyping`'s body to no-op when in a lobby:

```ts
  function reportTyping(hasText: boolean) {
    if (lobbyId) return;
    const now = Date.now();
    if (hasText) {
      if (now - lastTypingSentRef.current > TYPING_RESEND_MS) {
        lastTypingSentRef.current = now;
        setTypingStatus(uid, true).catch((err) => console.error("Failed to send typing status", err));
      }
    } else {
      lastTypingSentRef.current = 0;
      setTypingStatus(uid, false).catch((err) => console.error("Failed to clear typing status", err));
    }
  }
```

Replace the send call inside `handleSubmit`:

```ts
    try {
      if (lobbyId) {
        await sendLobbyMessage(lobbyId, uid, text, mentionedUids, quoted);
      } else {
        await sendMessage(uid, text, mentionedUids, quoted);
      }
      triggerCooldown();
```

- [ ] **Step 2: Add tests to the existing `ChatComposer.test.tsx`**

Open `src/chat/ChatComposer.test.tsx`, find its existing `sendMessage` mock setup, add a mock for `sendLobbyMessage` the same way (`vi.mock("../lobbies/sendLobbyMessage", () => ({ sendLobbyMessage: vi.fn() }))`), and add:

```tsx
it("calls sendLobbyMessage instead of sendMessage when lobbyId is set", async () => {
  // Render with lobbyId="lobby1", type a message, submit.
  // Assert sendLobbyMessage was called with ("lobby1", uid, text, ...)
  // and the global sendMessage mock was NOT called.
});

it("does not report typing status when lobbyId is set", async () => {
  // Render with lobbyId="lobby1", type a character.
  // Assert setTypingStatus was NOT called.
});
```

- [ ] **Step 3: Run the full ChatComposer suite**

Run: `npx vitest run src/chat/ChatComposer.test.tsx`
Expected: PASS, including the new tests and every pre-existing one unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/chat/ChatComposer.tsx src/chat/ChatComposer.test.tsx
git commit -m "Make ChatComposer lobby-aware: scoped sends, no typing indicator in lobbies"
```

---

## Phase 5 — Switcher, toasts, join route, management panel

### Task 16: `sonner` dependency, mounted `Toaster`, toast helpers

**Files:**
- Modify: `package.json` (add `sonner` dependency)
- Modify: `src/shell/AppShell.tsx` (mount `<Toaster />` once)
- Create: `src/lobbies/lobbyToasts.ts`

**Interfaces:**
- Produces: `showInviteInvalidToast(): void`, `showLobbyCapToast(): void`. Consumed by Task 18 (`JoinLobbyPage`).

No dedicated test file for `lobbyToasts.ts` — it's a two-function pass-through wrapper around a well-tested third-party library; a test here would only assert "the mock was called," which the consumer's own tests (Task 18) already cover indirectly through `JoinLobbyPage`'s mocked calls to these two functions.

- [ ] **Step 1: Install the dependency**

Run: `npm install sonner`

- [ ] **Step 2: Mount the Toaster**

In `src/shell/AppShell.tsx`, add the import:

```ts
import { Toaster } from "sonner";
```

Add `<Toaster closeButton />` as a sibling right after the closing `</header>` tag (before `<main>`), so it renders once regardless of route — `closeButton` is required here, since the spec calls for manually-dismissed toasts, not auto-timeout ones.

- [ ] **Step 3: Write the toast helpers**

```ts
// src/lobbies/lobbyToasts.ts
import { toast } from "sonner";

export function showInviteInvalidToast(): void {
  toast.error("Bu davet artık geçerli değil.", { duration: Infinity });
}

export function showLobbyCapToast(): void {
  toast.error("En fazla 3 gruba katılabilirsin.", { duration: Infinity });
}
```

- [ ] **Step 4: Verify the app still builds and existing AppShell tests pass**

Run: `npx tsc -b --noEmit && npx vitest run src/shell/AppShell.test.tsx`
Expected: no errors, existing `AppShell.test.tsx` still passes unchanged.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/shell/AppShell.tsx src/lobbies/lobbyToasts.ts
git commit -m "Add sonner for toasts; mount Toaster; add lobby toast helpers"
```

---

### Task 17: `LobbySwitcher` component

**Files:**
- Create: `src/lobbies/LobbySwitcher.tsx`
- Test: `src/lobbies/LobbySwitcher.test.tsx`

**Interfaces:**
- Consumes: `MyLobby` from `./useMyLobbies` (Task 2).
- Produces: `LobbySwitcher({ options: MyLobby[]; current: string | null; onChange: (lobbyId: string | null) => void })`. `current === null` means "Genel." Consumed by Task 20 (one instance per Home cell, each with its own independent state).

Renders nothing when `options` is empty (a user with zero lobbies never sees a switcher at all — matches "only shows up once you have a lobby"). Otherwise a single button showing the current view's name plus a `›`, cycling General → each lobby (by array order) → back to General on every click — a blind cycle, no dropdown/popover, per Round 5.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/lobbies/LobbySwitcher.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LobbySwitcher } from "./LobbySwitcher";
import { MyLobby } from "./useMyLobbies";

const lobbyA: MyLobby = { id: "lobbyA", name: "A Grubu", createdByUid: "c1", createdAt: 1, myJoinedAt: 100 };
const lobbyB: MyLobby = { id: "lobbyB", name: "B Grubu", createdByUid: "c2", createdAt: 2, myJoinedAt: 200 };

describe("LobbySwitcher", () => {
  it("renders nothing when the user has no lobbies", () => {
    const { container } = render(<LobbySwitcher options={[]} current={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Genel when current is null", () => {
    render(<LobbySwitcher options={[lobbyA]} current={null} onChange={vi.fn()} />);
    expect(screen.getByText("Genel")).toBeInTheDocument();
  });

  it("shows the current lobby's name", () => {
    render(<LobbySwitcher options={[lobbyA]} current="lobbyA" onChange={vi.fn()} />);
    expect(screen.getByText("A Grubu")).toBeInTheDocument();
  });

  it("cycles from Genel to the first lobby on click", () => {
    const onChange = vi.fn();
    render(<LobbySwitcher options={[lobbyA, lobbyB]} current={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("lobbyA");
  });

  it("cycles from the last lobby back to Genel", () => {
    const onChange = vi.fn();
    render(<LobbySwitcher options={[lobbyA, lobbyB]} current="lobbyB" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("cycles from one lobby to the next", () => {
    const onChange = vi.fn();
    render(<LobbySwitcher options={[lobbyA, lobbyB]} current="lobbyA" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("lobbyB");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/LobbySwitcher.test.tsx`
Expected: FAIL — `Cannot find module './LobbySwitcher'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/lobbies/LobbySwitcher.tsx
import { MyLobby } from "./useMyLobbies";

interface LobbySwitcherProps {
  options: MyLobby[];
  current: string | null;
  onChange: (lobbyId: string | null) => void;
}

export function LobbySwitcher({ options, current, onChange }: LobbySwitcherProps) {
  if (options.length === 0) return null;

  const sequence: (string | null)[] = [null, ...options.map((o) => o.id)];
  const currentLabel = current === null ? "Genel" : (options.find((o) => o.id === current)?.name ?? "Genel");

  function handleClick() {
    const currentIndex = sequence.indexOf(current);
    const nextIndex = (currentIndex + 1) % sequence.length;
    onChange(sequence[nextIndex]);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex shrink-0 cursor-pointer items-center gap-1 font-mono text-[0.62rem] tracking-[0.1em] text-color_textsecondary uppercase outline-none transition-colors hover:text-color_accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent"
    >
      {currentLabel}
      <span aria-hidden>›</span>
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/LobbySwitcher.test.ts`
Expected: PASS, all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/LobbySwitcher.tsx src/lobbies/LobbySwitcher.test.tsx
git commit -m "Add LobbySwitcher component"
```

---

### Task 18: `JoinLobbyPage` + route

**Files:**
- Create: `src/pages/JoinLobbyPage.tsx`
- Test: `src/pages/JoinLobbyPage.test.tsx`
- Modify: `src/App.tsx` (add the `/join/:inviteId` route)

**Interfaces:**
- Consumes: `joinLobbyViaInvite` (Task 8), `showInviteInvalidToast`/`showLobbyCapToast` (Task 16), `useMyLobbies` (Task 2), `useProfile`, `useAuth`.
- Produces: `JoinLobbyPage()` — a route component with no visible UI of its own; it resolves the join attempt then redirects to `/`, per the design doc's full outcome matrix.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pages/JoinLobbyPage.test.tsx
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.fn();
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));

const mockUseProfile = vi.fn();
vi.mock("../profile/useProfile", () => ({ useProfile: () => mockUseProfile() }));

const mockUseMyLobbies = vi.fn();
vi.mock("../lobbies/useMyLobbies", () => ({ useMyLobbies: () => mockUseMyLobbies() }));

const mockJoinLobbyViaInvite = vi.fn();
vi.mock("../lobbies/joinLobbyViaInvite", () => ({
  joinLobbyViaInvite: (...args: unknown[]) => mockJoinLobbyViaInvite(...args),
}));

const mockShowInviteInvalidToast = vi.fn();
const mockShowLobbyCapToast = vi.fn();
vi.mock("../lobbies/lobbyToasts", () => ({
  showInviteInvalidToast: () => mockShowInviteInvalidToast(),
  showLobbyCapToast: () => mockShowLobbyCapToast(),
}));

import { JoinLobbyPage } from "./JoinLobbyPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/join/:inviteId" element={<JoinLobbyPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("JoinLobbyPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockJoinLobbyViaInvite.mockReset();
    mockShowInviteInvalidToast.mockReset();
    mockShowLobbyCapToast.mockReset();
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Ahmet", lastName: "Y", photoURL: "", createdAt: 0 },
      loading: false,
    });
    mockUseMyLobbies.mockReturnValue({ lobbies: [], loading: false });
  });

  it("redirects home without attempting a join when not signed in", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
    expect(mockJoinLobbyViaInvite).not.toHaveBeenCalled();
  });

  it("joins successfully and redirects home with no toast", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "joined", lobbyId: "lobby1" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
    expect(mockJoinLobbyViaInvite).toHaveBeenCalledWith("invite1", "uid1", "Ahmet", 0);
    expect(mockShowInviteInvalidToast).not.toHaveBeenCalled();
    expect(mockShowLobbyCapToast).not.toHaveBeenCalled();
  });

  it("shows the invalid-link toast and redirects when the invite is invalid or expired", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "invalid-or-expired" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockShowInviteInvalidToast).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows the at-cap toast and redirects when already at the lobby limit", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "at-cap" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockShowLobbyCapToast).toHaveBeenCalledTimes(1));
  });

  it("redirects silently with no toast when already a member", async () => {
    mockJoinLobbyViaInvite.mockResolvedValue({ outcome: "already-member", lobbyId: "lobby1" });
    renderAt("/join/invite1");
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
    expect(mockShowInviteInvalidToast).not.toHaveBeenCalled();
    expect(mockShowLobbyCapToast).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/JoinLobbyPage.test.tsx`
Expected: FAIL — `Cannot find module './JoinLobbyPage'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/pages/JoinLobbyPage.tsx
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../profile/useProfile";
import { useMyLobbies } from "../lobbies/useMyLobbies";
import { joinLobbyViaInvite } from "../lobbies/joinLobbyViaInvite";
import { showInviteInvalidToast, showLobbyCapToast } from "../lobbies/lobbyToasts";

export function JoinLobbyPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { lobbies, loading: lobbiesLoading } = useMyLobbies(user?.uid ?? null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (authLoading || profileLoading || lobbiesLoading) return;
    if (!user || !profile || !inviteId) {
      navigate("/", { replace: true });
      return;
    }
    attempted.current = true;

    joinLobbyViaInvite(inviteId, user.uid, profile.firstName, lobbies.length)
      .then((result) => {
        if (result.outcome === "invalid-or-expired") showInviteInvalidToast();
        if (result.outcome === "at-cap") showLobbyCapToast();
        navigate("/", { replace: true });
      })
      .catch((err) => {
        console.error("Failed to join lobby", err);
        showInviteInvalidToast();
        navigate("/", { replace: true });
      });
  }, [authLoading, profileLoading, lobbiesLoading, user, profile, lobbies.length, inviteId, navigate]);

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/JoinLobbyPage.test.tsx`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Wire the route into `App.tsx`**

Add the import and route:

```ts
import { JoinLobbyPage } from "./pages/JoinLobbyPage";
```

```tsx
<Route path="/join/:inviteId" element={<JoinLobbyPage />} />
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/JoinLobbyPage.tsx src/pages/JoinLobbyPage.test.tsx src/App.tsx
git commit -m "Add JoinLobbyPage and /join/:inviteId route"
```

---

### Task 19: `LobbyManagementPanel` component

**Files:**
- Create: `src/lobbies/LobbyManagementPanel.tsx`
- Test: `src/lobbies/LobbyManagementPanel.test.tsx`

**Interfaces:**
- Consumes: `renameLobby` (Task 11), `generateLobbyInvite` (Task 7), `leaveLobby` (Task 9), `removeMember` (Task 10), `deleteLobby` (Task 12), `buildPlayersByUid` (existing), `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`/`Button`/`Avatar` (existing shadcn components).
- Produces: `LobbyManagementPanel({ lobby: LobbyWithId; members: LobbyMember[]; players: Player[]; myUid: string; myFirstName: string; open: boolean; onOpenChange: (open: boolean) => void; onLeft: () => void; onDeleted: () => void })`. `onLeft`/`onDeleted` let Task 20's Home wiring reset that cell's switcher back to Genel afterward. Consumed by Task 20.

Single scrolling `DialogContent` — no internal sub-tabs, per Round 5. Rename saves on blur. Invite generation shows the resulting shareable URL in a read-only, select-on-focus input (copy via native browser select-all, no custom clipboard code needed here — unlike the earlier questionnaire artifacts, this runs inside the app's own page, not a sandboxed iframe, so the ordinary system copy shortcut works fine). Leave has no confirmation; delete does, in a second stacked `Dialog`, matching `ProfilePage.tsx`'s existing delete-confirmation pattern exactly.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/lobbies/LobbyManagementPanel.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockRenameLobby = vi.fn();
const mockGenerateLobbyInvite = vi.fn();
const mockLeaveLobby = vi.fn();
const mockRemoveMember = vi.fn();
const mockDeleteLobby = vi.fn();

vi.mock("./renameLobby", () => ({ renameLobby: (...args: unknown[]) => mockRenameLobby(...args) }));
vi.mock("./generateLobbyInvite", () => ({ generateLobbyInvite: (...args: unknown[]) => mockGenerateLobbyInvite(...args) }));
vi.mock("./leaveLobby", () => ({ leaveLobby: (...args: unknown[]) => mockLeaveLobby(...args) }));
vi.mock("./removeMember", () => ({ removeMember: (...args: unknown[]) => mockRemoveMember(...args) }));
vi.mock("./deleteLobby", () => ({ deleteLobby: (...args: unknown[]) => mockDeleteLobby(...args) }));

import { LobbyManagementPanel } from "./LobbyManagementPanel";
import { LobbyWithId, LobbyMember } from "./lobbyTypes";
import { Player } from "../profile/usePlayers";

const lobby: LobbyWithId = { id: "lobby1", name: "Fener Grubu", createdByUid: "creator1", createdAt: 0 };
const members: LobbyMember[] = [
  { uid: "creator1", joinedAt: 0, viaInviteId: null },
  { uid: "uid2", joinedAt: 100, viaInviteId: "i1" },
];
const players: Player[] = [
  { uid: "creator1", firstName: "Ahmet", lastName: "Y", photoURL: "", createdAt: 0 },
  { uid: "uid2", firstName: "Zeynep", lastName: "K", photoURL: "", createdAt: 0 },
];

function renderPanel(myUid = "creator1") {
  return render(
    <LobbyManagementPanel
      lobby={lobby}
      members={members}
      players={players}
      myUid={myUid}
      myFirstName={myUid === "creator1" ? "Ahmet" : "Zeynep"}
      open={true}
      onOpenChange={vi.fn()}
      onLeft={vi.fn()}
      onDeleted={vi.fn()}
    />
  );
}

describe("LobbyManagementPanel", () => {
  beforeEach(() => {
    mockRenameLobby.mockReset().mockResolvedValue(undefined);
    mockGenerateLobbyInvite.mockReset().mockResolvedValue("invite1");
    mockLeaveLobby.mockReset().mockResolvedValue(undefined);
    mockRemoveMember.mockReset().mockResolvedValue(undefined);
    mockDeleteLobby.mockReset().mockResolvedValue(undefined);
  });

  it("renames on blur when the name changed", async () => {
    renderPanel();
    const input = screen.getByDisplayValue("Fener Grubu");
    fireEvent.change(input, { target: { value: "Yeni İsim" } });
    fireEvent.blur(input);
    await waitFor(() => expect(mockRenameLobby).toHaveBeenCalledWith("lobby1", "creator1", "Ahmet", "Yeni İsim"));
  });

  it("shows the invite link once generated", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Davet linki oluştur"));
    await waitFor(() => expect(mockGenerateLobbyInvite).toHaveBeenCalledWith("lobby1", "creator1"));
    await waitFor(() => expect(screen.getByDisplayValue(/#\/join\/invite1$/)).toBeInTheDocument());
  });

  it("shows the crown next to the creator", () => {
    renderPanel();
    expect(screen.getByLabelText("Kurucu")).toBeInTheDocument();
  });

  it("only shows a remove button next to non-creator members when the creator is viewing", () => {
    renderPanel("creator1");
    expect(screen.getAllByText("Çıkar")).toHaveLength(1);
  });

  it("hides remove buttons entirely for a non-creator viewer", () => {
    renderPanel("uid2");
    expect(screen.queryByText("Çıkar")).toBeNull();
  });

  it("only shows the delete button for the creator", () => {
    renderPanel("uid2");
    expect(screen.queryByText("Grubu sil")).toBeNull();
  });

  it("leaves without a confirmation dialog", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Gruptan ayrıl"));
    await waitFor(() => expect(mockLeaveLobby).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before deleting", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Grubu sil"));
    expect(mockDeleteLobby).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Evet, sil"));
    await waitFor(() => expect(mockDeleteLobby).toHaveBeenCalledWith("lobby1"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lobbies/LobbyManagementPanel.test.tsx`
Expected: FAIL — `Cannot find module './LobbyManagementPanel'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/lobbies/LobbyManagementPanel.tsx
import { useState } from "react";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { LobbyMember, LobbyWithId, LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";
import { renameLobby } from "./renameLobby";
import { generateLobbyInvite } from "./generateLobbyInvite";
import { leaveLobby } from "./leaveLobby";
import { removeMember } from "./removeMember";
import { deleteLobby } from "./deleteLobby";

interface LobbyManagementPanelProps {
  lobby: LobbyWithId;
  members: LobbyMember[];
  players: Player[];
  myUid: string;
  myFirstName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
  onDeleted: () => void;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function LobbyManagementPanel({
  lobby,
  members,
  players,
  myUid,
  myFirstName,
  open,
  onOpenChange,
  onLeft,
  onDeleted,
}: LobbyManagementPanelProps) {
  const [name, setName] = useState(lobby.name);
  const [savingName, setSavingName] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playersByUid = buildPlayersByUid(players);
  const isCreator = lobby.createdByUid === myUid;

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === lobby.name) return;
    setSavingName(true);
    setError(null);
    try {
      await renameLobby(lobby.id, myUid, myFirstName, trimmed);
    } catch (err) {
      console.error("Failed to rename lobby", err);
      setError("Grup adı güncellenemedi, tekrar deneyin.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true);
    setError(null);
    try {
      const inviteId = await generateLobbyInvite(lobby.id, myUid);
      setInviteUrl(`${window.location.origin}${window.location.pathname}#/join/${inviteId}`);
    } catch (err) {
      console.error("Failed to generate lobby invite", err);
      setError("Davet linki oluşturulamadı, tekrar deneyin.");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    setError(null);
    try {
      const remaining = members.filter((m) => m.uid !== myUid);
      await leaveLobby(lobby, myUid, myFirstName, remaining);
      onOpenChange(false);
      onLeft();
    } catch (err) {
      console.error("Failed to leave lobby", err);
      setError("Gruptan ayrılınamadı, tekrar deneyin.");
      setLeaving(false);
    }
  }

  async function handleRemove(member: LobbyMember) {
    setError(null);
    try {
      const removedPlayer = playersByUid.get(member.uid);
      await removeMember(lobby.id, myUid, member.uid, removedPlayer?.firstName ?? "Katılımcı");
    } catch (err) {
      console.error("Failed to remove member", err);
      setError("Katılımcı çıkarılamadı, tekrar deneyin.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteLobby(lobby.id);
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      console.error("Failed to delete lobby", err);
      setError("Grup silinemedi, tekrar deneyin.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grup Ayarları</DialogTitle>
            <DialogDescription>Kuran: {playersByUid.get(lobby.createdByUid)?.firstName ?? "Bilinmiyor"}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              maxLength={LOBBY_NAME_MAX_LENGTH}
              disabled={savingName}
              className="min-w-0 flex-1 rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-sm text-color_text outline-none focus:border-color_accent"
            />

            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="outline" disabled={generatingInvite} onClick={() => void handleGenerateInvite()}>
                {generatingInvite ? "Oluşturuluyor…" : "Davet linki oluştur"}
              </Button>
              {inviteUrl && (
                <input
                  readOnly
                  value={inviteUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-xs text-color_textsecondary outline-none"
                />
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {members.map((member) => {
                const player = playersByUid.get(member.uid);
                return (
                  <li key={member.uid} className="flex items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={player?.photoURL} alt="" />
                      <AvatarFallback className="font-mono text-[0.6rem] text-color_textsecondary">
                        {player ? initials(player.firstName, player.lastName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm text-color_text">
                      {player ? `${player.firstName} ${player.lastName}` : "Bilinmeyen katılımcı"}
                    </span>
                    {member.uid === lobby.createdByUid && (
                      <Crown className="size-3.5 shrink-0 text-color_gold" aria-label="Kurucu" />
                    )}
                    {isCreator && member.uid !== myUid && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemove(member)}>
                        Çıkar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && (
              <p role="alert" className="text-sm text-color_remove">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={leaving} onClick={() => void handleLeave()}>
              {leaving ? "Ayrılıyor…" : "Gruptan ayrıl"}
            </Button>
            {isCreator && (
              <Button type="button" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                Grubu sil
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={(next) => !deleting && setDeleteConfirmOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grubu silmek istediğine emin misin?</DialogTitle>
            <DialogDescription>
              Bu işlem grubu ve sohbet geçmişini herkes için kalıcı olarak siler. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? "Siliniyor…" : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lobbies/LobbyManagementPanel.test.tsx`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lobbies/LobbyManagementPanel.tsx src/lobbies/LobbyManagementPanel.test.tsx
git commit -m "Add LobbyManagementPanel component"
```

---

## Phase 6 — Home integration

### Task 20: Wire the switcher, panel, and lobby-scoped data into Home's two cells

**Files:**
- Modify: `src/home/LoggedInHome.tsx` (fetch `useMyLobbies`, hold both cells' independent switcher state, fetch lobby-scoped data, handle fallback-to-Genel, handle create-lobby)
- Modify: `src/home/HomeLandingLoggedIn.tsx` (render `LobbySwitcher` + a settings/create affordance in each of the Sohbet and Katılımcılar cell headers; feed either global or lobby-scoped data into `ChatRoom`/`ParticipantStatusList`)
- Modify: `src/home/HomeLandingLoggedIn.test.tsx` and `src/home/LoggedInHome.test.tsx` (extend existing suites)

**Interfaces:**
- Consumes everything from Tasks 1–19: `useMyLobbies`, `useLobbyMembers`, `useLobbyMessages`, `createLobby`, `LobbySwitcher`, `LobbyManagementPanel`, `buildPlayersByUid`.
- This is the integration point — it produces no new exports, only new props threaded between the two existing components.

Each cell gets its **own** `useState<string | null>` for "which view is this cell showing" — no shared state between them, per the design doc's confirmed-even-after-double-embedding independence rule. Both default to the user's most-recently-joined lobby (by `myJoinedAt`) the first time `useMyLobbies()` finishes loading with at least one result, then never auto-change again on their own — except the fallback-to-Genel case, which fires specifically when the *currently selected* id drops out of the live `lobbies` list (deleted, or the viewer was removed).

- [ ] **Step 1: Extend `LoggedInHome.tsx`'s existing test suite**

Open `src/home/LoggedInHome.test.tsx`, find its existing mocks for the other hooks (`useProfile`, `usePredictionSubmitters`, `useMessages`, etc. are already mocked there), and add mocks for `useMyLobbies`, `useLobbyMembers`, `useLobbyMessages`, then add:

```tsx
it("passes the user's lobbies through to HomeLandingLoggedIn", () => {
  // Set the useMyLobbies mock to return one lobby, render, and assert
  // HomeLandingLoggedIn (or a data-testid on the switcher it renders) shows
  // that lobby's name somewhere on screen.
});

it("defaults each cell's switcher to the most-recently-joined lobby", () => {
  // Set useMyLobbies to return two lobbies with different myJoinedAt values;
  // assert the one with the larger myJoinedAt is the initially-selected one
  // in both the Sohbet and Katılımcılar cells.
});
```

- [ ] **Step 2: Run to verify these new tests fail**

Run: `npx vitest run src/home/LoggedInHome.test.tsx`
Expected: FAIL — the new props/behavior don't exist yet.

- [ ] **Step 3: Add lobby state and data-fetching to `LoggedInHome.tsx`**

Add these imports:

```ts
import { useMyLobbies, MyLobby } from "../lobbies/useMyLobbies";
import { useLobbyMembers } from "../lobbies/useLobbyMembers";
import { useLobbyMessages } from "../lobbies/useLobbyMessages";
import { createLobby } from "../lobbies/createLobby";
import { LOBBY_MAX_OWNED, LOBBY_MAX_JOINED } from "../lobbies/lobbyTypes";
```

Inside `LoggedInHome`, after the existing hooks:

```ts
  const { lobbies: myLobbies } = useMyLobbies(user?.uid ?? null);

  const [sohbetLobbyId, setSohbetLobbyId] = useState<string | null>(null);
  const [katilimcilarLobbyId, setKatilimcilarLobbyId] = useState<string | null>(null);
  const hasSetDefaultRef = useRef(false);

  useEffect(() => {
    if (hasSetDefaultRef.current || myLobbies.length === 0) return;
    hasSetDefaultRef.current = true;
    const mostRecent = [...myLobbies].sort((a, b) => b.myJoinedAt - a.myJoinedAt)[0];
    setSohbetLobbyId(mostRecent.id);
    setKatilimcilarLobbyId(mostRecent.id);
  }, [myLobbies]);

  // Fallback to Genel if the currently-selected lobby disappears (deleted,
  // or this viewer was removed from it) — useMyLobbies() reflects either
  // case live, so this just has to notice the id it was pointing at is gone.
  useEffect(() => {
    if (sohbetLobbyId && !myLobbies.some((l) => l.id === sohbetLobbyId)) setSohbetLobbyId(null);
  }, [myLobbies, sohbetLobbyId]);
  useEffect(() => {
    if (katilimcilarLobbyId && !myLobbies.some((l) => l.id === katilimcilarLobbyId)) setKatilimcilarLobbyId(null);
  }, [myLobbies, katilimcilarLobbyId]);

  const sohbetLobbyMessages = useLobbyMessages(sohbetLobbyId);
  const sohbetLobbyMembers = useLobbyMembers(sohbetLobbyId);
  const katilimcilarLobbyMembers = useLobbyMembers(katilimcilarLobbyId);

  const [managingLobbyId, setManagingLobbyId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canCreateLobby =
    myLobbies.filter((l) => l.createdByUid === (user?.uid ?? "")).length < LOBBY_MAX_OWNED &&
    myLobbies.length < LOBBY_MAX_JOINED;

  async function handleCreateLobby(newLobbyName: string) {
    if (!user || !profile) return;
    setCreateError(null);
    try {
      const newId = await createLobby(user.uid, newLobbyName, profile.firstName);
      setCreateDialogOpen(false);
      setSohbetLobbyId(newId);
      setKatilimcilarLobbyId(newId);
    } catch (err) {
      console.error("Failed to create lobby", err);
      setCreateError("Grup oluşturulamadı, tekrar deneyin.");
    }
  }
```

Add `useState`, `useEffect`, `useRef` to the existing `import { ... } from "react"` line at the top if not already present.

Pass the new props through to `HomeLandingLoggedIn`:

```tsx
    <HomeLandingLoggedIn
      me={{ uid: user.uid, ...profile }}
      players={players}
      submitterUids={submitterUids}
      messages={messages}
      onLoadOlderMessages={loadOlder}
      loadingOlderMessages={loadingOlder}
      hasMoreOlderMessages={hasMoreOlder}
      onlineCount={onlineCount}
      typingUids={typingUids}
      posts={posts}
      likesByPost={likesByPost}
      onToggleLike={handleToggleLike}
      likeError={likeError}
      onDeletePost={handleDeletePost}
      onSaveEdit={handleSaveEdit}
      onRefetchPosts={refetchPosts}
      forumActionError={forumActionError}
      myLobbies={myLobbies}
      sohbetLobbyId={sohbetLobbyId}
      onChangeSohbetLobby={setSohbetLobbyId}
      sohbetLobbyMessages={sohbetLobbyMessages}
      sohbetLobbyMembers={sohbetLobbyMembers.members}
      katilimcilarLobbyId={katilimcilarLobbyId}
      onChangeKatilimcilarLobby={setKatilimcilarLobbyId}
      katilimcilarLobbyMembers={katilimcilarLobbyMembers.members}
      managingLobbyId={managingLobbyId}
      onOpenLobbyManagement={setManagingLobbyId}
      onCloseLobbyManagement={() => setManagingLobbyId(null)}
      onLeftManagedLobby={() => {
        setManagingLobbyId(null);
        if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
        if (katilimcilarLobbyId === managingLobbyId) setKatilimcilarLobbyId(null);
      }}
      onDeletedManagedLobby={() => {
        setManagingLobbyId(null);
        if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
        if (katilimcilarLobbyId === managingLobbyId) setKatilimcilarLobbyId(null);
      }}
      canCreateLobby={canCreateLobby}
      createDialogOpen={createDialogOpen}
      onOpenCreateDialog={() => setCreateDialogOpen(true)}
      onCloseCreateDialog={() => setCreateDialogOpen(false)}
      onCreateLobby={handleCreateLobby}
      createError={createError}
    />
```

- [ ] **Step 4: Extend `HomeLandingLoggedIn.tsx`'s props and both cell headers**

Add the new props to `HomeLandingLoggedInProps`:

```ts
  myLobbies: MyLobby[];
  sohbetLobbyId: string | null;
  onChangeSohbetLobby: (id: string | null) => void;
  sohbetLobbyMessages: ReturnType<typeof useLobbyMessages>;
  sohbetLobbyMembers: LobbyMember[];
  katilimcilarLobbyId: string | null;
  onChangeKatilimcilarLobby: (id: string | null) => void;
  katilimcilarLobbyMembers: LobbyMember[];
  managingLobbyId: string | null;
  onOpenLobbyManagement: (id: string) => void;
  onCloseLobbyManagement: () => void;
  onLeftManagedLobby: () => void;
  onDeletedManagedLobby: () => void;
  canCreateLobby: boolean;
  createDialogOpen: boolean;
  onOpenCreateDialog: () => void;
  onCloseCreateDialog: () => void;
  onCreateLobby: (name: string) => void;
  createError: string | null;
```

Add the matching imports (`MyLobby`, `LobbyMember` types; `LobbySwitcher`; `LobbyManagementPanel`; `useLobbyMessages`'s return type; `buildPlayersByUid`; `LOBBY_NAME_MAX_LENGTH`; a `Settings`/`Plus` icon from `lucide-react`; `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`/`Button` for the create dialog).

In the **Katılımcılar** cell's `FrameHeader`, add the switcher and a settings/create button next to the existing title, and compute which `players`/`submitterUids` to pass to `ParticipantStatusList`:

```tsx
const katilimcilarPlayersByUid = buildPlayersByUid(players);
const katilimcilarDisplayPlayers = katilimcilarLobbyId
  ? katilimcilarLobbyMembers
      .map((m) => katilimcilarPlayersByUid.get(m.uid))
      .filter((p): p is Player => p !== undefined)
  : players;
const katilimcilarDisplaySubmitterUids = katilimcilarLobbyId
  ? new Set([...submitterUids].filter((uid) => katilimcilarLobbyMembers.some((m) => m.uid === uid)))
  : submitterUids;
```

```tsx
<FrameHeader tone="navy">
  <FrameTitle className="text-base text-color_text sm:text-lg">Katılımcılar</FrameTitle>
  <div className="flex items-center gap-2">
    <LobbySwitcher options={myLobbies} current={katilimcilarLobbyId} onChange={onChangeKatilimcilarLobby} />
    {katilimcilarLobbyId ? (
      <button type="button" onClick={() => onOpenLobbyManagement(katilimcilarLobbyId)} aria-label="Grup ayarları" className="cursor-pointer text-color_textsecondary hover:text-color_accent">
        <Settings className="size-3.5" aria-hidden />
      </button>
    ) : canCreateLobby ? (
      <button type="button" onClick={onOpenCreateDialog} aria-label="Yeni grup" className="cursor-pointer text-color_textsecondary hover:text-color_accent">
        <Plus className="size-3.5" aria-hidden />
      </button>
    ) : null}
  </div>
</FrameHeader>
<FrameBody>
  <ParticipantStatusList
    players={katilimcilarDisplayPlayers}
    submitterUids={katilimcilarDisplaySubmitterUids}
    onSelectPlayer={setSelectedPlayerUid}
  />
</FrameBody>
```

Do the equivalent in the **Sohbet** cell's header (same `LobbySwitcher`/settings/create trio, wired to `sohbetLobbyId`/`onChangeSohbetLobby`). Compute one shared `playersByUid` lookup once per render (both cells use it — rename the earlier `katilimcilarPlayersByUid` to just `playersByUid`), and derive the Sohbet cell's own filtered roster the same way the Katılımcılar cell already does:

```ts
const playersByUid = buildPlayersByUid(players);
const sohbetDisplayPlayers = sohbetLobbyId
  ? sohbetLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
  : players;
const katilimcilarDisplayPlayers = katilimcilarLobbyId
  ? katilimcilarLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
  : players;
const katilimcilarDisplaySubmitterUids = katilimcilarLobbyId
  ? new Set([...submitterUids].filter((uid) => katilimcilarLobbyMembers.some((m) => m.uid === uid)))
  : submitterUids;
```

(This replaces the separate `katilimcilarPlayersByUid`/`katilimcilarDisplayPlayers` block shown earlier in this step — one shared computation instead of two.)

`ChatRoom` itself doesn't call `sendLobbyMessage` directly — only its internal `ChatComposer` does — so add `lobbyId?: string | null` to `ChatRoomProps` (alongside the `system` field widening from Task 14), default it to `null`, and pass it straight through to the existing `<ChatComposer uid={uid} players={players} quoted={quoted} onClearQuote={...} />` call inside `ChatRoom.tsx` as `lobbyId={lobbyId}`.

```tsx
<FrameBody>
  <ChatRoom
    uid={me.uid}
    players={sohbetDisplayPlayers}
    messages={sohbetLobbyId ? sohbetLobbyMessages.messages : messages}
    onLoadOlder={sohbetLobbyId ? sohbetLobbyMessages.loadOlder : onLoadOlderMessages}
    loadingOlder={sohbetLobbyId ? sohbetLobbyMessages.loadingOlder : loadingOlderMessages}
    hasMoreOlder={sohbetLobbyId ? sohbetLobbyMessages.hasMoreOlder : hasMoreOlderMessages}
    typingUids={sohbetLobbyId ? [] : typingUids}
    onSelectParticipant={setSelectedPlayerUid}
    lobbyId={sohbetLobbyId}
  />
</FrameBody>
```

Presence/online-count stays exactly as it already is on both cells — `onlineCount` is a single global number from `useOnlineCount()`, computed in `LoggedInHome.tsx` from the site-wide `presence` collection. Filtering it to "online lobby members only" would need the actual set of currently-online uids, not just a count, which `useOnlineCount()` doesn't expose today. Scoping presence display within a lobby is real, separable follow-up work, not required by anything in the 9 questionnaire rounds beyond the general "reuse the existing indicator, just filtered" intent already satisfied by member-list presence dots in `LobbyManagementPanel` (Task 19) — this cell's header count is a different, smaller display and is left showing the site-wide figure for this pass.

Render the management panel and create dialog once, near the bottom of `HomeLandingLoggedIn`'s JSX (siblings of the existing `ParticipantPopup`):

```tsx
{managingLobbyId && (
  <LobbyManagementPanel
    lobby={myLobbies.find((l) => l.id === managingLobbyId)!}
    members={katilimcilarLobbyId === managingLobbyId ? katilimcilarLobbyMembers : sohbetLobbyMembers}
    players={players}
    myUid={me.uid}
    myFirstName={me.firstName}
    open={true}
    onOpenChange={(open) => !open && onCloseLobbyManagement()}
    onLeft={onLeftManagedLobby}
    onDeleted={onDeletedManagedLobby}
  />
)}

<Dialog open={createDialogOpen} onOpenChange={(open) => !open && onCloseCreateDialog()}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Yeni Grup</DialogTitle>
    </DialogHeader>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = (e.target as HTMLFormElement).elements.namedItem("lobbyName") as HTMLInputElement;
        onCreateLobby(input.value);
      }}
    >
      <input
        name="lobbyName"
        maxLength={LOBBY_NAME_MAX_LENGTH}
        placeholder="Grup adı"
        className="w-full rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-sm text-color_text outline-none focus:border-color_accent"
      />
      {createError && (
        <p role="alert" className="mt-2 text-sm text-color_remove">
          {createError}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Oluştur</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/home/LoggedInHome.test.tsx src/home/HomeLandingLoggedIn.test.tsx src/chat/ChatRoom.test.tsx`
Expected: PASS — the two new `LoggedInHome.test.tsx` cases from Step 1, every pre-existing test in both files, and `ChatRoom.test.tsx` (now taking an optional `lobbyId` passthrough) unchanged.

- [ ] **Step 6: Run the entire suite and the type checker once, as the final check for this feature**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: PASS — every test in the repo, not just this feature's new files. This is the one point in the whole plan worth running the full suite rather than a targeted file, since Task 20 is the integration point touching existing, already-tested components (`ChatRoom`, `HomeLandingLoggedIn`, `LoggedInHome`).

- [ ] **Step 7: Commit**

```bash
git add src/home/LoggedInHome.tsx src/home/HomeLandingLoggedIn.tsx src/home/LoggedInHome.test.tsx src/home/HomeLandingLoggedIn.test.tsx src/chat/ChatRoom.tsx
git commit -m "Wire Special Lobby switcher, panel, and scoped data into Home's cells"
```

---

## Manual verification (needs Mert, not just Claude)

- Deploy the rules from Task 13 if not already done: `firebase deploy --only firestore:rules`.
- One real end-to-end pass against the live dev server: create a lobby, generate an invite link, open it in a second signed-in session, confirm the join lands you in that lobby's chat with the "katıldı" system message visible, confirm the Katılımcılar cell shows only lobby members, leave/remove/rename/delete each once. This is the one place a live check earns its cost — everything else in this plan is already covered by the unit/component tests above.

