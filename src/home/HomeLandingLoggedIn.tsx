import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChatRoom } from "../chat/ChatRoom";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { ParticipantStatusList } from "./ParticipantStatusList";
import { HomeHero } from "./HomeHero";
import { HomeWelcomeBanner } from "./HomeWelcomeBanner";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { buildPlayersByUid } from "../profile/playersByUid";
import { LobbySwitcher, getLobbySwitcherLabel } from "../lobbies/LobbySwitcher";
import { LobbyManagementPanel } from "../lobbies/LobbyManagementPanel";
import type { MyLobby } from "../lobbies/useMyLobbies";
import type { useLobbyMessages } from "../lobbies/useLobbyMessages";
import { LobbyMember, LOBBY_NAME_MAX_LENGTH } from "../lobbies/lobbyTypes";
import type { RankedEntry } from "../leaderboard/ranking";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";

interface HomeLandingLoggedInProps {
  me: Player;
  players: Player[];
  submitterUids: Set<string>;
  messages: MessageWithId[];
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  onlineCount: number;
  typingUids: string[];
  posts: PostWithId[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  likeError: string | null;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  forumActionError: string | null;
  myLobbies: MyLobby[];
  sohbetLobbyId: string | null;
  onChangeSohbetLobby: (id: string | null) => void;
  sohbetLobbyMessages: ReturnType<typeof useLobbyMessages>;
  sohbetLobbyMembers: LobbyMember[];
  katilimcilarLobbyId: string | null;
  onChangeKatilimcilarLobby: (id: string | null) => void;
  katilimcilarLobbyMembers: LobbyMember[];
  managingLobbyId: string | null;
  onOpenLobbyManagement: (id: string) => void;
  onCloseLobbyManagement: () => void;
  onLeftManagedLobby: () => void;
  onDeletedManagedLobby: () => void;
  canCreateLobby: boolean;
  createDialogOpen: boolean;
  onOpenCreateDialog: () => void;
  onCloseCreateDialog: () => void;
  onCreateLobby: (name: string) => void;
  createError: string | null;
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Hero is pinned to a fixed 300px — matching LeaderboardHero's own column
// width exactly (leaderboard/LeaderboardPage.tsx's fixed 300px middle
// column) rather than a fr-share of the row. Forum and Sohbet give up the
// width Hero gained; Katılımcılar's 17fr is untouched (Mert's explicit call).
const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 sm:gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[13.409345fr_14.7953275fr_300px_14.7953275fr] [&>*]:min-h-0 [&>*]:min-w-0";
const CELL = "h-[26rem] lg:h-full animate-cotton-rise";

/**
 * Home, logged-in + not-started (PAGEMAP_SPEC §3's "Logged-in Home" +
 * PAGE_BRIEFING.txt's dedicated "HOME - logged in, not started" section).
 * Every other logged-in page/state already speaks the Frame/bento idiom
 * (StatsPage, LeaderboardPage) — this one joins it rather than borrowing
 * HomeLandingLoggedOut's stacked full-bleed bands, which are explicitly that
 * page's own one-off exception (§0b again: composed cells, not one dense
 * sheet).
 *
 * Navy shows up as each cell's header band, not a full-width strip under
 * AppShell's own color_secondary top bar — stacking two full-bleed color_secondary bars is the
 * exact "corporate masthead" silhouette §0b already got rejected once for.
 */
export function HomeLandingLoggedIn({
  me,
  players,
  submitterUids,
  messages,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreOlderMessages,
  onlineCount,
  typingUids,
  posts,
  likesByPost,
  onToggleLike,
  likeError,
  onDeletePost,
  onSaveEdit,
  onRefetchPosts,
  forumActionError,
  myLobbies,
  sohbetLobbyId,
  onChangeSohbetLobby,
  sohbetLobbyMessages,
  sohbetLobbyMembers,
  katilimcilarLobbyId,
  onChangeKatilimcilarLobby,
  katilimcilarLobbyMembers,
  managingLobbyId,
  onOpenLobbyManagement,
  onCloseLobbyManagement,
  onLeftManagedLobby,
  onDeletedManagedLobby,
  canCreateLobby,
  createDialogOpen,
  onOpenCreateDialog,
  onCloseCreateDialog,
  onCreateLobby,
  createError,
}: HomeLandingLoggedInProps) {
  // Participant popup, notstarted-logged-in edition (round-04): Home's
  // Katılımcılar list is the only place this state can ever open it from, so
  // there's no real leaderboard yet to look a rank/points up in — everyone's
  // tied at 0 pre-start anyway, so that's exactly what's shown. The popup's
  // own widgets (predictions, quiz, rank-over-time) don't touch this data;
  // they show their own "not viewable yet" placeholder via `tournamentStarted`.
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string | null>(null);
  const selectedPlayer = players.find((p) => p.uid === selectedPlayerUid) ?? null;
  const selectedRanked: RankedEntry | null = selectedPlayer
    ? {
        entry: {
          uid: selectedPlayer.uid,
          firstName: selectedPlayer.firstName,
          photoURL: selectedPlayer.photoURL,
          points: 0,
          ranking: [],
        },
        rank: 1,
      }
    : null;

  const playersByUid = buildPlayersByUid(players);
  const sohbetDisplayPlayers = sohbetLobbyId
    ? sohbetLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
    : players;
  const katilimcilarDisplayPlayers = katilimcilarLobbyId
    ? katilimcilarLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
    : players;
  const katilimcilarDisplaySubmitterUids = katilimcilarLobbyId
    ? new Set([...submitterUids].filter((uid) => katilimcilarLobbyMembers.some((m) => m.uid === uid)))
    : submitterUids;
  const managedLobby = myLobbies.find((l) => l.id === managingLobbyId);

  return (
    <div className={PAGE_SHELL}>
      <HomeWelcomeBanner me={me} showCta={!submitterUids.has(me.uid)} />

      <div className={CELL_ROW}>
        <Frame className={CELL} style={{ animationDelay: "60ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-base text-color_text sm:text-lg">
              {getLobbySwitcherLabel(myLobbies, katilimcilarLobbyId)}
            </FrameTitle>
            <div className="flex items-center gap-2">
              {katilimcilarLobbyId ? (
                <button
                  type="button"
                  onClick={() => onOpenLobbyManagement(katilimcilarLobbyId)}
                  aria-label="Özel lobi ayarları"
                  className="cursor-pointer text-color_textsecondary hover:text-color_accent"
                >
                  <Settings className="size-3.5" aria-hidden />
                </button>
              ) : canCreateLobby ? (
                <button
                  type="button"
                  onClick={onOpenCreateDialog}
                  className="cursor-pointer inline-flex shrink-0 items-center rounded-full bg-color_text px-3 py-1 text-[0.7rem] font-semibold text-background transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
                >
                  Özel lobi oluştur
                </button>
              ) : null}
              <LobbySwitcher options={myLobbies} current={katilimcilarLobbyId} onChange={onChangeKatilimcilarLobby} />
            </div>
          </FrameHeader>
          <FrameBody>
            <ParticipantStatusList
              players={katilimcilarDisplayPlayers}
              submitterUids={katilimcilarDisplaySubmitterUids}
              onSelectPlayer={setSelectedPlayerUid}
            />
          </FrameBody>
        </Frame>

        <Frame className={CELL} style={{ animationDelay: "120ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-base text-color_text sm:text-lg">
              <Link to="/forum" className="cursor-pointer no-underline hover:underline">
                Forum
              </Link>
            </FrameTitle>
          </FrameHeader>
          <FrameBody>
            <RecentPostsPreview
              posts={posts}
              players={players}
              uid={me.uid}
              likesByPost={likesByPost}
              onToggleLike={onToggleLike}
              onSelectParticipant={setSelectedPlayerUid}
              onDeletePost={onDeletePost}
              onSaveEdit={onSaveEdit}
              onRefetch={onRefetchPosts}
            />
            {(likeError || forumActionError) && (
              <p role="alert" className="shrink-0 px-5 pb-2 text-[0.72rem] text-color_remove sm:px-6">
                {likeError ?? forumActionError}
              </p>
            )}
            <ForumPreviewFooter />
          </FrameBody>
        </Frame>

        <HomeHero className={CELL} style={{ animationDelay: "180ms" }} />

        <Frame className={CELL} style={{ animationDelay: "240ms" }}>
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
            {/* `players` (global) vs `mentionCandidates` (lobby-scoped) is a
                deliberate split: author lookup has to see everyone who ever
                posted, including people who have since left or been removed
                from this lobby — otherwise their historical messages fall
                through to deletedAccount.ts's "Silindi", which specifically
                means "this account was deleted", not "this person left", and
                leaving is meant to be quiet (Round 3). Who you can @-mention
                is a genuinely lobby-scoped question, so that keeps the
                filtered list (2026-07-30, final-review fix). */}
            <ChatRoom
              uid={me.uid}
              players={players}
              mentionCandidates={sohbetDisplayPlayers}
              messages={sohbetLobbyId ? sohbetLobbyMessages.messages : messages}
              onLoadOlder={sohbetLobbyId ? sohbetLobbyMessages.loadOlder : onLoadOlderMessages}
              loadingOlder={sohbetLobbyId ? sohbetLobbyMessages.loadingOlder : loadingOlderMessages}
              hasMoreOlder={sohbetLobbyId ? sohbetLobbyMessages.hasMoreOlder : hasMoreOlderMessages}
              typingUids={sohbetLobbyId ? [] : typingUids}
              onSelectParticipant={setSelectedPlayerUid}
              lobbyId={sohbetLobbyId}
            />
          </FrameBody>
        </Frame>
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={[]}
        players={players}
        results={{}}
        onOpenChange={(open) => {
          if (!open) setSelectedPlayerUid(null);
        }}
        onSelectTeam={() => {}}
        tournamentStarted={false}
      />

      {/* Looked up defensively rather than with a non-null assertion: the
          managed lobby can vanish from myLobbies mid-action (deleted, left,
          or this viewer removed by someone else) before LoggedInHome's
          fallback effect has cleared managingLobbyId, and the panel reads
          lobby.createdByUid unconditionally (2026-07-30, final-review fix). */}
      {managedLobby && (
        <LobbyManagementPanel
          lobby={managedLobby}
          members={katilimcilarLobbyId === managingLobbyId ? katilimcilarLobbyMembers : sohbetLobbyMembers}
          players={players}
          myUid={me.uid}
          myFirstName={me.firstName}
          open={true}
          onOpenChange={(open) => !open && onCloseLobbyManagement()}
          onLeft={onLeftManagedLobby}
          onDeleted={onDeletedManagedLobby}
        />
      )}

      <Dialog open={createDialogOpen} onOpenChange={(open) => !open && onCloseCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Özel Lobi</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem("lobbyName") as HTMLInputElement;
              onCreateLobby(input.value);
            }}
          >
            <input
              name="lobbyName"
              maxLength={LOBBY_NAME_MAX_LENGTH}
              placeholder="Özel lobi adı"
              className="w-full rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-sm text-color_text outline-none focus:border-color_accent"
            />
            {createError && (
              <p role="alert" className="mt-2 text-sm text-color_remove">
                {createError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit">Oluştur</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
