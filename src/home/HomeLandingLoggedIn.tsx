import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Settings } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { ParticipantStatusList } from "./ParticipantStatusList";
import { HomeHero } from "./HomeHero";
import { ChatCell } from "./ChatCell";
import { useCountdown } from "./useCountdown";
import { TOURNAMENT_START_ISO } from "./deadlines";
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

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function MiniCountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-2xl leading-none font-semibold text-color_text tnum sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs tracking-[0.1em] text-color_textsecondary uppercase">{label}</span>
    </span>
  );
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
  const countdown = useCountdown(TOURNAMENT_START_ISO);

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
          lastName: selectedPlayer.lastName,
          photoURL: selectedPlayer.photoURL,
          points: 0,
          ranking: [],
        },
        rank: 1,
      }
    : null;

  const playersByUid = buildPlayersByUid(players);
  const katilimcilarDisplayPlayers = katilimcilarLobbyId
    ? katilimcilarLobbyMembers.map((m) => playersByUid.get(m.uid)).filter((p): p is Player => p !== undefined)
    : players;
  const katilimcilarDisplaySubmitterUids = katilimcilarLobbyId
    ? new Set([...submitterUids].filter((uid) => katilimcilarLobbyMembers.some((m) => m.uid === uid)))
    : submitterUids;
  const managedLobby = myLobbies.find((l) => l.id === managingLobbyId);

  return (
    <div className={PAGE_SHELL}>
      {/* Personal welcome + primary action + countdown — one frame, no
          title band (ParticipantPopup's "no widget carries a label" rule
          applies here too: a greeting doesn't need to identify itself). */}
      <Frame className="shrink-0 animate-cotton-rise">
        <FrameBody className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="size-14 shrink-0">
              <AvatarImage src={me.photoURL} alt="" />
              <AvatarFallback className="font-mono text-sm text-color_textsecondary">
                {initials(me.firstName, me.lastName)}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 truncate font-display text-xl text-color_text sm:text-2xl">
              Hoş geldin, <span className="font-bold">{me.firstName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            {/* /predictions is a one-time door (predictions-page-round-02
                §E) — once submitted, there's nothing left to do there, so
                the button that leads to it just stops existing. */}
            {!submitterUids.has(me.uid) && (
              <Link
                to="/predictions"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-color_text px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
              >
                Tahminini Yap
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}

            {!countdown.done && (
              <div className="flex items-baseline gap-4 whitespace-nowrap">
                <span className="font-mono text-xs tracking-[0.12em] text-color_textsecondary uppercase">
                  Tahminlerin Kapanmasına
                </span>
                <div className="flex items-baseline gap-3.5">
                  <MiniCountdownDigit value={countdown.days} label="Gün" />
                  <MiniCountdownDigit value={countdown.hours} label="Saat" />
                  <MiniCountdownDigit value={countdown.minutes} label="Dk" />
                  <MiniCountdownDigit value={countdown.seconds} label="Sn" />
                </div>
              </div>
            )}
          </div>
        </FrameBody>
      </Frame>

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

        <ChatCell
          className={CELL}
          style={{ animationDelay: "240ms" }}
          myUid={me.uid}
          players={players}
          myLobbies={myLobbies}
          sohbetLobbyId={sohbetLobbyId}
          onChangeSohbetLobby={onChangeSohbetLobby}
          onOpenLobbyManagement={onOpenLobbyManagement}
          sohbetLobbyMembers={sohbetLobbyMembers}
          sohbetLobbyMessages={sohbetLobbyMessages}
          messages={messages}
          onLoadOlderMessages={onLoadOlderMessages}
          loadingOlderMessages={loadingOlderMessages}
          hasMoreOlderMessages={hasMoreOlderMessages}
          onlineCount={onlineCount}
          typingUids={typingUids}
          onSelectParticipant={setSelectedPlayerUid}
        />
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={[]}
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
