// src/forum/Forum.tsx
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PostWithId } from "./postTypes";
import { Player } from "../profile/usePlayers";
import { computeThreadStats } from "./threadStats";
import { PostForm } from "./PostForm";
import { ThreadCard } from "./ThreadCard";
import { ThreadPopup } from "./ThreadPopup";

interface ForumProps {
  uid: string | null;
  posts: PostWithId[];
  players: Player[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  onSelectParticipant: (uid: string) => void;
  onDeletePost: (postId: string) => void;
  onSaveEdit: (postId: string, text: string) => void;
  onRefetch: () => void;
  actionError?: string | null;
}

/**
 * The real /forum page — a grid of thread cards, 3 per row max
 * (forum-round-02 Q3, replacing the earlier "one big frame" answer), each a
 * clamped preview (root post + its 3 most recent replies) that expands into
 * ThreadPopup for the full conversation. Threads sort by last activity, same
 * bump-to-top-on-reply rule as the Home widget (forum-round-01 Q2) — editing
 * never bumps it (forum-round-03 Q6).
 */
export function Forum({
  uid,
  posts,
  players,
  likesByPost,
  onToggleLike,
  onSelectParticipant,
  onDeletePost,
  onSaveEdit,
  onRefetch,
  actionError = null,
}: ForumProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);

  const playersByUid = useMemo(() => new Map(players.map((p) => [p.uid, p])), [players]);
  const stats = useMemo(() => computeThreadStats(posts), [posts]);

  const roots = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    return posts
      .filter((post) => post.parentId === null)
      .filter((post) => {
        if (!trimmed) return true;
        const author = playersByUid.get(post.uid);
        const authorName = author ? `${author.firstName} ${author.lastName}`.toLowerCase() : "";
        return post.text.toLowerCase().includes(trimmed) || authorName.includes(trimmed);
      })
      .sort((a, b) => (stats.get(b.id)?.lastActivityAt ?? b.createdAt) - (stats.get(a.id)?.lastActivityAt ?? a.createdAt));
  }, [posts, playersByUid, stats, searchQuery]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:min-h-0">
      <div className="shrink-0 rounded-xl border border-border/60 bg-background p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 w-full sm:w-1/4">
            {uid ? (
              <PostForm uid={uid} parentId={null} players={players} onPosted={onRefetch} placeholder="Yeni bir konu başlat…" />
            ) : (
              <p className="font-display text-sm text-muted-foreground italic">
                Konu açmak veya yanıtlamak için giriş yapmalısın.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            aria-label={searchOpen ? "Aramayı kapat" : "Forumda ara"}
            aria-pressed={searchOpen}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            {searchOpen ? <X className="size-4" aria-hidden /> : <Search className="size-4" aria-hidden />}
          </button>
        </div>
        {searchOpen && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Forumda ara…"
              className="w-full rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-brass"
            />
          </div>
        )}
      </div>

      {actionError && (
        <p role="alert" className="shrink-0 text-xs text-destructive">
          {actionError}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto lg:min-h-0">
        {roots.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="text-center font-display text-sm text-muted-foreground italic">
              {searchQuery.trim() ? "Sonuç bulunamadı." : "Henüz gönderi yok."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-7">
            {roots.map((post) => (
              <div key={post.id} className="mx-auto w-full lg:w-[90%]">
                <ThreadCard
                  post={post}
                  replies={posts.filter((p) => p.parentId === post.id)}
                  stats={
                    stats.get(post.id) ?? { replyCount: 0, lastActivityAt: post.createdAt, latestReply: null }
                  }
                  players={players}
                  posts={posts}
                  uid={uid}
                  likesByPost={likesByPost}
                  onToggleLike={onToggleLike}
                  onSelectParticipant={onSelectParticipant}
                  onExpand={() => setExpandedRootId(post.id)}
                  onDelete={uid === post.uid ? onDeletePost : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <ThreadPopup
        rootId={expandedRootId}
        posts={posts}
        players={players}
        uid={uid}
        likesByPost={likesByPost}
        onToggleLike={onToggleLike}
        onOpenChange={(open) => {
          if (!open) setExpandedRootId(null);
        }}
        onSelectParticipant={onSelectParticipant}
        onDelete={(postId) => {
          onDeletePost(postId);
          if (postId === expandedRootId) setExpandedRootId(null);
        }}
        onSaveEdit={onSaveEdit}
        onPosted={onRefetch}
      />
    </div>
  );
}
