import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LOBBY_NAME_MAX_LENGTH } from "./lobbyTypes";

/**
 * Pulled out of HomeLandingLoggedIn on 2026-08-27 so the mobile home can mount
 * the same dialog instead of a second copy of it.
 *
 * The mobile create button was inert: LoggedInHome forks to the mobile tree
 * with an early `return`, and the dialog lived past that point in the desktop
 * composition only. Pressing + flipped `createDialogOpen` and nothing rendered
 * it, so the button visibly did nothing.
 *
 * Left as a centred Dialog rather than a ResponsiveDialog on purpose: it is one
 * short text field, and the panel's own leave/delete confirmations stay
 * centred dialogs on a phone too. Only the big scrolling surfaces become
 * sheets.
 */
export function CreateLobbyDialog({
  open,
  onOpenChange,
  onCreate,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  error?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Özel Lobi</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).elements.namedItem("lobbyName") as HTMLInputElement;
            onCreate(input.value);
          }}
        >
          <input
            name="lobbyName"
            maxLength={LOBBY_NAME_MAX_LENGTH}
            placeholder="Özel lobi adı"
            className="w-full rounded-md border border-color_border1/70 bg-background px-3 py-1.5 text-sm text-color_text outline-none focus:border-color_accent"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-color_remove">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit">Oluştur</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
