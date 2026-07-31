// src/pages/ForumPage.tsx
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { assignRanks } from "../leaderboard/ranking";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { usePosts } from "../forum/usePosts";
import { usePlayers } from "../profile/usePlayers";
import { buildLikesByPost, setPostLiked } from "../forum/postLikes";
import { deletePost } from "../forum/deletePost";
import { editPost } from "../forum/editPost";
import { resolveMentionedUids } from "../chat/chatMentions";
import { Forum } from "../forum/Forum";
import { Skeleton } from "@/components/ui/skeleton";

function ForumSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6" aria-hidden data-testid="forum-skeleton">
      <Skeleton className="h-16 w-full shrink-0 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-color_border1/60 p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-sm" />
            </div>
            <Skeleton className="h-4 w-full rounded-sm" />
            <Skeleton className="h-4 w-2/3 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForumPage() {
  const { user } = useAuth();
  const state = useVisibilityState();
  const phase = useTournamentPhase();
  const { posts, loading: postsLoading, refetch, loadOlder, hasMore } = usePosts();
  const { players, loading: playersLoading } = usePlayers();
  const { entries } = useLeaderboard();
  const { results } = useResults();

  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedParticipantUid, setSelectedParticipantUid] = useState<string | null>(null);

  const likesByPost = useMemo(() => buildLikesByPost(posts), [posts]);
  const rankedEntries = useMemo(() => assignRanks(entries), [entries]);
  const selectedRanked = rankedEntries.find((r) => r.entry.uid === selectedParticipantUid) ?? null;

  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedParticipantUid(null);
  }, []);

  async function handleToggleLike(postId: string) {
    if (!user) return;
    const uid = user.uid;
    const wasLiked = likesByPost.get(postId)?.has(uid) ?? false;
    // No manual optimistic state here: `posts` is already a live listener,
    // so Firestore's own local-write cache reflects the toggled
    // likedByUids immediately (and rolls it back on its own if the write
    // ultimately fails) — the derived `likesByPost` just follows along.
    try {
      await setPostLiked(postId, uid, !wasLiked);
    } catch (err) {
      console.error("Failed to toggle post like", err);
    }
  }

  async function handleDeletePost(postId: string) {
    setActionError(null);
    const replies = posts.filter((p) => p.parentId === postId);
    const replyIds = replies.map((p) => p.id);
    const imageURLs = [posts.find((p) => p.id === postId)?.imageURL ?? null, ...replies.map((p) => p.imageURL)];
    try {
      await deletePost(postId, replyIds, imageURLs);
      refetch();
    } catch (err) {
      console.error("Failed to delete post", err);
      setActionError("Gönderi silinemedi, tekrar deneyin.");
    }
  }

  async function handleSaveEdit(postId: string, text: string) {
    setActionError(null);
    try {
      await editPost(postId, text, resolveMentionedUids(text, players));
      refetch();
    } catch (err) {
      console.error("Failed to edit post", err);
      setActionError("Gönderi güncellenemedi, tekrar deneyin.");
    }
  }

  if (!isPageAllowed("forum", state)) {
    return (
      <div className="flex h-full flex-1 items-center px-5 sm:px-8 lg:px-12">
        <p className="font-display text-2xl text-color_textsecondary italic">
          Bu bölüm şu anda kullanılamıyor.
        </p>
      </div>
    );
  }

  if (postsLoading || playersLoading) return <ForumSkeleton />;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:min-h-0 lg:flex-1">
      <Forum
        uid={user?.uid ?? null}
        posts={posts}
        players={players}
        likesByPost={likesByPost}
        onToggleLike={handleToggleLike}
        onSelectParticipant={setSelectedParticipantUid}
        onDeletePost={handleDeletePost}
        onSaveEdit={handleSaveEdit}
        onRefetch={refetch}
        onLoadOlder={loadOlder}
        hasMoreOlder={hasMore}
        actionError={actionError}
      />
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={() => {}}
        tournamentStarted={phase !== "notstarted"}
      />
    </div>
  );
}
