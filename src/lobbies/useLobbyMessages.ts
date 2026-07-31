// src/lobbies/useLobbyMessages.ts
import { useCallback, useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "../firebase";
import { LobbyMessage } from "./lobbyTypes";
import { PAGE_SIZE, subscribeToRecentMessages, fetchOlderMessages } from "../chat/paginatedMessages";

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
    setLiveMessages([]);
    setLoading(true);
    return subscribeToRecentMessages<LobbyMessage>(
      collection(db, "lobbies", lobbyId, "messages"),
      (docs) => {
        setLiveMessages(docs);
        setLoading(false);
        if (docs.length < PAGE_SIZE) setHasMoreOlder(false);
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
      if (docs.length < PAGE_SIZE) setHasMoreOlder(false);
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
