import { useCallback, useState } from "react";
import { Frame, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamTable } from "../leaderboard/TeamTable";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { assignRanks } from "../leaderboard/ranking";
import { buildRankHistoryPoints, findBracketHandoffMatchday } from "../leaderboard/rankHistoryChart";
import { RankHistoryGraph } from "./RankHistoryGraph";
import { ChatCell } from "./ChatCell";
import { ForumCell } from "./ForumCell";
import { MiniLeaderboardWidget } from "./MiniLeaderboardWidget";
import { UpcomingMatchesWidget } from "./UpcomingMatchesWidget";
import { BracketCtaBanner } from "../bracket/BracketCtaBanner";
import { BracketWidget } from "../bracket/BracketWidget";
import { deriveCurrentRound } from "../bracket/deriveCurrentRound";
import { BracketState } from "../bracket/bracketState";
import { BracketPrediction } from "../bracket/bracketPredictionTypes";
import { RankSnapshot } from "../leaderboard/rankSnapshotTypes";
import { TournamentPhase } from "../tournament/tournamentPhase";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import type { RankedEntry } from "../leaderboard/ranking";
import type { MyLobby } from "../lobbies/useMyLobbies";
import type { useLobbyMessages } from "../lobbies/useLobbyMessages";
import type { LobbyMember } from "../lobbies/lobbyTypes";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface StartedHomeLoggedInProps {
  me: Player;
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  phase: TournamentPhase;
  bracketState: BracketState;
  bracketPrediction: BracketPrediction | null;
  snapshots: RankSnapshot[];
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
  sohbetLobbyMembers: LobbyMember[];
  sohbetLobbyMessages: ReturnType<typeof useLobbyMessages>;
  onOpenLobbyManagement: (id: string) => void;
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Three columns: the league table/bracket widget (fixed, tall — left,
// spanning every row per §2.1's "treat its size as fixed/given" rule), the
// rank-history graph (wide+short, spanning the remaining width in row 1),
// and a 2x2 of the four "roughly equal" widgets beneath it.
const GRID =
  "grid min-w-0 flex-1 grid-cols-[minmax(540px,1fr)_1fr_1fr] grid-rows-[auto_1fr_1fr] gap-4 sm:gap-5 lg:h-full lg:min-h-0 [&>*]:min-h-0 [&>*]:min-w-0";
const LEAGUE_CELL = "col-start-1 row-start-1 row-span-3 h-[26rem] lg:h-full";
const RANK_CELL = "col-start-2 col-span-2 row-start-1";
const CHAT_CELL = "col-start-2 row-start-2 h-[20rem] lg:h-full";
const FORUM_CELL = "col-start-3 row-start-2 h-[20rem] lg:h-full";
const MINI_CELL = "col-start-2 row-start-3 h-[20rem] lg:h-full";
const UPCOMING_CELL = "col-start-3 row-start-3 h-[20rem] lg:h-full";

/**
 * GREAT_LEAP_SPEC.md §2: the six-widget jigsaw for loggedin_leaguephase /
 * preknockout / knockout, replacing HomePage.tsx's old BLURB skeleton.
 */
export function StartedHomeLoggedIn({
  me,
  players,
  results,
  entries,
  phase,
  bracketState,
  bracketPrediction,
  snapshots,
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
  sohbetLobbyMembers,
  sohbetLobbyMessages,
  onOpenLobbyManagement,
}: StartedHomeLoggedInProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Same cross-linked-popup pattern as LeaderboardPage.tsx/ProfilePage.tsx:
  // selecting one clears the other.
  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);

  const rankedEntries = assignRanks(entries);
  const selectedRanked: RankedEntry | null = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  const rankHistoryPoints = buildRankHistoryPoints(snapshots, me.uid);
  const handoffMatchday = findBracketHandoffMatchday(rankHistoryPoints);
  const currentRound = deriveCurrentRound(bracketState);

  return (
    <div className={PAGE_SHELL}>
      <Frame className="shrink-0 animate-cotton-rise">
        <FrameBody className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
          {/* GREAT_LEAP_SPEC.md §5.2: bracket CTA once the window opens
              (preknockout), same pattern as the not-started home's
              "Tahminini Yap" CTA — no countdown (§1.2 forbids calendar-
              driven timers; the bracket window is phase-boundary-driven). */}
          {phase === "preknockout" && !bracketPrediction && <BracketCtaBanner />}
        </FrameBody>
      </Frame>

      <div className={GRID}>
        {phase === "knockout" ? (
          <div className={LEAGUE_CELL}>
            <BracketWidget bracketState={bracketState} currentRound={currentRound} onSelectTeam={handleSelectTeam} />
          </div>
        ) : (
          <TeamTable
            className={LEAGUE_CELL}
            results={results}
            onSelectTeam={handleSelectTeam}
          />
        )}

        <RankHistoryGraph
          className={RANK_CELL}
          points={rankHistoryPoints}
          maxRank={Math.max(entries.length, 1)}
          handoffMatchday={handoffMatchday}
        />

        <ChatCell
          className={CHAT_CELL}
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
          onSelectParticipant={handleSelectParticipant}
        />

        <ForumCell
          className={FORUM_CELL}
          posts={posts}
          players={players}
          myUid={me.uid}
          likesByPost={likesByPost}
          onToggleLike={onToggleLike}
          onSelectParticipant={handleSelectParticipant}
          onDeletePost={onDeletePost}
          onSaveEdit={onSaveEdit}
          onRefetchPosts={onRefetchPosts}
          likeError={likeError}
          forumActionError={forumActionError}
        />

        <MiniLeaderboardWidget
          className={MINI_CELL}
          entries={entries}
          currentUid={me.uid}
          onSelectParticipant={handleSelectParticipant}
        />

        <UpcomingMatchesWidget className={UPCOMING_CELL} results={results} />
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
    </div>
  );
}
