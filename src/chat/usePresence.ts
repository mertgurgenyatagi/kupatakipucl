import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface PresenceDoc {
  lastSeen: number;
}

// This project runs on Firestore, not Realtime Database, so there's no
// server-side onDisconnect hook available — "online" here is approximated
// client-side by a periodic heartbeat plus a recency check on read, the
// same convention useTypingStatus.ts uses (chat-widget-round-01 Q7).
const HEARTBEAT_MS = 20_000;
const STALE_MS = 45_000;
const RECHECK_MS = 10_000;

async function heartbeat(uid: string): Promise<void> {
  await setDoc(doc(db, "presence", uid), { lastSeen: Date.now() } satisfies PresenceDoc);
}

/** Writes a periodic heartbeat for `uid` while mounted; call once, near the
 *  top of the signed-in Home tree, so "online" tracks "has Home open." */
export function usePresenceHeartbeat(uid: string | null): void {
  useEffect(() => {
    if (!uid) return;

    heartbeat(uid).catch((err) => console.error("Failed to send presence heartbeat", err));
    const id = setInterval(() => {
      heartbeat(uid).catch((err) => console.error("Failed to send presence heartbeat", err));
    }, HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        heartbeat(uid).catch((err) => console.error("Failed to send presence heartbeat", err));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [uid]);
}

/** Count of participants with a fresh heartbeat right now. */
export function useOnlineCount(): number {
  const [docs, setDocs] = useState<PresenceDoc[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "presence"),
      (snapshot) => {
        setDocs(snapshot.docs.map((docSnap) => docSnap.data() as PresenceDoc));
      },
      (err: Error) => {
        console.error("Failed to load presence", err);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), RECHECK_MS);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  return docs.filter((d) => now - d.lastSeen < STALE_MS).length;
}
