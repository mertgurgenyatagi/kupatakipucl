// src/lobbies/LobbyManagementPanel.tsx
import { useState } from "react";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { LobbyMember, LobbyWithId, LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";
import { renameLobby } from "./renameLobby";
import { generateLobbyInvite } from "./generateLobbyInvite";
import { leaveLobby } from "./leaveLobby";
import { removeMember } from "./removeMember";
import { deleteLobby } from "./deleteLobby";

interface LobbyManagementPanelProps {
  lobby: LobbyWithId;
  members: LobbyMember[];
  players: Player[];
  myUid: string;
  myFirstName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
  onDeleted: () => void;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function LobbyManagementPanel({
  lobby,
  members,
  players,
  myUid,
  myFirstName,
  open,
  onOpenChange,
  onLeft,
  onDeleted,
}: LobbyManagementPanelProps) {
  const [name, setName] = useState(lobby.name);
  const [savingName, setSavingName] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playersByUid = buildPlayersByUid(players);
  const isCreator = lobby.createdByUid === myUid;

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === lobby.name) return;
    setSavingName(true);
    setError(null);
    try {
      await renameLobby(lobby.id, myUid, myFirstName, trimmed);
    } catch (err) {
      console.error("Failed to rename lobby", err);
      setError("Grup adı güncellenemedi, tekrar deneyin.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true);
    setError(null);
    try {
      const inviteId = await generateLobbyInvite(lobby.id, myUid);
      setInviteUrl(`${window.location.origin}${window.location.pathname}#/join/${inviteId}`);
    } catch (err) {
      console.error("Failed to generate lobby invite", err);
      setError("Davet linki oluşturulamadı, tekrar deneyin.");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    setError(null);
    try {
      const remaining = members.filter((m) => m.uid !== myUid);
      await leaveLobby(lobby, myUid, myFirstName, remaining);
      onOpenChange(false);
      onLeft();
    } catch (err) {
      console.error("Failed to leave lobby", err);
      setError("Gruptan ayrılınamadı, tekrar deneyin.");
      setLeaving(false);
    }
  }

  async function handleRemove(member: LobbyMember) {
    setError(null);
    try {
      const removedPlayer = playersByUid.get(member.uid);
      await removeMember(lobby.id, myUid, member.uid, removedPlayer?.firstName ?? "Katılımcı");
    } catch (err) {
      console.error("Failed to remove member", err);
      setError("Katılımcı çıkarılamadı, tekrar deneyin.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteLobby(lobby.id);
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      console.error("Failed to delete lobby", err);
      setError("Grup silinemedi, tekrar deneyin.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grup Ayarları</DialogTitle>
            <DialogDescription>Kuran: {playersByUid.get(lobby.createdByUid)?.firstName ?? "Bilinmiyor"}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              maxLength={LOBBY_NAME_MAX_LENGTH}
              disabled={savingName}
              className="min-w-0 flex-1 rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-sm text-color_text outline-none focus:border-color_accent"
            />

            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="outline" disabled={generatingInvite} onClick={() => void handleGenerateInvite()}>
                {generatingInvite ? "Oluşturuluyor…" : "Davet linki oluştur"}
              </Button>
              {inviteUrl && (
                <input
                  readOnly
                  value={inviteUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-xs text-color_textsecondary outline-none"
                />
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {members.map((member) => {
                const player = playersByUid.get(member.uid);
                return (
                  <li key={member.uid} className="flex items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={player?.photoURL} alt="" />
                      <AvatarFallback className="font-mono text-[0.6rem] text-color_textsecondary">
                        {player ? initials(player.firstName, player.lastName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm text-color_text">
                      {player ? `${player.firstName} ${player.lastName}` : "Bilinmeyen katılımcı"}
                    </span>
                    {member.uid === lobby.createdByUid && (
                      <Crown className="size-3.5 shrink-0 text-color_gold" aria-label="Kurucu" />
                    )}
                    {isCreator && member.uid !== myUid && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemove(member)}>
                        Çıkar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && (
              <p role="alert" className="text-sm text-color_remove">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={leaving} onClick={() => void handleLeave()}>
              {leaving ? "Ayrılıyor…" : "Gruptan ayrıl"}
            </Button>
            {isCreator && (
              <Button type="button" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                Grubu sil
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={(next) => !deleting && setDeleteConfirmOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grubu silmek istediğine emin misin?</DialogTitle>
            <DialogDescription>
              Bu işlem grubu ve sohbet geçmişini herkes için kalıcı olarak siler. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? "Siliniyor…" : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
