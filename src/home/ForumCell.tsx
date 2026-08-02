import { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import type { Player } from "../profile/usePlayers";
import type { PostWithId } from "../forum/postTypes";

interface ForumCellProps {
  className?: string;
  style?: CSSProperties;
  posts: PostWithId[];
  players: Player[];
  myUid: string;
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  onSelectParticipant: (uid: string) => void;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetchPosts: () => void;
  likeError: string | null;
  forumActionError: string | null;
}

/**
 * GREAT_LEAP_SPEC.md §2.3: identical forum cell for both the not-started and
 * started logged-in homes — no phase-aware filtering. Extracted from
 * HomeLandingLoggedIn.tsx's second cell so both callers share one
 * implementation.
 */
export function ForumCell({
  className,
  style,
  posts,
  players,
  myUid,
  likesByPost,
  onToggleLike,
  onSelectParticipant,
  onDeletePost,
  onSaveEdit,
  onRefetchPosts,
  likeError,
  forumActionError,
}: ForumCellProps) {
  return (
    <Frame className={className} style={style}>
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
          uid={myUid}
          likesByPost={likesByPost}
          onToggleLike={onToggleLike}
          onSelectParticipant={onSelectParticipant}
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
  );
}
