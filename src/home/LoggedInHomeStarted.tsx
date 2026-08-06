import { useEffect, useMemo, useRef, useState } from "react";
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
import { useLobbyMembers } from "../lobbies/useLobbyMembers";
import { useLobbyMessages } from "../lobbies/useLobbyMessages";
import { createLobby } from "../lobbies/createLobby";
import { LOBBY_MAX_OWNED, LOBBY_MAX_JOINED } from "../lobbies/lobbyTypes";
import { HomeLandingLoggedInStarted } from "./HomeLandingLoggedInStarted";
import { useIsMobile } from "@/lib/useIsMobile";
import { useMobilePopups } from "../shell/MobilePopupHost";
import { MobileHomeStartedLoggedIn } from "./mobile/MobileHomeStartedLoggedIn";
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
  const isMobile = useIsMobile();
  const { openParticipant } = useMobilePopups();
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

  // Special-lobby scoping, same machinery the not-started Home has had since
  // the scaling branch — this page's Sohbet and mini-standings cells were
  // hardcoded to the global scope, which meant a lobby you'd created was
  // simply invisible once the tournament started.
  const [sohbetLobbyId, setSohbetLobbyId] = useState<string | null>(null);
  const [standingsLobbyId, setStandingsLobbyId] = useState<string | null>(null);
  const hasSetDefaultRef = useRef(false);

  useEffect(() => {
    if (hasSetDefaultRef.current || myLobbies.length === 0) return;
    hasSetDefaultRef.current = true;
    const mostRecent = [...myLobbies].sort((a, b) => b.myJoinedAt - a.myJoinedAt)[0];
    setSohbetLobbyId(mostRecent.id);
    setStandingsLobbyId(mostRecent.id);
  }, [myLobbies]);

  // Fall back to Genel if the selected lobby disappears (deleted, or this
  // viewer was removed from it) — useMyLobbies reflects either case live.
  useEffect(() => {
    if (sohbetLobbyId && !myLobbies.some((l) => l.id === sohbetLobbyId)) setSohbetLobbyId(null);
  }, [myLobbies, sohbetLobbyId]);
  useEffect(() => {
    if (standingsLobbyId && !myLobbies.some((l) => l.id === standingsLobbyId)) setStandingsLobbyId(null);
  }, [myLobbies, standingsLobbyId]);

  const sohbetLobbyMessages = useLobbyMessages(sohbetLobbyId);
  const sohbetLobbyMembers = useLobbyMembers(sohbetLobbyId);
  const standingsLobbyMembers = useLobbyMembers(standingsLobbyId);

  const [managingLobbyId, setManagingLobbyId] = useState<string | null>(null);
  useEffect(() => {
    if (managingLobbyId && !myLobbies.some((l) => l.id === managingLobbyId)) setManagingLobbyId(null);
  }, [myLobbies, managingLobbyId]);

  const ownedCount = myLobbies.filter((l) => l.createdByUid === user?.uid).length;
  const canCreateLobby = ownedCount < LOBBY_MAX_OWNED && myLobbies.length < LOBBY_MAX_JOINED;

  async function handleCreateLobby(name: string) {
    if (!user || !profile) return;
    setCreateError(null);
    try {
      const newId = await createLobby(user.uid, name, profile.firstName);
      setCreateDialogOpen(false);
      setSohbetLobbyId(newId);
      setStandingsLobbyId(newId);
    } catch (err) {
      console.error("Failed to create lobby", err);
      setCreateError("Lobi oluşturulamadı, tekrar deneyin.");
    }
  }

  function clearLobbyIfManaged() {
    setManagingLobbyId(null);
    if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
    if (standingsLobbyId === managingLobbyId) setStandingsLobbyId(null);
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

  // Same fork point and same reasoning as LoggedInHome's — the fetching
  // above is shared, only the layout below differs.
  if (isMobile) {
    return (
      <MobileHomeStartedLoggedIn
        me={{ uid: user.uid, ...profile }}
        players={players}
        entries={entries}
        posts={posts}
        likesByPost={likesByPost}
        onToggleLike={handleToggleLike}
        onDeletePost={handleDeletePost}
        onSaveEdit={handleSaveEdit}
        onRefetchPosts={refetchPosts}
        onSelectParticipant={openParticipant}
        phase={phase}
      />
    );
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
      myLobbies={myLobbies}
      sohbetLobbyId={sohbetLobbyId}
      onChangeSohbetLobby={setSohbetLobbyId}
      sohbetLobbyMessages={sohbetLobbyMessages}
      sohbetLobbyMembers={sohbetLobbyMembers.members}
      standingsLobbyId={standingsLobbyId}
      onChangeStandingsLobby={setStandingsLobbyId}
      standingsLobbyMembers={standingsLobbyMembers.members}
      managingLobbyId={managingLobbyId}
      onOpenLobbyManagement={setManagingLobbyId}
      onCloseLobbyManagement={() => setManagingLobbyId(null)}
      onLeftManagedLobby={clearLobbyIfManaged}
      onDeletedManagedLobby={clearLobbyIfManaged}
      canCreateLobby={canCreateLobby}
      createDialogOpen={createDialogOpen}
      onOpenCreateDialog={() => setCreateDialogOpen(true)}
      onCloseCreateDialog={() => setCreateDialogOpen(false)}
      onCreateLobby={handleCreateLobby}
      createError={createError}
    />
  );
}
