import { toast } from "sonner";

export function showInviteInvalidToast(): void {
  toast.error("Bu davet artık geçerli değil.", { duration: Infinity });
}

export function showLobbyCapToast(): void {
  toast.error("En fazla 3 özel lobiye katılabilirsin.", { duration: Infinity });
}
