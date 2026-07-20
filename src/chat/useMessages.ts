// src/chat/useMessages.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "./messageTypes";

export interface MessageWithId extends Message {
  id: string;
}

export function useMessages() {
  const [messages, setMessages] = useState<MessageWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const messagesQuery = query(collection(db, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((docSnap: { id: string; data: () => unknown }) => ({
            id: docSnap.id,
            ...(docSnap.data() as Message),
          }))
        );
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load messages", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { messages, loading };
}
