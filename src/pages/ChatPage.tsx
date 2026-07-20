// src/pages/ChatPage.tsx
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useMessages } from "../chat/useMessages";
import { usePlayers } from "../profile/usePlayers";
import { ChatRoom } from "../chat/ChatRoom";

export function ChatPage() {
  const { user } = useAuth();
  const state = useVisibilityState();
  const { messages, loading: messagesLoading } = useMessages();
  const { players, loading: playersLoading } = usePlayers();

  if (!isPageAllowed("chat", state)) {
    return <p>This section isn't available right now.</p>;
  }

  if (messagesLoading || playersLoading) return null;

  return <ChatRoom uid={user!.uid} messages={messages} players={players} />;
}
