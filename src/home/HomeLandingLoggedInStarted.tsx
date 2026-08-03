import { useCallback, useMemo, useState } from "react";
import { HomeWelcomeBanner } from "./HomeWelcomeBanner";
import { UpcomingMatchesPreview } from "../leaderboard/UpcomingMatchesPreview";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { NearbyStandingsList } from "../leaderboard/NearbyStandingsList";
import { HomeHero } from "./HomeHero";
import { ChatRoom } from "../chat/ChatRoom";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { assignRanks } from "../leaderboard/ranking";
import { Frame, FrameBody } from "@/components/ui/frame";
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
  /** The real, current started phase — reused as-is for preknockout/knockout
   *  (2026-08-03, "populate the pages" pass), so MatchupPopup's knockout
   *  branch gates on the actual phase rather than a hardcoded leaguephase. */
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
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Starting values, not pixel-locked (design spec: "the sketch's own... not
// to take too seriously" framing) — col 2 fixed at 300px to match HomeHero's
// established width everywhere else it appears.
const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[1fr_300px_1fr] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

/**
 * Home, logged-in + league phase — the wireframe's welcome banner (identical
 * to logged-in-not-started's) above a 3-column bento: [upcoming 3 matches /
 * forum] | hero carousel | [nearby standings / chat]. No FrameHeader/title
 * band on any of the five widgets, a deliberate departure from
 * HomeLandingLoggedIn's navy-banded cells (Mert's direct instruction).
 * Katılımcılar and the Special Lobby switcher are absent entirely — dropped
 * in favor of the upcoming-matches widget and the nearby-standings widget
 * (design spec 2026-08-03).
 */
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
}: HomeLandingLoggedInStartedProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;

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
      <HomeWelcomeBanner me={me} showCta={false} />

      <div className={CELL_ROW}>
        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          <Frame className="h-60 shrink-0 animate-cotton-rise" style={{ animationDelay: "60ms" }}>
            <FrameBody>
              <UpcomingMatchesPreview
                results={results}
                onSelectTeam={handleSelectTeam}
                onSelectFixture={handleSelectFixture}
              />
            </FrameBody>
          </Frame>

          <Frame className="min-h-0 flex-1 animate-cotton-rise" style={{ animationDelay: "120ms" }}>
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

        <HomeHero className="h-[26rem] lg:h-full animate-cotton-rise" style={{ animationDelay: "180ms" }} />

        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          <Frame className="h-60 shrink-0 animate-cotton-rise" style={{ animationDelay: "240ms" }}>
            <FrameBody>
              <NearbyStandingsList
                entries={entries}
                players={players}
                myUid={me.uid}
                onSelectParticipant={handleSelectParticipant}
              />
            </FrameBody>
          </Frame>

          <Frame className="min-h-0 flex-1 animate-cotton-rise" style={{ animationDelay: "300ms" }}>
            <FrameBody>
              {/* No FrameHeader on this page — the online-count badge that
                  used to live in Sohbet's navy header band moves here as a
                  quiet inline line instead (design spec 2026-08-03,
                  "Chat cell" section). */}
              <div className="flex shrink-0 items-center justify-end px-5 py-2 sm:px-6">
                <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.1em] text-color_textsecondary uppercase tnum">
                  <span className="size-1.5 rounded-full bg-color_accent" aria-hidden />
                  {onlineCount} çevrimiçi
                </span>
              </div>
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
    </div>
  );
}
