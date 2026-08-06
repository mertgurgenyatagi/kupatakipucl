import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChatRoom } from "../chat/ChatRoom";
import { useMessages } from "../chat/useMessages";
import { usePresenceHeartbeat, useOnlineCount } from "../chat/usePresence";
import { useTypingUsers } from "../chat/useTypingStatus";
import { usePlayers } from "../profile/usePlayers";
import { useMyLobbies } from "../lobbies/useMyLobbies";
import { useLobbyMessages } from "../lobbies/useLobbyMessages";
import { useLobbyMembers } from "../lobbies/useLobbyMembers";
import { LobbySwitcher, getLobbySwitcherLabel } from "../lobbies/LobbySwitcher";
import { useMobilePopups } from "./MobilePopupHost";

/**
 * Chat, as a right-edge drawer reachable from every screen.
 *
 * On desktop, chat is a widget inside Home's bento. Mobile has no room for a
 * fifth thing on Home, and the wireframe's shell puts a chat opener in the
 * header instead — so chat stops being page content and becomes an app-level
 * surface. That is the single largest structural difference between the two
 * layouts, and it is the golden rule doing its job: Home gets three widgets
 * instead of four, and chat gets a full screen instead of a corner.
 *
 * Everything here is a straight lift of `LoggedInHome`'s chat slice — the
 * same hooks, the same lobby-scope switching, the same
 * global-chat-only typing indicators. The one thing that isn't: tapping a
 * message author goes through `useMobilePopups()` rather than local state,
 * because a drawer mounted in the shell has no page to hold that state for it.
 */
export function MobileChatDrawer({
  open,
  onOpenChange,
  uid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0" aria-label="Sohbet">
        {/* Mounted only while open: these are live Firestore + RTDB
            listeners (messages, presence, typing), and a drawer nobody has
            opened shouldn't be paying for a chat subscription on every page.
            Unlike the popup host, this one does unmount on close — chat's
            listeners are the most expensive in the app, and reopening
            re-reads from Firestore's local cache anyway. */}
        {open && <ChatDrawerBody uid={uid} />}
      </SheetContent>
    </Sheet>
  );
}

function ChatDrawerBody({ uid }: { uid: string }) {
  const { players } = usePlayers();
  const { messages, loadOlder, loadingOlder, hasMoreOlder } = useMessages();
  const { openParticipant } = useMobilePopups();

  usePresenceHeartbeat(uid);
  const onlineCount = useOnlineCount();
  const typingUids = useTypingUsers(uid);

  const { lobbies } = useMyLobbies(uid);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const hasSetDefaultRef = useRef(false);

  // Open on the most recently joined lobby, matching LoggedInHome's own
  // default so the drawer and Home don't disagree about which scope you were
  // last in.
  useEffect(() => {
    if (hasSetDefaultRef.current || lobbies.length === 0) return;
    hasSetDefaultRef.current = true;
    setLobbyId([...lobbies].sort((a, b) => b.myJoinedAt - a.myJoinedAt)[0].id);
  }, [lobbies]);

  // Fall back to Genel if the selected lobby vanishes under us (deleted, or
  // this viewer was removed) — useMyLobbies reflects either case live.
  useEffect(() => {
    if (lobbyId && !lobbies.some((l) => l.id === lobbyId)) setLobbyId(null);
  }, [lobbies, lobbyId]);

  const lobbyMessages = useLobbyMessages(lobbyId);
  const { members } = useLobbyMembers(lobbyId);

  // @-mention targets are genuinely lobby-scoped, unlike author lookup —
  // which always resolves against the global directory so someone who has
  // since left a lobby doesn't render as a deleted account.
  const mentionCandidates = useMemo(() => {
    if (!lobbyId) return players;
    const memberUids = new Set(members.map((m) => m.uid));
    return players.filter((p) => memberUids.has(p.uid));
  }, [lobbyId, members, players]);

  const title = getLobbySwitcherLabel(lobbies, lobbyId, "Sohbet");

  return (
    <>
      <SheetHeader className="gap-2">
        <SheetTitle className="flex-1">{title}</SheetTitle>
        <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-color_textsecondary tnum">
          <Users className="size-3" aria-hidden />
          {onlineCount}
        </span>
        <LobbySwitcher options={lobbies} current={lobbyId} onChange={setLobbyId} />
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-[env(safe-area-inset-bottom)]">
        <ChatRoom
          uid={uid}
          players={players}
          mentionCandidates={mentionCandidates}
          messages={lobbyId ? lobbyMessages.messages : messages}
          onLoadOlder={lobbyId ? lobbyMessages.loadOlder : loadOlder}
          loadingOlder={lobbyId ? lobbyMessages.loadingOlder : loadingOlder}
          hasMoreOlder={lobbyId ? lobbyMessages.hasMoreOlder : hasMoreOlder}
          // Typing indicators are a global-chat-only feature, deliberately
          // disabled for lobbies (PROJECT_STATE §6.6).
          typingUids={lobbyId ? [] : typingUids}
          onSelectParticipant={openParticipant}
          lobbyId={lobbyId}
        />
      </div>
    </>
  );
}
