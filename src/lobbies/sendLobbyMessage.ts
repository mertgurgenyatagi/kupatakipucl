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
