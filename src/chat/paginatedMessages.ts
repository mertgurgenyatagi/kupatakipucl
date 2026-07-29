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
