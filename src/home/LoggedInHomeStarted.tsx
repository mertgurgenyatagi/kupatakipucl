import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../profile/useProfile";
import { useMessages } from "../chat/useMessages";
import { usePresenceHeartbeat, useOnlineCount } from "../chat/usePresence";
import { useTypingUsers } from "../chat/useTypingStatus";
import { usePosts } from "../forum/usePosts";
import { buildLikesByPost, setPostLiked } from "../forum/postLikes";
import { deletePost } from "../forum/deletePost";
import { editPost } from "../forum/editPost";
import { resolveMentionedUids } from "../chat/chatMentions";
import { HomeLandingLoggedInStarted } from "./HomeLandingLoggedInStarted";
import type { Player } from "../profile/usePlayers";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";

interface LoggedInHomeStartedProps {
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
}

/**
 * Data-fetching wrapper around HomeLandingLoggedInStarted, mirroring
 * LoggedInHome.tsx's role for the not-started page: useMessages() is
 * gated on `request.auth != null` by firestore.rules, so it must only ever
 * mount for a signed-in visitor, which HomePage.tsx guarantees by only
 * rendering this component on the loggedin_leaguephase branch. Unlike
 * LoggedInHome, this page has no Katılımcılar/lobby-switching UI at all, so
 * none of the lobby or prediction-submitter hooks are fetched here (design
 * spec 2026-08-03).
 */
export function LoggedInHomeStarted({ players, results, entries }: LoggedInHomeStartedProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { messages, loading: messagesLoading, loadOlder, loadingOlder, hasMoreOlder } = useMessages();
  const { posts, loading: postsLoading, refetch: refetchPosts } = usePosts();

  usePresenceHeartbeat(user?.uid ?? null);
  const onlineCount = useOnlineCount();
  const typingUids = useTypingUsers(user?.uid ?? "");

  const likesByPost = useMemo(() => buildLikesByPost(posts), [posts]);

  const [likeError, setLikeError] = useState<string | null>(null);
  const [forumActionError, setForumActionError] = useState<string | null>(null);

  async function handleToggleLike(postId: string) {
    if (!user) return;
    const uid = user.uid;
    const wasLiked = likesByPost.get(postId)?.has(uid) ?? false;
    setLikeError(null);
    try {
      await setPostLiked(postId, uid, !wasLiked);
    } catch (err) {
      console.error("Failed to toggle post like", err);
      setLikeError("Beğeni kaydedilemedi, tekrar deneyin.");
    }
  }

  async function handleDeletePost(postId: string) {
    setForumActionError(null);
    const replies = posts.filter((p) => p.parentId === postId);
    const replyIds = replies.map((p) => p.id);
    const imageURLs = [posts.find((p) => p.id === postId)?.imageURL ?? null, ...replies.map((p) => p.imageURL)];
    try {
      await deletePost(postId, replyIds, imageURLs);
      refetchPosts();
    } catch (err) {
      console.error("Failed to delete post", err);
      setForumActionError("Gönderi silinemedi, tekrar deneyin.");
    }
  }

  async function handleSaveEdit(postId: string, text: string) {
    setForumActionError(null);
    try {
      await editPost(postId, text, resolveMentionedUids(text, players));
      refetchPosts();
    } catch (err) {
      console.error("Failed to edit post", err);
      setForumActionError("Gönderi güncellenemedi, tekrar deneyin.");
    }
  }

  if (!user || profileLoading || messagesLoading || postsLoading || !profile) {
    return null;
  }

  return (
    <HomeLandingLoggedInStarted
      me={{ uid: user.uid, ...profile }}
      players={players}
      results={results}
      entries={entries}
      messages={messages}
      onLoadOlderMessages={loadOlder}
      loadingOlderMessages={loadingOlder}
      hasMoreOlderMessages={hasMoreOlder}
      onlineCount={onlineCount}
      typingUids={typingUids}
      posts={posts}
      likesByPost={likesByPost}
      onToggleLike={handleToggleLike}
      likeError={likeError}
      onDeletePost={handleDeletePost}
      onSaveEdit={handleSaveEdit}
      onRefetchPosts={refetchPosts}
      forumActionError={forumActionError}
    />
  );
}
