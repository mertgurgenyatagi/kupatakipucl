import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { PostWithId } from "./postTypes";
import { Player } from "../profile/usePlayers";
import { computeThreadStats } from "./threadStats";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface RecentPostsPreviewProps {
  posts: PostWithId[];
  players: Player[];
  uid: string;
  /** postId -> set of uids who liked it. */
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  /** Defaults to 3 (forum-widget-round-01 Q4) — enough to feel alive in a
   *  home-page cell without turning into the full thread view (that's what
   *  /forum is for). */
  limit?: number;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function timeAgo(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

/**
 * "Recent forum posts" per PAGE_BRIEFING's Home brief — a condensed preview,
 * explicitly not the full interactive Forum (that stays PostForm/ThreadNode's
 * job at /forum). Read-only except for the like toggle (forum-widget-round-01
 * §C — no quick-reply, no in-widget composer, no edit/delete here, all of
 * that stays a /forum-only concern). Threads sort by last activity, not
 * strictly by when they were first posted, so a reply bumps its thread back
 * to the top (round-01 Q1/Q6).
 */
export function RecentPostsPreview({
  posts,
  players,
  uid,
  likesByPost,
  onToggleLike,
  limit = 3,
}: RecentPostsPreviewProps) {
  const playersByUid = new Map(players.map((p) => [p.uid, p]));
  const stats = computeThreadStats(posts);
  const recent = posts
    .filter((post) => post.parentId === null)
    .sort((a, b) => (stats.get(b.id)?.lastActivityAt ?? b.createdAt) - (stats.get(a.id)?.lastActivityAt ?? a.createdAt))
    .slice(0, limit);

  if (recent.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <p className="text-center font-display text-sm text-muted-foreground italic">Henüz gönderi yok.</p>
      </div>
    );
  }

  return (
    <ul className="no-scrollbar min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto px-5 sm:px-6">
      {recent.map((post) => {
        const author = playersByUid.get(post.uid);
        const threadStats = stats.get(post.id) ?? { replyCount: 0, lastActivityAt: post.createdAt, latestReply: null };
        const likedBy = likesByPost.get(post.id);
        const liked = likedBy?.has(uid) ?? false;
        const likeCount = likedBy?.size ?? 0;
        const replyAuthor = threadStats.latestReply ? playersByUid.get(threadStats.latestReply.uid) : undefined;

        return (
          <li key={post.id} className="flex items-start gap-3 py-4">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={author?.photoURL} alt="" />
              <AvatarFallback className="font-mono text-[0.6rem] text-muted-foreground">
                {author ? initials(author.firstName, author.lastName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-sm font-medium text-ink">
                  {author ? `${author.firstName} ${author.lastName}` : "Bilinmeyen"}
                </span>
                <span className="shrink-0 font-mono text-[0.62rem] text-muted-foreground tnum">
                  {timeAgo(threadStats.lastActivityAt)}
                </span>
              </div>
              <div className="mt-1.5 flex items-start gap-2.5">
                {post.imageURL && (
                  <img
                    src={post.imageURL}
                    alt=""
                    className="size-11 shrink-0 rounded-lg border border-border/50 object-cover"
                  />
                )}
                <p className="line-clamp-2 min-w-0 flex-1 text-sm text-navy-muted">{post.text}</p>
              </div>
              <div className="mt-2.5 flex items-center gap-3.5">
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
                  {/* Always rendered, even at zero — a count that appears/disappears on
                      toggle changes the button's width and snaps the row (and everything
                      below it in this scroll list) sideways/downward. */}
                  <span className="font-mono text-[0.68rem] tnum">{likeCount}</span>
                </button>
                <span className="font-mono text-[0.68rem] text-muted-foreground tnum">
                  {threadStats.replyCount} yanıt
                </span>
              </div>
              {threadStats.latestReply && (
                <p className="mt-2 line-clamp-1 pl-3 text-xs text-muted-foreground">
                  ↳ <span className="font-medium text-ink/80">{replyAuthor ? replyAuthor.firstName : "Bilinmeyen"}:</span>{" "}
                  {threadStats.latestReply.text}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ForumPreviewFooter() {
  return (
    <Link
      to="/forum"
      className="shrink-0 border-t border-border/50 px-5 py-2.5 text-center font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase no-underline outline-none transition-colors duration-150 ease-[var(--ease-cotton)] hover:text-brass focus-visible:text-brass focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass sm:px-6"
    >
      Forumu Aç
    </Link>
  );
}
