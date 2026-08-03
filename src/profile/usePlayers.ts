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

    let confirmed = false;
    const unsubscribe = onSnapshot(
      collection(db, source),
      (snapshot) => {
        // A snapshot can arrive `fromCache` before the server has confirmed
        // it, synthesized from whatever individual documents in this
        // collection already happen to be cached from an unrelated listener
        // (ProfileGate and AppShell both separately watch
        // profiles/{currentUid}) — so it can hold far fewer docs than
        // actually exist. Ignoring it until the first server-confirmed
        // snapshot avoids ever treating that partial result as "the full
        // list has loaded" (2026-08-03: traced from Home showing only the
        // signed-in viewer as a participant, with everyone else popping in
        // moments later).
        if (!confirmed && snapshot.metadata?.fromCache) return;
        confirmed = true;
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
