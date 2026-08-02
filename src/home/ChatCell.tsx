import { CSSProperties } from "react";
import { Settings } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { ChatRoom } from "../chat/ChatRoom";
import { LobbySwitcher, getLobbySwitcherLabel } from "../lobbies/LobbySwitcher";
import { buildPlayersByUid } from "../profile/playersByUid";
import type { MyLobby } from "../lobbies/useMyLobbies";
import type { useLobbyMessages } from "../lobbies/useLobbyMessages";
import type { LobbyMember } from "../lobbies/lobbyTypes";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";

interface ChatCellProps {
  className?: string;
  style?: CSSProperties;
  myUid: string;
  players: Player[];
  myLobbies: MyLobby[];
  sohbetLobbyId: string | null;
  onChangeSohbetLobby: (id: string | null) => void;
  onOpenLobbyManagement: (id: string) => void;
  sohbetLobbyMembers: LobbyMember[];
  sohbetLobbyMessages: ReturnType<typeof useLobbyMessages>;
  messages: MessageWithId[];
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  onlineCount: number;
  typingUids: string[];
  onSelectParticipant: (uid: string) => void;
}

/**
 * GREAT_LEAP_SPEC.md §2.2: identical chat cell for both the not-started and
 * started logged-in homes. Extracted from HomeLandingLoggedIn.tsx's fourth
 * cell so both callers share one implementation. No lobby-creation UI here —
 * that lived in HomeLandingLoggedIn.tsx's separate Katılımcılar cell, which
 * this chat cell was never part of.
 */
export function ChatCell({
  className,
  style,
  myUid,
  players,
  myLobbies,
  sohbetLobbyId,
  onChangeSohbetLobby,
  onOpenLobbyManagement,
  sohbetLobbyMembers,
  sohbetLobbyMessages,
  messages,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreOlderMessages,
  onlineCount,
  typingUids,
  onSelectParticipant,
}: ChatCellProps) {
  const playersByUid = buildPlayersByUid(players);
  const sohbetDisplayPlayers = sohbetLobbyId
    ? sohbetLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
    : players;

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">
          {getLobbySwitcherLabel(myLobbies, sohbetLobbyId)}
        </FrameTitle>
        <div className="flex items-center gap-2">
          {sohbetLobbyId && (
            <button
              type="button"
              onClick={() => onOpenLobbyManagement(sohbetLobbyId)}
              aria-label="Özel lobi ayarları"
              className="cursor-pointer text-color_textsecondary hover:text-color_accent"
            >
              <Settings className="size-3.5" aria-hidden />
            </button>
          )}
          <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.1em] text-color_text/70 uppercase tnum">
            <span className="size-1.5 rounded-full bg-color_accent" aria-hidden />
            {onlineCount} çevrimiçi
          </span>
          <LobbySwitcher options={myLobbies} current={sohbetLobbyId} onChange={onChangeSohbetLobby} />
        </div>
      </FrameHeader>
      <FrameBody>
        <ChatRoom
          uid={myUid}
          players={players}
          mentionCandidates={sohbetDisplayPlayers}
          messages={sohbetLobbyId ? sohbetLobbyMessages.messages : messages}
          onLoadOlder={sohbetLobbyId ? sohbetLobbyMessages.loadOlder : onLoadOlderMessages}
          loadingOlder={sohbetLobbyId ? sohbetLobbyMessages.loadingOlder : loadingOlderMessages}
          hasMoreOlder={sohbetLobbyId ? sohbetLobbyMessages.hasMoreOlder : hasMoreOlderMessages}
          typingUids={sohbetLobbyId ? [] : typingUids}
          onSelectParticipant={onSelectParticipant}
          lobbyId={sohbetLobbyId}
        />
      </FrameBody>
    </Frame>
  );
}
