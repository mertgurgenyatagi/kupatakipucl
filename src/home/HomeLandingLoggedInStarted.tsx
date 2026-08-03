import { useCallback, useMemo, useState } from "react";
import { HomeWelcomeVertical } from "./HomeWelcomeVertical";
import { HomeStartedHero } from "./HomeStartedHero";
import { KnockoutPredictionWidget } from "./KnockoutPredictionWidget";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { NearbyStandingsList } from "../leaderboard/NearbyStandingsList";
import { ChatRoom } from "../chat/ChatRoom";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { assignRanks } from "../leaderboard/ranking";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LOBBY_NAME_MAX_LENGTH } from "../lobbies/lobbyTypes";
import type { Player } from "../profile/usePlayers";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";
import type { TournamentPhase } from "../tournament/tournamentPhase";

interface HomeLandingLoggedInStartedProps {
  me: Player;
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  phase: TournamentPhase;
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
  canCreateLobby?: boolean;
  createDialogOpen?: boolean;
  onOpenCreateDialog?: () => void;
  onCloseCreateDialog?: () => void;
  onCreateLobby?: (name: string) => void;
  createError?: string | null;
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";

const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[200px_1fr_300px_1fr] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

export function HomeLandingLoggedInStarted({
  me,
  players,
  results,
  entries,
  phase,
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
  createDialogOpen = false,
  onOpenCreateDialog,
  onCloseCreateDialog,
  onCreateLobby,
  createError,
}: HomeLandingLoggedInStartedProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

  const myRanked = useMemo(() => rankedEntries.find((r) => r.entry.uid === me.uid), [rankedEntries, me.uid]);
  const myRank = myRanked ? myRanked.rank : "-";
  const myPoints = myRanked ? myRanked.entry.points : 0;

  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
    setSelectedFixtureId(null);
  }, []);
  const handleSelectFixture = useCallback((fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    setSelectedTeamId(null);
    setSelectedUid(null);
  }, []);

  return (
    <div className={PAGE_SHELL}>
      <div className={CELL_ROW}>
        {/* Col 1: Vertical Welcome Card with Create Lobby Button */}
        <HomeWelcomeVertical
          me={me}
          rank={myRank}
          points={myPoints}
          onOpenCreateDialog={onOpenCreateDialog}
        />

        {/* Col 2: Stacked Mini Standings (Top) & Forum (Bottom) */}
        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          <Frame className="h-[260px] shrink-0 animate-cotton-rise border-color_border1/35" style={{ animationDelay: "60ms" }}>
            <FrameBody>
              <NearbyStandingsList
                entries={entries}
                players={players}
                myUid={me.uid}
                onSelectParticipant={handleSelectParticipant}
              />
            </FrameBody>
          </Frame>

          <Frame className="min-h-0 flex-1 animate-cotton-rise border-color_border1/35" style={{ animationDelay: "120ms" }}>
            <FrameBody>
              <RecentPostsPreview
                posts={posts}
                players={players}
                uid={me.uid}
                likesByPost={likesByPost}
                onToggleLike={onToggleLike}
                onSelectParticipant={handleSelectParticipant}
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
        </div>

        {/* Col 3: Hero Carousel with Bottom (Matches) Drawer */}
        <HomeStartedHero
          results={results}
          onSelectFixture={handleSelectFixture}
        />

        {/* Col 4: knockout-prediction widget (preknockout only) + Sohbet */}
        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          {phase === "preknockout" && <KnockoutPredictionWidget />}

          <Frame
            className="min-h-0 flex-1 animate-cotton-rise border-color_border1/35"
            style={{ animationDelay: "300ms" }}
          >
            <FrameHeader tone="navy">
              <FrameTitle className="text-base text-color_text sm:text-lg">
                Sohbet
              </FrameTitle>
              <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.1em] text-color_text/70 uppercase tnum">
                <span className="size-1.5 rounded-full bg-color_accent" aria-hidden />
                {onlineCount} çevrimiçi
              </span>
            </FrameHeader>
            <FrameBody>
              <ChatRoom
                uid={me.uid}
                players={players}
                mentionCandidates={players}
                messages={messages}
                onLoadOlder={onLoadOlderMessages}
                loadingOlder={loadingOlderMessages}
                hasMoreOlder={hasMoreOlderMessages}
                typingUids={typingUids}
                onSelectParticipant={handleSelectParticipant}
                lobbyId={null}
              />
            </FrameBody>
          </Frame>
        </div>
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={(open) => {
          if (!open) setSelectedUid(null);
        }}
        onSelectTeam={handleSelectTeam}
        tournamentStarted
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={(open) => {
          if (!open) setSelectedTeamId(null);
        }}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        onSelectFixture={handleSelectFixture}
        tournamentStarted
      />
      <MatchupPopup
        fixtureId={selectedFixtureId}
        onOpenChange={(open) => {
          if (!open) setSelectedFixtureId(null);
        }}
        phase={phase}
        tournamentStarted
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={handleSelectTeam}
        onSelectParticipant={handleSelectParticipant}
      />

      <Dialog open={createDialogOpen} onOpenChange={(open) => !open && onCloseCreateDialog?.()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Özel Lobi</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem("lobbyName") as HTMLInputElement;
              onCreateLobby?.(input.value);
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
