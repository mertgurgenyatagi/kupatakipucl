// Stands in for TeamPopup.tsx, which Mert shelved 2026-09-07 rather than
// redesign right now — see PROJECT.md §11. TeamPopup.tsx itself is left
// completely untouched: he plans to bring its squad/dossier data to life
// later via scraping automation instead of football-data.org, so the full
// implementation stays in place for that, just unrendered.
//
// Same prop shape as TeamPopup (re-exported from there) so every call site
// only needs its import path changed, not its JSX.
import { XIcon } from "lucide-react";
import { TEAM_BY_ID } from "../predictions/teams";
import { TeamPopupProps } from "./TeamPopup";
import { TeamCrest } from "./TeamCrest";
import { DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Frame } from "@/components/ui/frame";
import { Button } from "@/components/ui/button";

export function TeamPopup({ teamId, onOpenChange }: TeamPopupProps) {
  const team = teamId ? TEAM_BY_ID[teamId] : null;

  return (
    <ResponsiveDialog
      open={teamId !== null}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      desktopClassName="w-full max-w-[calc(100%-2rem)] gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-lg"
      mobileClassName="h-[50dvh] bg-transparent p-0"
    >
      {team && (
        <Frame className="relative h-full w-full animate-cotton-rise border-color_border1/35">
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 text-color_textsecondary hover:bg-color_hover/10 hover:text-color_text"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Kapat</span>
          </DialogClose>
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <TeamCrest teamId={team.id} style={{ width: "3.5rem", height: "3.5rem" }} />
            <DialogTitle className="font-display text-xl font-semibold text-color_text">
              {team.name}
            </DialogTitle>
            <DialogDescription className="font-display text-2xl text-color_textsecondary italic">
              Bu bölüm şu anda hazır değil.
            </DialogDescription>
          </div>
        </Frame>
      )}
    </ResponsiveDialog>
  );
}
