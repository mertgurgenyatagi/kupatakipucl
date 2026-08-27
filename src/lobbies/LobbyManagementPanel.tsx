// src/lobbies/LobbyManagementPanel.tsx
import { useState } from "react";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
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
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
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
      setError("Özel lobi adı güncellenemedi, tekrar deneyin.");
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
      setLeaveConfirmOpen(false);
      onOpenChange(false);
      onLeft();
    } catch (err) {
      console.error("Failed to leave lobby", err);
      setError("Özel lobiden ayrılınamadı, tekrar deneyin.");
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
      setError("Özel lobi silinemedi, tekrar deneyin.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* A bottom sheet on a phone, the same centred dialog as before on
          desktop. This panel is the only way to invite, rename, kick, leave or
          delete, and until 2026-08-27 it was never mounted on mobile at all —
          a phone user could join a lobby and then never manage or leave it.
          Sheet, not dialog, for the same reason the four popups are: at 390px
          a centred card puts its controls where a thumb can't reach.
          DialogTitle and friends still work inside it because Sheet is itself
          a DialogPrimitive.Root. */}
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        mobileClassName="gap-4 px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
          <DialogHeader>
            <DialogTitle>Özel Lobi Ayarları</DialogTitle>
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

            <ul className="flex max-h-[38dvh] flex-col gap-2 overflow-y-auto overscroll-contain">
              {members.map((member) => {
                const player = playersByUid.get(member.uid);
                return (
                  <li key={member.uid} className="flex items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={player?.photoURL} alt="" />
                      <AvatarFallback className="font-mono text-[0.6rem] text-color_textsecondary">
                        {initials(player)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm text-color_text">
                      {player ? fullName(player) : "Bilinmeyen katılımcı"}
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
            <Button type="button" variant="outline" disabled={leaving} onClick={() => setLeaveConfirmOpen(true)}>
              {leaving ? "Ayrılıyor…" : "Özel lobiden ayrıl"}
            </Button>
            {isCreator && (
              <Button type="button" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                Özel lobiyi sil
              </Button>
            )}
          </DialogFooter>
      </ResponsiveDialog>

      {/* Leaving used to fire straight off the footer button with no
          confirmation, unlike deleting — and it is just as hard to undo from
          the leaver's side, since getting back in needs a fresh invite. */}
      <Dialog open={leaveConfirmOpen} onOpenChange={(next) => !leaving && setLeaveConfirmOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Özel lobiden ayrılmak istediğine emin misin?</DialogTitle>
            <DialogDescription>
              Geri dönmek için yeni bir davet linkine ihtiyacın olur.
              {isCreator &&
                (members.length > 1
                  ? " Kurucu sen olduğun için lobi, en eski üyeye devredilecek."
                  : " Son üye sen olduğun için lobi tamamen silinecek.")}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-color_remove">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={leaving} onClick={() => setLeaveConfirmOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" variant="destructive" disabled={leaving} onClick={() => void handleLeave()}>
              {leaving ? "Ayrılıyor…" : "Evet, ayrıl"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={(next) => !deleting && setDeleteConfirmOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Özel lobiyi silmek istediğine emin misin?</DialogTitle>
            <DialogDescription>
              Bu işlem özel lobiyi ve sohbet geçmişini herkes için kalıcı olarak siler. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-color_remove">
              {error}
            </p>
          )}
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
