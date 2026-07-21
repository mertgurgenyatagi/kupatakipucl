import { LeaderboardEntry } from "./leaderboardTypes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Frame, FrameHeader, FrameMeta } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Small companion cells to the standings frame (DESIGN-SPEC §0b, "other cells
 * we can populate with other stuff"). Both are trivially derived from the same
 * `entries` the table already has — no new queries, nothing fabricated.
 */

/** The live participant count — the single figure the old masthead hard-coded
 *  ("50 KATILIMCI") and got wrong. Now read straight off the loaded data. */
export function ParticipantCountCell({
  entries,
  className,
}: {
  entries: LeaderboardEntry[];
  className?: string;
}) {
  return (
    <Frame className={cn("animate-cotton-rise", className)}>
      <FrameHeader tone="plain">
        <FrameMeta className="text-muted-foreground">Katılımcı</FrameMeta>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brass" />
      </FrameHeader>
      <div className="flex flex-1 items-baseline gap-3 px-5 py-5 sm:px-6">
        <span className="font-display text-5xl leading-none font-semibold tracking-[-0.02em] text-navy tnum sm:text-6xl">
          {entries.length}
        </span>
        <span className="pb-1 font-mono text-[0.62rem] leading-relaxed tracking-[0.16em] text-muted-foreground uppercase">
          tahmin
          <br />
          gönderdi
        </span>
      </div>
    </Frame>
  );
}

/** The current leader — a small navy plaque (§16). Factual, not a fanfare:
 *  name and points, the way the leaderboard stays cool (§6). This is where
 *  navy takes real surface area among the smaller cells (§3, §0b). */
export function CurrentLeaderCell({
  entries,
  className,
}: {
  entries: LeaderboardEntry[];
  className?: string;
}) {
  const leader = entries[0];

  return (
    <Frame
      className={cn(
        "animate-cotton-rise border-navy-line/40 bg-navy text-navy-ink [animation-delay:80ms]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-navy-line/50 px-5 py-3.5 sm:px-6">
        <FrameMeta className="text-navy-muted">Lider</FrameMeta>
        <span className="font-mono text-[0.62rem] tracking-[0.22em] text-brass uppercase tnum">
          {leader ? "01" : "—"}
        </span>
      </div>

      {leader ? (
        <div className="flex flex-1 items-center gap-4 px-5 py-5 sm:px-6">
          <Avatar className="size-12 shrink-0 opacity-95 grayscale-[35%]">
            <AvatarImage src={leader.photoURL} alt="" />
            <AvatarFallback className="bg-navy-line/40 font-mono text-xs text-navy-ink">
              {initials(leader.firstName, leader.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-tight font-medium text-navy-ink">
              {leader.firstName} {leader.lastName}
            </p>
            <p className="mt-0.5 font-mono text-[0.72rem] tracking-[0.08em] text-navy-muted tnum">
              {leader.points} puan
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center px-5 py-5 sm:px-6">
          <p className="font-display text-lg text-navy-muted italic">
            Henüz lider yok.
          </p>
        </div>
      )}
    </Frame>
  );
}
