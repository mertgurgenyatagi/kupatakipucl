import { Plus } from "lucide-react";
import { Frame, FrameBody } from "@/components/ui/frame";
import { MobileWelcomeBanner } from "./MobileWelcomeBanner";
import { ParticipantStatusList } from "../ParticipantStatusList";
import { RecentPostsPreview } from "../../forum/RecentPostsPreview";
import { LobbySwitcher, getLobbySwitcherLabel } from "../../lobbies/LobbySwitcher";
import type { MyLobby } from "../../lobbies/useMyLobbies";
import type { Player } from "../../profile/usePlayers";
import type { PostWithId } from "../../forum/postTypes";

/**
 * Home — logged in, not started. Three frames down the page:
 * welcome, who's in, what people are saying.
 *
 * Dropped from the desktop version's four-cell bento: **Sohbet**, which is
 * now the shell's right-hand drawer and reachable from every screen rather
 * than only this one, and the hero carousel, which appears in no mobile
 * wireframe cell at all.
 *
 * The participant list keeps a header here — the wireframe's own note says
 * *"with a header this time, because special lobbies etc exist"* — because
 * this is where you switch scope and make a lobby. On the started-phase home
 * (where there's no submission status to track) the list is replaced by the
 * standings instead.
 */
export function MobileHomeNotStartedLoggedIn({
  me,
  players,
  submitterUids,
  posts,
  likesByPost,
  onToggleLike,
  onDeletePost,
  onSaveEdit,
  onRefetchPosts,
  onSelectParticipant,
  myLobbies,
  lobbyId,
  onChangeLobby,
  lobbyMemberUids,
  canCreateLobby,
  onOpenCreateDialog,
}: {
  me: Player;
  players: Player[];
  submitterUids: Set<string>;
  posts: PostWithId[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  onSelectParticipant: (uid: string) => void;
  myLobbies: MyLobby[];
  lobbyId: string | null;
  onChangeLobby: (id: string | null) => void;
  lobbyMemberUids: Set<string> | null;
  canCreateLobby: boolean;
  onOpenCreateDialog: () => void;
}) {
  // Lobby scope filters the list, exactly as it does on desktop — a lobby of
  // five reads as five people, not fifty-two with five highlighted.
  const scopedPlayers = lobbyMemberUids
    ? players.filter((p) => lobbyMemberUids.has(p.uid))
    : players;

  return (
    <div className="mobile-screenful flex min-h-0 flex-col gap-3 px-3 py-3">
      <MobileWelcomeBanner me={me} showCta={!submitterUids.has(me.uid)} />

      <Frame className="flex min-h-0 flex-1 flex-col animate-cotton-rise">
        <div className="flex shrink-0 items-center gap-2 border-b border-color_border1/50 px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate font-mono text-[0.62rem] tracking-[0.16em] text-color_textsecondary uppercase">
            {getLobbySwitcherLabel(myLobbies, lobbyId, "Katılımcılar")}
          </span>
          {canCreateLobby && (
            <button
              type="button"
              onClick={onOpenCreateDialog}
              aria-label="Özel lobi oluştur"
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-color_border1 text-color_textsecondary transition-colors duration-150 active:bg-color_hoverfill"
            >
              <Plus className="size-3.5" />
            </button>
          )}
          <LobbySwitcher options={myLobbies} current={lobbyId} onChange={onChangeLobby} />
        </div>
        <FrameBody className="min-h-0 flex-1">
          <ParticipantStatusList
            players={scopedPlayers}
            submitterUids={submitterUids}
            onSelectPlayer={onSelectParticipant}
          />
        </FrameBody>
      </Frame>

      <Frame className="flex min-h-0 flex-1 flex-col animate-cotton-rise">
        <FrameBody className="min-h-0 flex-1">
          <RecentPostsPreview
            posts={posts}
            players={players}
            uid={me.uid}
            likesByPost={likesByPost}
            onToggleLike={onToggleLike}
            onSelectParticipant={onSelectParticipant}
            onDeletePost={onDeletePost}
            onSaveEdit={onSaveEdit}
            onRefetch={onRefetchPosts}
          />
        </FrameBody>
      </Frame>
    </div>
  );
}
