import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { RankedEntry } from "./ranking";
import { TeamResult } from "./teamResultTypes";
import { evaluatePicks } from "./scoring";
import { TEAMS } from "../predictions/teams";
import { TeamCrest } from "./TeamCrest";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Frame, FrameHeader, FrameBody, FrameMeta } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ParticipantPopupProps {
  /** The clicked participant + their standing rank, or null when closed. */
  ranked: RankedEntry | null;
  results: Record<string, TeamResult>;
  /** Same gate as LeaderboardTable's hover reveal — only show pick
   *  correctness once the tournament has actually started. */
  revealCorrectness: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * The participant dossier (PAGE_BRIEFING.txt: "PARTICIPANT POPUP"), opened by
 * clicking a row on the standings frame alongside — the same surface the
 * hover-highlight already lives on, click going one level deeper than hover.
 * Composed from the leaderboard's own Frame/FrameHeader/FrameBody rather than
 * shadcn's stock dialog card, so it reads as one more frame in the bento, just
 * an overlaid one (DESIGN-SPEC §55a: match/participant detail = a big popup).
 *
 * Two sections from the original brief are deliberately not built as real
 * data here:
 *   - Quiz answers: SPEC.md §4 decided survey answers never attach to a
 *     public profile (aggregate-only), and `surveyResponses/{uid}` is
 *     owner-read-only in firestore.rules — showing another participant's
 *     answers here isn't just unbuilt, it's ruled out.
 *   - Predicted champion / ranking-over-time: genuinely no data yet (round-2
 *     bracket predictions don't exist as a feature, and standings have no
 *     historical snapshots) — shown as honest reserved sections instead of
 *     invented placeholder data, matching how the empty widget cells beside
 *     the standings frame already work.
 */
export function ParticipantPopup({
  ranked,
  results,
  revealCorrectness,
  onOpenChange,
}: ParticipantPopupProps) {
  // Keep rendering the last real participant while the dialog animates
  // closed — `ranked` goes null the instant the parent clears selection,
  // but the popup should fade out showing its own content, not an empty
  // shell (see dialog.tsx's cotton-eased exit animation).
  const [lastRanked, setLastRanked] = useState<RankedEntry | null>(null);
  useEffect(() => {
    if (ranked) setLastRanked(ranked);
  }, [ranked]);

  const displayed = ranked ?? lastRanked;
  const evaluations = displayed ? evaluatePicks(displayed.entry.ranking, results) : [];
  const correctCount = evaluations.filter((pick) => pick.correct).length;

  return (
    <Dialog open={ranked !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-2xl"
      >
        {displayed && (
          <Frame className="max-h-[min(85vh,44rem)] w-full animate-cotton-rise border-navy-line/35">
            <FrameHeader tone="navy" className="gap-4">
              <Avatar className="size-14 shrink-0 sm:size-16">
                <AvatarImage src={displayed.entry.photoURL} alt="" />
                <AvatarFallback className="bg-navy-line/40 font-mono text-sm text-navy-ink">
                  {initials(displayed.entry.firstName, displayed.entry.lastName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate font-display text-2xl font-semibold tracking-[-0.01em] text-navy-ink sm:text-3xl">
                  {displayed.entry.firstName} {displayed.entry.lastName}
                </DialogTitle>
                <DialogDescription className="mt-1 font-mono text-[0.68rem] tracking-[0.16em] text-navy-muted uppercase tnum">
                  Sıra {String(displayed.rank).padStart(2, "0")} · {displayed.entry.points} puan
                </DialogDescription>
              </div>

              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-navy-ink hover:bg-navy-line/30 hover:text-navy-ink focus-visible:outline-navy-ink"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Kapat</span>
              </DialogClose>
            </FrameHeader>

            <FrameBody className="min-h-0">
              {/* Lig Tahmini — real data: the participant's full predicted
                  order, matched against the live table once it's readable. */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-2.5 sm:px-6">
                <FrameMeta className="text-muted-foreground">Lig Tahmini</FrameMeta>
                {revealCorrectness && evaluations.length > 0 && (
                  <span className="font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground tnum">
                    {correctCount}/{evaluations.length} isabetli
                  </span>
                )}
              </div>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 sm:px-4">
                {evaluations.map(({ teamId, predictedPosition, actualPosition, correct }) => {
                  const team = TEAMS.find((t) => t.id === teamId);
                  return (
                    <div
                      key={teamId}
                      className={cn(
                        "flex items-center gap-3 border-b border-border/40 py-2 transition-colors duration-300 ease-[var(--ease-cotton)] last:border-0",
                        revealCorrectness && correct && "bg-brass/[0.10]"
                      )}
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground tnum">
                        {predictedPosition}
                      </span>
                      <TeamCrest teamId={teamId} className="size-6 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-display text-sm font-medium text-ink">
                        {team?.name ?? teamId}
                      </span>
                      {revealCorrectness && (
                        <span
                          className={cn(
                            "shrink-0 font-mono text-xs tnum",
                            correct ? "font-semibold text-brass" : "text-muted-foreground"
                          )}
                        >
                          {actualPosition ?? "–"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Şampiyon Tahmini — reserved. Round-2 (knockout bracket)
                  predictions are a separate, not-yet-open submission round
                  (SPEC.md §2/§5); honest either way, built or not. */}
              <div className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-6">
                <FrameMeta className="text-muted-foreground">Şampiyon Tahmini</FrameMeta>
                <p className="mt-1.5 font-display text-sm text-muted-foreground italic">
                  Rakip parantezi belli olmadan bilinmez.
                </p>
              </div>

              {/* Zaman İçinde Sıralama — reserved. Needs historical standing
                  snapshots that don't exist yet (SPEC.md §8d changelog). */}
              <div className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-6">
                <FrameMeta className="text-muted-foreground">Zaman İçinde Sıralama</FrameMeta>
                <p className="mt-1.5 font-display text-sm text-muted-foreground italic">
                  Yeterli maç günü tamamlanmadan gösterilmez.
                </p>
              </div>

              {displayed.entry.submittedAt && (
                <div className="shrink-0 border-t border-border/60 px-5 py-2.5 sm:px-6">
                  <p className="font-mono text-[0.65rem] tracking-[0.06em] text-muted-foreground tnum">
                    Tahmin gönderildi: {new Date(displayed.entry.submittedAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              )}
            </FrameBody>
          </Frame>
        )}
      </DialogContent>
    </Dialog>
  );
}
