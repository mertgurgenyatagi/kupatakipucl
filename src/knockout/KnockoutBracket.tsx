import { RotateCcw, Trophy } from "lucide-react";
import { teamCrestSrc } from "../predictions/teams";
import { MOCK_ROUND_OF_16 } from "./mockKnockoutData";
import { KnockoutPrediction } from "./knockoutTypes";
import { useKnockoutPicks } from "./useKnockoutPicks";
import { CompactMatchBox, findTeam } from "./bracketParts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  initialPrediction?: KnockoutPrediction | null;
  onSubmit?: (data: Omit<KnockoutPrediction, "submittedAt" | "updatedAt">) => void;
  submitting?: boolean;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
  /** When true: tightens internal gaps and removes the max-width cap so the
   *  bracket fills its container. Pill sizes are unaffected. Intended for
   *  the leaderboard page where the bracket shares a 3-column row and needs
   *  to compress without growing its own match boxes. */
  compact?: boolean;
}

/**
 * Non-scrollable 2-halves symmetric bracket for ProfilePage inline editing & viewing.
 * Left half (R16, QF, SF) -> Center (Trophy & Final) <- Right half (SF, QF, R16).
 * Monochromatic styling, zero glow.
 */
export function KnockoutBracket({
  initialPrediction,
  onSubmit,
  submitting = false,
  readOnly = false,
  onSelectTeam,
  compact = false,
}: Props) {
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

  // readOnly is enforced at this boundary rather than inside the hook: the
  // hook is the rules, this component decides whether the viewer is allowed
  // to apply them.
  const handleR16Click = (i: number, teamId: string) => { if (!readOnly) pickR16(i, teamId); };
  const handleQfClick = (i: number, teamId: string) => { if (!readOnly) pickQf(i, teamId); };
  const handleSfClick = (i: number, teamId: string) => { if (!readOnly) pickSf(i, teamId); };
  const handleChampionClick = (teamId: string) => { if (!readOnly) pickChampion(teamId); };
  const handleReset = () => { if (!readOnly) reset(); };

  function handleSubmit() {
    if (readOnly || !onSubmit) return;
    const payload = toPrediction();
    if (payload) onSubmit(payload);
  }

  const lqf0h = findTeam(r16Picks[0] ?? "");
  const lqf0a = findTeam(r16Picks[1] ?? "");
  const lqf1h = findTeam(r16Picks[2] ?? "");
  const lqf1a = findTeam(r16Picks[3] ?? "");
  const lsfh = findTeam(qfPicks[0] ?? "");
  const lsfa = findTeam(qfPicks[1] ?? "");

  const rqf0h = findTeam(r16Picks[4] ?? "");
  const rqf0a = findTeam(r16Picks[5] ?? "");
  const rqf1h = findTeam(r16Picks[6] ?? "");
  const rqf1a = findTeam(r16Picks[7] ?? "");
  const rsfh = findTeam(qfPicks[2] ?? "");
  const rsfa = findTeam(qfPicks[3] ?? "");
  const fl = findTeam(sfPicks[0] ?? "");
  const fr = findTeam(sfPicks[1] ?? "");

  return (
    <div className={cn("flex h-full w-full flex-col select-none overflow-hidden", compact ? "gap-1 p-0" : "gap-3 p-1")}>
      {/* Top action bar — hidden entirely in compact+readOnly (no buttons to show,
          and the h-7 spacer eats vertical space the bracket needs). In non-compact
          or edit mode it stays so the Sıfırla/Kaydet buttons have a stable slot. */}
      {!(compact && readOnly) && (
        <div className="flex h-7 shrink-0 items-center justify-between px-1">
          {!readOnly && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="gap-1 font-mono text-xs text-color_textsecondary hover:text-color_text px-1.5 h-7"
              >
                <RotateCcw className="size-3" />
                Sıfırla
              </Button>
              <Button
                type="button"
                disabled={!isComplete || submitting}
                onClick={handleSubmit}
                className="gap-1.5 bg-color_text px-4 py-1 h-7 text-xs font-bold text-background hover:opacity-90 disabled:opacity-30"
              >
                {submitting ? "Kaydediliyor..." : "Tahmini Kaydet"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* 7-Column bracket grid. In compact mode: tighter gaps, no max-width cap. */}
      <div className={cn(
        "grid flex-1 grid-cols-7 items-center justify-center min-h-0 w-full overflow-hidden",
        compact ? "gap-1 mx-0" : "gap-2 max-w-4xl mx-auto"
      )}>
        {/* R16 Left */}
        <div className="flex h-full flex-col justify-around gap-2 items-center min-w-0">
          {MOCK_ROUND_OF_16.slice(0, 4).map((match, i) => (
            <CompactMatchBox
              key={match.homeTeamId}
              match={match}
              selectedWinner={r16Picks[i]}
              onPick={(t) => handleR16Click(i, t)}
              readOnly={readOnly}
              onSelectTeam={onSelectTeam}
            />
          ))}
        </div>

        {/* QF Left */}
        <div className="flex h-full flex-col justify-around gap-2 items-center min-w-0">
          <CompactMatchBox
            team1={lqf0h}
            team2={lqf0a}
            selectedWinner={qfPicks[0]}
            onPick={(t) => handleQfClick(0, t)}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
          <CompactMatchBox
            team1={lqf1h}
            team2={lqf1a}
            selectedWinner={qfPicks[1]}
            onPick={(t) => handleQfClick(1, t)}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
        </div>

        {/* SF Left */}
        <div className="flex h-full flex-col justify-center items-center min-w-0">
          <CompactMatchBox
            team1={lsfh}
            team2={lsfa}
            selectedWinner={sfPicks[0]}
            onPick={(t) => handleSfClick(0, t)}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
        </div>

        {/* Center: Trophy & Final */}
        <div className="flex h-full flex-col items-center justify-center gap-4 min-w-0 w-full">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full border border-color_border1/40 transition-colors duration-300",
                championPick
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "bg-card/40 text-color_textsecondary/30"
              )}
            >
              <Trophy className="size-7" />
            </div>
            {/* Fixed h-7 height prevents layout shift when champion pick updates */}
            <div className="flex h-7 items-center justify-center">
              {championPick ? (
                <div className="flex items-center gap-1.5 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 max-w-[96px] truncate">
                  <img
                    src={teamCrestSrc(championPick)}
                    alt=""
                    aria-hidden
                    className="size-[18px] object-contain shrink-0"
                  />
                  <span className="font-mono text-sm font-bold text-amber-300 truncate">
                    {findTeam(championPick)?.shortName}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-color_textsecondary/40">
                  Şampiyon
                </span>
              )}
            </div>
          </div>
          <CompactMatchBox
            isFinal
            team1={fl}
            team2={fr}
            selectedWinner={championPick}
            onPick={handleChampionClick}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
        </div>

        {/* SF Right */}
        <div className="flex h-full flex-col justify-center items-center min-w-0">
          <CompactMatchBox
            team1={rsfh}
            team2={rsfa}
            selectedWinner={sfPicks[1]}
            onPick={(t) => handleSfClick(1, t)}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
        </div>

        {/* QF Right */}
        <div className="flex h-full flex-col justify-around gap-2 items-center min-w-0">
          <CompactMatchBox
            team1={rqf0h}
            team2={rqf0a}
            selectedWinner={qfPicks[2]}
            onPick={(t) => handleQfClick(2, t)}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
          <CompactMatchBox
            team1={rqf1h}
            team2={rqf1a}
            selectedWinner={qfPicks[3]}
            onPick={(t) => handleQfClick(3, t)}
            readOnly={readOnly}
            onSelectTeam={onSelectTeam}
          />
        </div>

        {/* R16 Right */}
        <div className="flex h-full flex-col justify-around gap-2 items-center min-w-0">
          {MOCK_ROUND_OF_16.slice(4).map((match, i) => (
            <CompactMatchBox
              key={match.homeTeamId}
              match={match}
              selectedWinner={r16Picks[i + 4]}
              onPick={(t) => handleR16Click(i + 4, t)}
              readOnly={readOnly}
              onSelectTeam={onSelectTeam}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
