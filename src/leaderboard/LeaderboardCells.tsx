import { LeaderboardEntry } from "./leaderboardTypes";
import { initials } from "../profile/deletedAccount";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Frame, FrameHeader, FrameMeta } from "@/components/ui/frame";
import { cn } from "@/lib/utils";

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
        <FrameMeta className="text-color_textsecondary">Katılımcı</FrameMeta>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-color_accent" />
      </FrameHeader>
      <div className="flex flex-1 items-baseline gap-3 px-5 py-5 sm:px-6">
        <span className="font-display text-5xl leading-none font-semibold tracking-[-0.02em] text-color_text tnum sm:text-6xl">
          {entries.length}
        </span>
        <span className="pb-1 font-mono text-[0.62rem] leading-relaxed tracking-[0.16em] text-color_textsecondary uppercase">
          tahmin
          <br />
          gönderdi
        </span>
      </div>
    </Frame>
  );
}

/** The current leader — a small color_secondary plaque (§16). Factual, not a fanfare:
 *  name and points, the way the leaderboard stays cool (§6). This is where
 *  color_secondary takes real surface area among the smaller cells (§3, §0b). */
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
        "animate-cotton-rise border-color_border1/40 bg-color_secondary text-color_text [animation-delay:80ms]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-color_border1/50 px-5 py-3.5 sm:px-6">
        <FrameMeta className="text-color_textsecondary">Lider</FrameMeta>
        <span className="font-mono text-[0.62rem] tracking-[0.22em] text-color_accent uppercase tnum">
          {leader ? "01" : "—"}
        </span>
      </div>

      {leader ? (
        <div className="flex flex-1 items-center gap-4 px-5 py-5 sm:px-6">
          <Avatar className="size-12 shrink-0 opacity-95 grayscale-[35%]">
            <AvatarImage src={leader.photoURL} alt="" />
            <AvatarFallback className="bg-color_border1/40 font-mono text-xs text-color_text">
              {initials({ firstName: leader.firstName })}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-tight font-medium text-color_text">
              {leader.firstName}
            </p>
            <p className="mt-0.5 font-mono text-[0.72rem] tracking-[0.08em] text-color_textsecondary tnum">
              {leader.points} puan
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center px-5 py-5 sm:px-6">
          <p className="font-display text-lg text-color_textsecondary italic">
            Henüz lider yok.
          </p>
        </div>
      )}
    </Frame>
  );
}
