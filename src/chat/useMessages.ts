// src/chat/useMessages.ts
import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter } from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "./messageTypes";

export interface MessageWithId extends Message {
  id: string;
}

// chat-widget-round-01 Q2: "cap it" — the live listener only ever watches
// the most recent PAGE_SIZE messages, not the entire collection. Older
// history is reachable on demand via loadOlder(), a one-time (non-live) fetch.
const PAGE_SIZE = 50;

function toMessage(docSnap: { id: string; data: () => unknown }): MessageWithId {
  return { id: docSnap.id, ...(docSnap.data() as Message) };
}

export function useMessages() {
  const [liveMessages, setLiveMessages] = useState<MessageWithId[]>([]);
  const [olderMessages, setOlderMessages] = useState<MessageWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  useEffect(() => {
    const messagesQuery = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const docs = snapshot.docs.map(toMessage).reverse();
        setLiveMessages(docs);
        setLoading(false);
        if (docs.length < PAGE_SIZE) setHasMoreOlder(false);
      },
      (err: Error) => {
        console.error("Failed to load messages", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const loadOlder = useCallback(async () => {
    const oldest = olderMessages[0] ?? liveMessages[0];
    if (!oldest || loadingOlder || !hasMoreOlder) return;

    setLoadingOlder(true);
    try {
      const olderQuery = query(
        collection(db, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(oldest.createdAt),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(olderQuery);
      const docs = snapshot.docs.map(toMessage).reverse();
      if (docs.length < PAGE_SIZE) setHasMoreOlder(false);
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
