import { Frame, FrameBody } from "@/components/ui/frame";
import { MobileWelcomeBanner } from "./MobileWelcomeBanner";
import { KnockoutPredictionWidget } from "../KnockoutPredictionWidget";
import { GracePeriodBanner } from "../GracePeriodBanner";
import { useGracePeriodOpen } from "../useGracePeriodOpen";
import { NearbyStandingsList } from "../../leaderboard/NearbyStandingsList";
import { RecentPostsPreview } from "../../forum/RecentPostsPreview";
import type { LeaderboardEntry } from "../../leaderboard/leaderboardTypes";
import type { TournamentPhase } from "../../tournament/tournamentPhase";
import type { Player } from "../../profile/usePlayers";
import type { PostWithId } from "../../forum/postTypes";

/**
 * Home — logged in, tournament running. Welcome, where you stand, what
 * people are saying.
 *
 * One composition for all three started phases, matching the wireframe's own
 * aliasing ("exact same as in-leaguephase" on both the preknockout and
 * knockout cells). The single difference is preknockout, where the wireframe
 * says to *"put the make prediction reminder and counter somewhere. You can
 * shrink the forum and mini leaderboard"* — so the knockout CTA takes a slice
 * off the top and the two lists below give it up.
 *
 * `KnockoutPredictionWidget` removes itself once you've submitted, so the
 * preknockout screen quietly becomes the league-phase screen again the moment
 * your bracket is in.
 *
 * Dropped from desktop: Sohbet (now the shell drawer), the hero carousel, and
 * the upcoming-fixtures widget.
 */
export function MobileHomeStartedLoggedIn({
  me,
  players,
  entries,
  posts,
  likesByPost,
  onToggleLike,
  onDeletePost,
  onSaveEdit,
  onRefetchPosts,
  onSelectParticipant,
  phase,
}: {
  me: Player;
  players: Player[];
  entries: LeaderboardEntry[];
  posts: PostWithId[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  onSelectParticipant: (uid: string) => void;
  phase: TournamentPhase;
}) {
  const graceOpen = useGracePeriodOpen();
  // The real leaderboard only carries an entry once a prediction exists —
  // its absence is exactly "me hasn't submitted yet", same signal
  // HomeLandingLoggedInStarted.tsx's desktop counterpart uses.
  const hasSubmitted = entries.some((e) => e.uid === me.uid);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
      {/* showCta is false throughout: outside the grace window, /predictions
          redirects home once the tournament has started, so the
          league-prediction CTA would be a link to a bounce. Same reasoning
          as the desktop started page. During the grace window, a
          not-yet-submitted viewer gets GracePeriodBanner instead — its own
          countdown targets the grace deadline, not this one's
          TOURNAMENT_START_ISO (already past by then). */}
      <MobileWelcomeBanner me={me} showCta={false} />

      {phase === "leaguephase" && graceOpen && !hasSubmitted && <GracePeriodBanner variant="loggedin" />}

      {phase === "preknockout" && <KnockoutPredictionWidget />}

      <Frame className="flex min-h-0 flex-1 flex-col animate-cotton-rise">
        <FrameBody className="min-h-0 flex-1">
          <NearbyStandingsList
            entries={entries}
            players={players}
            myUid={me.uid}
            onSelectParticipant={onSelectParticipant}
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
