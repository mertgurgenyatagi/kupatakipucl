import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { Message, MESSAGE_MAX_LENGTH } from "./messageTypes";

export async function sendMessage(uid: string, text: string, mentionedUids: string[] = []): Promise<void> {
  const trimmed = text.trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!trimmed) return;
  const message: Message = { uid, text: trimmed, createdAt: Date.now() };
  if (mentionedUids.length > 0) {
    message.mentionedUids = mentionedUids;
  }
  await addDoc(collection(db, "messages"), message);
}
