import { RotateCcw, Trophy } from "lucide-react";
import { teamCrestSrc } from "../predictions/teams";
import { MOCK_ROUND_OF_16 } from "./mockKnockoutData";
import { KnockoutPrediction } from "./knockoutTypes";
import { useKnockoutPicks } from "./useKnockoutPicks";
import { CompactMatchBox, findTeam } from "./bracketParts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The bracket, one-sided: Son 16 → Çeyrek → Yarı → Final → the trophy, left
 * to right, scrolling in both directions inside its frame.
 *
 * Desktop mirrors two halves inward toward a centre final, which works
 * because it has 1400px to spread across and both halves are legible at once.
 * On a phone that shape collapses — the two halves fight for a width neither
 * can have. Mert's wireframe says "one sided" for exactly this reason, and
 * one-sided also happens to be the shape a bracket wants when it can scroll:
 * rounds advance in the direction you swipe.
 *
 * All eight Round-of-16 boxes are the tall column that sets the track height;
 * every later round centres its boxes against the pair feeding it, which is
 * what makes the tree readable without drawing a single connector line.
 * Connectors were tried and cut — at this width they read as noise, and the
 * vertical centring already says who plays whom.
 *
 * The pick rules live in `useKnockoutPicks`, shared verbatim with the desktop
 * bracket. This file is layout only.
 */

const COLUMN_LABELS = ["Son 16", "Çeyrek", "Yarı", "Final"];

export function MobileKnockoutBracket({
  initialPrediction,
  onSubmit,
  submitting = false,
  readOnly = false,
  onSelectTeam,
}: {
  initialPrediction?: KnockoutPrediction | null;
  onSubmit?: (data: Omit<KnockoutPrediction, "submittedAt" | "updatedAt">) => void;
  submitting?: boolean;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
}) {
  const {
    r16Picks,
    qfPicks,
    sfPicks,
    championPick,
    pickR16,
    pickQf,
    pickSf,
    pickChampion,
    reset,
    isComplete,
    toPrediction,
  } = useKnockoutPicks(initialPrediction);

  function handleSubmit() {
    if (readOnly || !onSubmit) return;
    const payload = toPrediction();
    if (payload) onSubmit(payload);
  }

  // No readOnly guards on the pick handlers: CompactTeamPill already routes
  // a read-only tap to onSelectTeam instead of onPick, so these can only fire
  // in edit mode.

  return (
    <div className="flex h-full min-h-0 w-full flex-col select-none">
      {!readOnly && (
        <div className="flex shrink-0 items-center justify-between px-1 pb-2">
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className="h-8 gap-1 px-1.5 font-mono text-xs text-color_textsecondary hover:text-color_text"
          >
            <RotateCcw className="size-3" />
            Sıfırla
          </Button>
          <Button
            type="button"
            disabled={!isComplete || submitting}
            onClick={handleSubmit}
            className="h-8 gap-1.5 bg-color_text px-4 text-xs font-bold text-background hover:opacity-90 disabled:opacity-30"
          >
            {submitting ? "Kaydediliyor…" : "Tahmini Kaydet"}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="flex w-max gap-2.5 p-1">
          <BracketColumn label={COLUMN_LABELS[0]}>
            {MOCK_ROUND_OF_16.map((match, i) => (
              <CompactMatchBox
                key={match.id}
                match={match}
                selectedWinner={r16Picks[i]}
                onPick={(t) => pickR16(i, t)}
                readOnly={readOnly}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>

          <BracketColumn label={COLUMN_LABELS[1]}>
            {[0, 1, 2, 3].map((i) => (
              <CompactMatchBox
                key={i}
                team1={findTeam(r16Picks[i * 2] ?? "")}
                team2={findTeam(r16Picks[i * 2 + 1] ?? "")}
                selectedWinner={qfPicks[i]}
                onPick={(t) => pickQf(i, t)}
                readOnly={readOnly}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>

          <BracketColumn label={COLUMN_LABELS[2]}>
            {[0, 1].map((i) => (
              <CompactMatchBox
                key={i}
                team1={findTeam(qfPicks[i * 2] ?? "")}
                team2={findTeam(qfPicks[i * 2 + 1] ?? "")}
                selectedWinner={sfPicks[i]}
                onPick={(t) => pickSf(i, t)}
                readOnly={readOnly}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </BracketColumn>

          <BracketColumn label={COLUMN_LABELS[3]}>
            <CompactMatchBox
              isFinal
              team1={findTeam(sfPicks[0] ?? "")}
              team2={findTeam(sfPicks[1] ?? "")}
              selectedWinner={championPick}
              onPick={pickChampion}
              readOnly={readOnly}
              onSelectTeam={onSelectTeam}
            />
          </BracketColumn>

          {/* The trophy is its own column rather than an ornament above the
              final — on a scrolling bracket it becomes the thing you're
              swiping toward, which is the right reward for finishing. */}
          <BracketColumn label="Şampiyon">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border transition-colors duration-300",
                  championPick
                    ? "border-amber-400 bg-amber-400/10 text-amber-300"
                    : "border-color_border1/40 bg-card/40 text-color_textsecondary/30"
                )}
              >
                <Trophy className="size-6" />
              </div>
              <div className="flex h-7 items-center justify-center">
                {championPick ? (
                  <div className="flex max-w-[88px] items-center gap-1.5 truncate rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5">
                    <img
                      src={teamCrestSrc(championPick)}
                      alt=""
                      aria-hidden
                      className="size-[18px] shrink-0 object-contain"
                    />
                    <span className="truncate font-mono text-sm font-bold text-amber-300">
                      {findTeam(championPick)?.shortName}
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-[0.6rem] tracking-[0.15em] text-color_textsecondary/40 uppercase">
                    —
                  </span>
                )}
              </div>
            </div>
          </BracketColumn>
        </div>
      </div>
    </div>
  );
}

/** One round. `justify-around` is what centres each box against the pair
 *  feeding it — every column is the same height, so a column with half as
 *  many boxes lands each one exactly between its two inputs. */
function BracketColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-24 shrink-0 flex-col gap-1.5">
      <span className="shrink-0 text-center font-mono text-[0.55rem] tracking-[0.16em] text-color_textsecondary uppercase">
        {label}
      </span>
      <div className="flex flex-1 flex-col justify-around gap-2">{children}</div>
    </div>
  );
}
