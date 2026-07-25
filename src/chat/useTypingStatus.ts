import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface TypingDoc {
  updatedAt: number;
}

// Anything older than this is treated as stale by the reader — chosen well
// above the composer's own re-send interval (chatMentions/ChatComposer send
// at most once every 2s while actively typing) so a live typist never
// flickers, but short enough that walking away mid-sentence self-clears
// without needing an explicit "stopped" write.
const STALE_MS = 6000;
const RECHECK_MS = 1500;

/** Doc id is the uid, so there's at most one typing signal per person. */
export async function setTypingStatus(uid: string, isTyping: boolean): Promise<void> {
  const ref = doc(db, "typingStatus", uid);
  if (isTyping) {
    const status: TypingDoc = { updatedAt: Date.now() };
    await setDoc(ref, status);
  } else {
    await deleteDoc(ref);
  }
}

/** Uids currently typing, excluding `excludeUid` and anything stale. */
export function useTypingUsers(excludeUid: string): string[] {
  const [docs, setDocs] = useState<{ id: string; updatedAt: number }[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "typingStatus"),
      (snapshot) => {
        setDocs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as TypingDoc) })));
      },
      (err: Error) => {
        console.error("Failed to load typing status", err);
      }
    );
    return unsubscribe;
  }, []);

  // Re-render periodically so a typist who never explicitly clears (closed
  // the tab, walked away) still ages out of the list on its own.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), RECHECK_MS);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  return docs.filter((d) => d.id !== excludeUid && now - d.updatedAt < STALE_MS).map((d) => d.id);
}
