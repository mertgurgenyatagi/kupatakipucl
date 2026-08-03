import { useCallback, useMemo, useState } from "react";
import { usePosts } from "../forum/usePosts";
import { buildLikesByPost } from "../forum/postLikes";
import { assignRanks } from "../leaderboard/ranking";
import { LeagueTableList } from "../leaderboard/LeagueTableList";
import { UpcomingMatchesPreview } from "../leaderboard/UpcomingMatchesPreview";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { HomeHero } from "./HomeHero";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { Player } from "../profile/usePlayers";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { TournamentPhase } from "../tournament/tournamentPhase";

interface HomeLandingLoggedOutStartedProps {
  results: Record<string, TeamResult>;
  players: Player[];
  entries: LeaderboardEntry[];
  /** The real, current started phase — reused as-is for preknockout/knockout
   *  (2026-08-03, "populate the pages" pass), so MatchupPopup's knockout
   *  branch gates on the actual phase rather than a hardcoded leaguephase. */
  phase: TournamentPhase;
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Column widths are a first-pass estimate (design spec §3: "starting
// values, not pixel-locked") — col 1 widest for the league table, col 2
// narrower for its two stacked frames, col 3 a fixed 300px matching
// HomeHero's established width on logged-in Home, col 4 wide for standings.
const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[1.144fr_1.16fr_300px_1fr] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";
const CELL = "h-[26rem] lg:h-full animate-cotton-rise";

// This page never has a signed-in viewer (it's the loggedout_leaguephase/
// preknockout/knockout composition), so RecentPostsPreview's like/delete/edit
// callbacks are structurally unreachable here — the like button is
// disabled, and delete/edit only ever fire for a post's own author, which
// a null uid can never be.
function noop() {}

/**
 * Home, logged-out + league phase — the wireframe's 4-column bento: league
 * table | upcoming fixtures + forum preview | hero carousel | participant
 * standings. No banner/blurb/greeting above it (design spec: the wireframe
 * is literal). Desktop-only, no responsive breakpoints.
 */
export function HomeLandingLoggedOutStarted({ results, players, entries, phase }: HomeLandingLoggedOutStartedProps) {
  const { posts, loading: postsLoading } = usePosts();
  const likesByPost = useMemo(() => buildLikesByPost(posts), [posts]);
  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
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
      <div className={CELL_ROW}>
        <LeagueTableList results={results} onSelectTeam={handleSelectTeam} />

        <div className="flex min-h-0 flex-col gap-4 lg:gap-5">
          {/* Content-driven height, not a flex-grow share of the column —
              this frame holds exactly 3 fixed-height compact rows, so it
              should size to fit them and nothing more, handing every
              remaining pixel to Forum below rather than claiming a fixed
              ratio regardless of how tall its own content actually is. */}
          <Frame className="h-60 shrink-0 animate-cotton-rise" style={{ animationDelay: "60ms" }}>
            <FrameBody>
              <UpcomingMatchesPreview results={results} onSelectTeam={handleSelectTeam} onSelectFixture={handleSelectFixture} />
            </FrameBody>
          </Frame>

          <Frame className="min-h-0 flex-1 animate-cotton-rise" style={{ animationDelay: "120ms" }}>
            <FrameHeader tone="navy">
              <FrameTitle className="text-base text-color_text sm:text-lg">Forum</FrameTitle>
            </FrameHeader>
            <FrameBody>
              {postsLoading ? (
                <div className="flex flex-col gap-3 p-4" aria-hidden data-testid="home-forum-skeleton">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <Skeleton className="h-4 flex-1 rounded-sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <RecentPostsPreview
                    posts={posts}
                    players={players}
                    uid={null}
                    likesByPost={likesByPost}
                    onToggleLike={noop}
                    onSelectParticipant={handleSelectParticipant}
                    onDeletePost={noop}
                    onSaveEdit={noop}
                    onRefetch={noop}
                  />
                  <ForumPreviewFooter />
                </>
              )}
            </FrameBody>
          </Frame>
        </div>

        <HomeHero className={CELL} style={{ animationDelay: "180ms" }} />

        <LeaderboardTable
          entries={entries}
          players={players}
          revealCorrectness
          onSelectEntry={handleSelectParticipant}
        />
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
        // This composition never has a signed-in viewer — the quiz-answers
        // widget stays gated behind the same viewerLoggedIn flag Forum uses,
        // rather than removing the popup/standings column outright.
        viewerLoggedIn={false}
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
