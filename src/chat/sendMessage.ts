import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { Message } from "./messageTypes";

export async function sendMessage(uid: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const message: Message = { uid, text: trimmed, createdAt: Date.now() };
  await addDoc(collection(db, "messages"), message);
}
