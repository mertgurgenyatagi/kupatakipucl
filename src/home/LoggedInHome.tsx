import { useEffect, useRef, useState } from "react";
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
import { useMyLobbies } from "../lobbies/useMyLobbies";
import { useLobbyMembers } from "../lobbies/useLobbyMembers";
import { useLobbyMessages } from "../lobbies/useLobbyMessages";
import { createLobby } from "../lobbies/createLobby";
import { LOBBY_MAX_OWNED, LOBBY_MAX_JOINED } from "../lobbies/lobbyTypes";
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

  const { lobbies: myLobbies } = useMyLobbies(user?.uid ?? null);

  const [sohbetLobbyId, setSohbetLobbyId] = useState<string | null>(null);
  const [katilimcilarLobbyId, setKatilimcilarLobbyId] = useState<string | null>(null);
  const hasSetDefaultRef = useRef(false);

  useEffect(() => {
    if (hasSetDefaultRef.current || myLobbies.length === 0) return;
    hasSetDefaultRef.current = true;
    const mostRecent = [...myLobbies].sort((a, b) => b.myJoinedAt - a.myJoinedAt)[0];
    setSohbetLobbyId(mostRecent.id);
    setKatilimcilarLobbyId(mostRecent.id);
  }, [myLobbies]);

  // Fallback to Genel if the currently-selected lobby disappears (deleted,
  // or this viewer was removed from it) — useMyLobbies() reflects either
  // case live, so this just has to notice the id it was pointing at is gone.
  useEffect(() => {
    if (sohbetLobbyId && !myLobbies.some((l) => l.id === sohbetLobbyId)) setSohbetLobbyId(null);
  }, [myLobbies, sohbetLobbyId]);
  useEffect(() => {
    if (katilimcilarLobbyId && !myLobbies.some((l) => l.id === katilimcilarLobbyId)) setKatilimcilarLobbyId(null);
  }, [myLobbies, katilimcilarLobbyId]);

  const sohbetLobbyMessages = useLobbyMessages(sohbetLobbyId);
  const sohbetLobbyMembers = useLobbyMembers(sohbetLobbyId);
  const katilimcilarLobbyMembers = useLobbyMembers(katilimcilarLobbyId);

  const [managingLobbyId, setManagingLobbyId] = useState<string | null>(null);

  // Same fallback as the two above, for the management panel. It can't be
  // left to LobbyManagementPanel's own onDeleted/onLeft callbacks: those only
  // fire once the delete/leave promise resolves (server ack), while Firestore
  // emits the local snapshot as soon as the write applies locally — in that
  // gap HomeLandingLoggedIn would look up a lobby that's already gone. And
  // neither callback exists at all for the cases this viewer didn't trigger:
  // another member removing you, or the creator deleting the lobby, while
  // your panel happens to be open (2026-07-30, final-review fix).
  useEffect(() => {
    if (managingLobbyId && !myLobbies.some((l) => l.id === managingLobbyId)) setManagingLobbyId(null);
  }, [myLobbies, managingLobbyId]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canCreateLobby =
    myLobbies.filter((l) => l.createdByUid === (user?.uid ?? "")).length < LOBBY_MAX_OWNED &&
    myLobbies.length < LOBBY_MAX_JOINED;

  async function handleCreateLobby(newLobbyName: string) {
    if (!user || !profile) return;
    setCreateError(null);
    try {
      const newId = await createLobby(user.uid, newLobbyName, profile.firstName);
      setCreateDialogOpen(false);
      setSohbetLobbyId(newId);
      setKatilimcilarLobbyId(newId);
    } catch (err) {
      console.error("Failed to create lobby", err);
      setCreateError("Grup oluşturulamadı, tekrar deneyin.");
    }
  }

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
      myLobbies={myLobbies}
      sohbetLobbyId={sohbetLobbyId}
      onChangeSohbetLobby={setSohbetLobbyId}
      sohbetLobbyMessages={sohbetLobbyMessages}
      sohbetLobbyMembers={sohbetLobbyMembers.members}
      katilimcilarLobbyId={katilimcilarLobbyId}
      onChangeKatilimcilarLobby={setKatilimcilarLobbyId}
      katilimcilarLobbyMembers={katilimcilarLobbyMembers.members}
      managingLobbyId={managingLobbyId}
      onOpenLobbyManagement={setManagingLobbyId}
      onCloseLobbyManagement={() => setManagingLobbyId(null)}
      onLeftManagedLobby={() => {
        setManagingLobbyId(null);
        if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
        if (katilimcilarLobbyId === managingLobbyId) setKatilimcilarLobbyId(null);
      }}
      onDeletedManagedLobby={() => {
        setManagingLobbyId(null);
        if (sohbetLobbyId === managingLobbyId) setSohbetLobbyId(null);
        if (katilimcilarLobbyId === managingLobbyId) setKatilimcilarLobbyId(null);
      }}
      canCreateLobby={canCreateLobby}
      createDialogOpen={createDialogOpen}
      onOpenCreateDialog={() => setCreateDialogOpen(true)}
      onCloseCreateDialog={() => setCreateDialogOpen(false)}
      onCreateLobby={handleCreateLobby}
      createError={createError}
    />
  );
}
