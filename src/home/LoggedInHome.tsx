import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../profile/useProfile";
import { usePredictionSubmitters } from "../predictions/usePredictionSubmitters";
import { useMessages } from "../chat/useMessages";
import { usePresenceHeartbeat, useOnlineCount } from "../chat/usePresence";
import { useTypingUsers } from "../chat/useTypingStatus";
import { usePosts } from "../forum/usePosts";
import { usePostLikes, setPostLiked, LikesByPost } from "../forum/usePostLikes";
import { deletePost } from "../forum/deletePost";
import { editPost } from "../forum/editPost";
import { resolveMentionedUids } from "../chat/chatMentions";
import { HomeLandingLoggedIn } from "./HomeLandingLoggedIn";
import type { Player } from "../profile/usePlayers";

/**
 * Data-fetching wrapper around HomeLandingLoggedIn, kept as its own
 * component (rather than fetched straight in HomePage.tsx) specifically so
 * useMessages() — the one hook here gated on `request.auth != null` by
 * firestore.rules, unlike posts/predictions/profile which are public reads —
 * only ever mounts for a signed-in visitor. HomePage.tsx renders this
 * component solely on the loggedin_notstarted branch, so the other 7
 * visibility states (including every logged-out one) never trigger it.
 */
export function LoggedInHome({ players }: { players: Player[] }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { submitterUids, loading: submittersLoading } = usePredictionSubmitters();
  const { messages, loading: messagesLoading, loadOlder, loadingOlder, hasMoreOlder } = useMessages();
  const { posts, loading: postsLoading, refetch: refetchPosts } = usePosts();
  const { likesByPost: fetchedLikes, loading: likesLoading } = usePostLikes();

  usePresenceHeartbeat(user?.uid ?? null);
  const onlineCount = useOnlineCount();
  const typingUids = useTypingUsers(user?.uid ?? "");

  // A local, optimistically-mutated overlay on top of the fetched likes —
  // usePostLikes() is a one-time fetch (forum-widget-round-01 Q7: "not real
  // time at all"), so without this a like you just tapped would only show
  // up for you after the next full reload.
  const [likesByPost, setLikesByPost] = useState<LikesByPost>(new Map());
  const [likeError, setLikeError] = useState<string | null>(null);
  const [forumActionError, setForumActionError] = useState<string | null>(null);

  useEffect(() => {
    setLikesByPost(fetchedLikes);
  }, [fetchedLikes]);

  async function handleToggleLike(postId: string) {
    if (!user) return;
    const uid = user.uid;
    const wasLiked = likesByPost.get(postId)?.has(uid) ?? false;

    function applyLocally(liked: boolean) {
      setLikesByPost((prev) => {
        const next = new Map(prev);
        const uids = new Set(next.get(postId) ?? []);
        if (liked) uids.add(uid);
        else uids.delete(uid);
        next.set(postId, uids);
        return next;
      });
    }

    applyLocally(!wasLiked);
    setLikeError(null);

    try {
      await setPostLiked(postId, uid, !wasLiked);
    } catch (err) {
      console.error("Failed to toggle post like", err);
      applyLocally(wasLiked);
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

  if (!user || profileLoading || submittersLoading || messagesLoading || postsLoading || likesLoading || !profile) {
    return null;
  }

  return (
    <HomeLandingLoggedIn
      me={{ uid: user.uid, ...profile }}
      players={players}
      submitterUids={submitterUids}
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
