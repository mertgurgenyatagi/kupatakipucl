// src/chat/ChatRoom.tsx
import { FormEvent, useState } from "react";
import { MessageWithId } from "./useMessages";
import { Player } from "../profile/usePlayers";
import { sendMessage } from "./sendMessage";

interface ChatRoomProps {
  uid: string;
  messages: MessageWithId[];
  players: Player[];
}

export function ChatRoom({ uid, messages, players }: ChatRoomProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const playersByUid = new Map(players.map((p) => [p.uid, p]));

  function senderName(senderUid: string): string {
    const player = playersByUid.get(senderUid);
    return player ? `${player.firstName} ${player.lastName}` : senderUid;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      await sendMessage(uid, text);
      setText("");
      setError(null);
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Mesaj gönderilemedi, tekrar deneyin.");
    }
  }

  return (
    <div>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <strong>{senderName(message.uid)}:</strong> {message.text}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Gönder</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
