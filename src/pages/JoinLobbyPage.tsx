// src/pages/JoinLobbyPage.tsx
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "../profile/useProfile";
import { useMyLobbies } from "../lobbies/useMyLobbies";
import { joinLobbyViaInvite } from "../lobbies/joinLobbyViaInvite";
import { showInviteInvalidToast, showLobbyCapToast } from "../lobbies/lobbyToasts";

export function JoinLobbyPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const { lobbies, loading: lobbiesLoading } = useMyLobbies(user?.uid ?? null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (authLoading || profileLoading || lobbiesLoading) return;
    if (!user || !profile || !inviteId) {
      navigate("/", { replace: true });
      return;
    }
    attempted.current = true;

    joinLobbyViaInvite(inviteId, user.uid, profile.firstName, lobbies.length)
      .then((result) => {
        if (result.outcome === "invalid-or-expired") showInviteInvalidToast();
        if (result.outcome === "at-cap") showLobbyCapToast();
        navigate("/", { replace: true });
      })
      .catch((err) => {
        console.error("Failed to join lobby", err);
        showInviteInvalidToast();
        navigate("/", { replace: true });
      });
  }, [authLoading, profileLoading, lobbiesLoading, user, profile, lobbies.length, inviteId, navigate]);

  return null;
}
