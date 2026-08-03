import { useMemo, useState } from "react";
import { useImagePreload } from "@/lib/useImagePreload";
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
import { useMyLobbies } from "../lobbies/useMyLobbies";
import { createLobby } from "../lobbies/createLobby";
import { LOBBY_MAX_OWNED, LOBBY_MAX_JOINED } from "../lobbies/lobbyTypes";
import { HomeLandingLoggedInStarted } from "./HomeLandingLoggedInStarted";
import type { Player } from "../profile/usePlayers";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { TournamentPhase } from "../tournament/tournamentPhase";

interface LoggedInHomeStartedProps {
  players: Player[];
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  phase: TournamentPhase;
}

export function LoggedInHomeStarted({ players, results, entries, phase }: LoggedInHomeStartedProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { messages, loading: messagesLoading, loadOlder, loadingOlder, hasMoreOlder } = useMessages();
  const { posts, loading: postsLoading, refetch: refetchPosts } = usePosts();
  const postImageUrls = useMemo(() => posts.map((p) => p.imageURL).filter((u): u is string => Boolean(u)), [posts]);
  const postImagesReady = useImagePreload(postImageUrls);

  usePresenceHeartbeat(user?.uid ?? null);
  const onlineCount = useOnlineCount();
  const typingUids = useTypingUsers(user?.uid ?? "");

  const { lobbies: myLobbies } = useMyLobbies(user?.uid ?? null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const ownedCount = myLobbies.filter((l) => l.createdByUid === user?.uid).length;
  const canCreateLobby = ownedCount < LOBBY_MAX_OWNED && myLobbies.length < LOBBY_MAX_JOINED;

  async function handleCreateLobby(name: string) {
    if (!user || !profile) return;
    setCreateError(null);
    try {
      await createLobby(user.uid, name, profile.firstName);
      setCreateDialogOpen(false);
    } catch (err) {
      console.error("Failed to create lobby", err);
      setCreateError("Lobi oluşturulamadı, tekrar deneyin.");
    }
  }

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

  if (!user || profileLoading || messagesLoading || postsLoading || !profile || !postImagesReady) {
    return null;
  }

  return (
    <HomeLandingLoggedInStarted
      me={{ uid: user.uid, ...profile }}
      players={players}
      results={results}
      entries={entries}
      phase={phase}
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
      canCreateLobby={canCreateLobby}
      createDialogOpen={createDialogOpen}
      onOpenCreateDialog={() => setCreateDialogOpen(true)}
      onCloseCreateDialog={() => setCreateDialogOpen(false)}
      onCreateLobby={handleCreateLobby}
      createError={createError}
    />
  );
}
