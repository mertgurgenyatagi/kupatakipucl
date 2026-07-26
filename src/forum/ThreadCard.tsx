// src/forum/ThreadCard.tsx
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { PostWithId } from "./postTypes";
import { Player } from "../profile/usePlayers";
import { ThreadStats } from "./threadStats";
import { ReplyRow } from "./ReplyRow";
import { timeAgo } from "./forumTime";
import { splitMentionSegments } from "../chat/chatMentions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const PREVIEW_REPLY_COUNT = 3;
const LONG_TEXT_THRESHOLD = 200;

interface ThreadCardProps {
  post: PostWithId;
  /** Every reply to this root, any order — the card slices its own
   *  most-recent-3 preview (forum-round-02 Q5: oldest of the three first). */
  replies: PostWithId[];
  stats: ThreadStats;
  players: Player[];
  /** The full, currently-loaded post list — threaded through to ReplyRow
   *  for its quote-still-exists check. */
  posts: PostWithId[];
  uid: string | null;
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  onSelectParticipant: (uid: string) => void;
  /** Triggered by "Devamını oku" on a clamped post, the "+N önceki yanıt"
   *  banner, or the reply-count pill itself — three doors to the same full-
   *  thread popup (forum-round-03 Q2), never a whole-card click target. */
  onExpand: () => void;
  onDelete?: (postId: string) => void;
}

export function ThreadCard({
  post,
  replies,
  stats,
  players,
  posts,
  uid,
  likesByPost,
  onToggleLike,
  onSelectParticipant,
  onExpand,
  onDelete,
}: ThreadCardProps) {
  const author = players.find((p) => p.uid === post.uid);
  const isOwn = uid !== null && uid === post.uid;
  const isLong = post.text.length > LONG_TEXT_THRESHOLD || post.text.split("\n").length > 3;
  const likedBy = likesByPost.get(post.id);
  const liked = uid ? (likedBy?.has(uid) ?? false) : false;
  const likeCount = likedBy?.size ?? 0;

  const sortedReplies = replies.slice().sort((a, b) => a.createdAt - b.createdAt);
  const preview = sortedReplies.slice(-PREVIEW_REPLY_COUNT);
  const omittedCount = sortedReplies.length - preview.length;

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-border/60 bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectParticipant(post.uid)}
          className="group flex min-w-0 cursor-pointer items-center gap-2.5"
        >
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={author?.photoURL} alt="" />
            <AvatarFallback className="font-mono text-[0.6rem] text-muted-foreground">
              {author ? initials(author.firstName, author.lastName) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 text-left">
            <span className="block truncate font-display text-sm font-medium text-ink group-hover:underline">
              {author ? `${author.firstName} ${author.lastName}` : "Bilinmeyen"}
            </span>
            <span className="block font-mono text-[0.62rem] text-muted-foreground tnum">
              {timeAgo(stats.lastActivityAt)}
              {post.editedAt && " · düzenlendi"}
            </span>
          </span>
        </button>
        {isOwn && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            aria-label="Konuyu sil"
            className="shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {post.imageURL && (
        <img
          src={post.imageURL}
          alt=""
          className="max-h-56 w-full rounded-lg border border-border/50 object-cover"
        />
      )}

      <div>
        <p className={cn("text-sm break-words whitespace-pre-wrap text-navy-muted", isLong && "line-clamp-3")}>
          {splitMentionSegments(post.text, players).map((segment, i) =>
            segment.isMention ? (
              <span key={i} className="font-semibold text-brass">
                {segment.text}
              </span>
            ) : (
              <span key={i}>{segment.text}</span>
            )
          )}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={onExpand}
            className="mt-1 cursor-pointer font-mono text-[0.66rem] tracking-wide text-muted-foreground uppercase hover:text-brass"
          >
            Devamını oku
          </button>
        )}
      </div>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          aria-pressed={liked}
          aria-label={liked ? "Beğeniyi geri al" : "Beğen"}
          className={cn(
            "-ml-1.5 flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass",
            liked ? "text-brass" : "text-muted-foreground hover:text-brass"
          )}
        >
          <Heart className="size-3.5" fill={liked ? "currentColor" : "none"} strokeWidth={2} aria-hidden />
          <span className="font-mono text-[0.68rem] tnum">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-muted-foreground outline-none transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass"
        >
          <MessageCircle className="size-3.5" aria-hidden />
          <span className="font-mono text-[0.68rem] tnum">{sortedReplies.length} yanıt</span>
        </button>
      </div>

      {(preview.length > 0 || omittedCount > 0) && (
        <div className="flex min-h-0 flex-col gap-1.5 border-t border-border/40 pt-2.5">
          {omittedCount > 0 && (
            <button
              type="button"
              onClick={onExpand}
              className="cursor-pointer rounded-lg bg-muted/40 px-3 py-1.5 text-left font-mono text-[0.66rem] tracking-wide text-muted-foreground uppercase hover:text-brass"
            >
              + {omittedCount} önceki yanıt · tümünü gör
            </button>
          )}
          <ul className="flex flex-col gap-1.5">
            {preview.map((reply) => {
              const rLikedBy = likesByPost.get(reply.id);
              return (
                <ReplyRow
                  key={reply.id}
                  reply={reply}
                  players={players}
                  posts={posts}
                  uid={uid}
                  liked={uid ? (rLikedBy?.has(uid) ?? false) : false}
                  likeCount={rLikedBy?.size ?? 0}
                  onToggleLike={onToggleLike}
                  onSelectParticipant={onSelectParticipant}
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
