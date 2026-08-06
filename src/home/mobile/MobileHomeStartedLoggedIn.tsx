import { Frame, FrameBody } from "@/components/ui/frame";
import { cn } from "@/lib/utils";
import { MobileWelcomeBanner } from "./MobileWelcomeBanner";
import { KnockoutPredictionWidget } from "../KnockoutPredictionWidget";
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
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-3 px-3 py-3",
        // preknockout carries a third block (the knockout CTA). Rather than
        // squeeze the standings and the forum into what is left, the page is
        // allowed to scroll in that one phase.
        phase === "preknockout" ? "flex-1" : "mobile-screenful"
      )}
    >
      {/* showCta is false throughout: /predictions redirects home once the
          tournament has started, so the league-prediction CTA would be a
          link to a bounce. Same reasoning as the desktop started page. */}
      <MobileWelcomeBanner me={me} showCta={false} />

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
