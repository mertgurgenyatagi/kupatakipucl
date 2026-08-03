import { useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { TEAMS, teamCrestSrc, Team } from "../predictions/teams";
import { MOCK_ROUND_OF_16 } from "./mockKnockoutData";
import { KnockoutPrediction } from "./knockoutTypes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  initialPrediction?: KnockoutPrediction | null;
  onSubmit?: (data: Omit<KnockoutPrediction, "submittedAt" | "updatedAt">) => void;
  submitting?: boolean;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
}

function findTeam(id: string): Team | null {
  if (!id) return null;
  return (
    TEAMS.find((t) => t.id === id) ?? {
      id,
      name: id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      shortName: id.slice(0, 3).toUpperCase(),
    }
  );
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
}: Props) {
  const [r16Picks, setR16Picks] = useState<(string | null)[]>(
    () => initialPrediction?.quarterFinalists ?? Array(8).fill(null)
  );
  const [qfPicks, setQfPicks] = useState<(string | null)[]>(
    () => initialPrediction?.semiFinalists ?? Array(4).fill(null)
  );
  const [sfPicks, setSfPicks] = useState<(string | null)[]>(
    () => initialPrediction?.finalists ?? Array(2).fill(null)
  );
  const [championPick, setChampionPick] = useState<string | null>(
    () => initialPrediction?.champion ?? null
  );

  function clearDownstream(teamId: string) {
    setQfPicks((prev) => prev.map((id) => (id === teamId ? null : id)));
    setSfPicks((prev) => prev.map((id) => (id === teamId ? null : id)));
    setChampionPick((prev) => (prev === teamId ? null : prev));
  }

  function handleR16Click(i: number, teamId: string) {
    if (readOnly) return;
    const cur = r16Picks[i];
    if (cur === teamId) {
      const next = [...r16Picks];
      next[i] = null;
      setR16Picks(next);
      clearDownstream(teamId);
    } else {
      if (cur) clearDownstream(cur);
      const next = [...r16Picks];
      next[i] = teamId;
      setR16Picks(next);
    }
  }

  function handleQfClick(i: number, teamId: string) {
    if (readOnly) return;
    const cur = qfPicks[i];
    if (cur === teamId) {
      const next = [...qfPicks];
      next[i] = null;
      setQfPicks(next);
      setSfPicks((prev) => prev.map((id) => (id === teamId ? null : id)));
      if (championPick === teamId) setChampionPick(null);
    } else {
      if (cur) {
        setSfPicks((prev) => prev.map((id) => (id === cur ? null : id)));
        if (championPick === cur) setChampionPick(null);
      }
      const next = [...qfPicks];
      next[i] = teamId;
      setQfPicks(next);
    }
  }

  function handleSfClick(i: number, teamId: string) {
    if (readOnly) return;
    const cur = sfPicks[i];
    if (cur === teamId) {
      const next = [...sfPicks];
      next[i] = null;
      setSfPicks(next);
      if (championPick === teamId) setChampionPick(null);
    } else {
      if (cur && championPick === cur) setChampionPick(null);
      const next = [...sfPicks];
      next[i] = teamId;
      setSfPicks(next);
    }
  }

  function handleChampionClick(teamId: string) {
    if (readOnly) return;
    setChampionPick((prev) => (prev === teamId ? null : teamId));
  }

  function handleReset() {
    if (readOnly) return;
    setR16Picks(Array(8).fill(null));
    setQfPicks(Array(4).fill(null));
    setSfPicks(Array(2).fill(null));
    setChampionPick(null);
  }

  const isComplete =
    r16Picks.every(Boolean) &&
    qfPicks.every(Boolean) &&
    sfPicks.every(Boolean) &&
    Boolean(championPick);

  function handleSubmit() {
    if (readOnly || !isComplete || !championPick || !onSubmit) return;
    onSubmit({
      quarterFinalists: r16Picks.filter((x): x is string => Boolean(x)),
      semiFinalists: qfPicks.filter((x): x is string => Boolean(x)),
      finalists: sfPicks.filter((x): x is string => Boolean(x)),
      champion: championPick,
    });
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
    <div className="flex h-full w-full flex-col gap-3 select-none overflow-hidden p-1">
      {/* Top action bar (always occupied h-7 height so edit mode toggle never shifts layout) */}
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

      {/* Non-scrollable 7-Column Compact Grid with compressed width */}
      <div className="grid flex-1 grid-cols-7 gap-2 items-center justify-center min-h-0 w-full max-w-4xl mx-auto overflow-hidden">
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

function CompactMatchBox({
  isFinal = false,
  match,
  team1: team1Prop,
  team2: team2Prop,
  selectedWinner,
  onPick,
  readOnly = false,
  onSelectTeam,
}: {
  isFinal?: boolean;
  match?: { homeTeamId: string; awayTeamId: string };
  team1?: Team | null;
  team2?: Team | null;
  selectedWinner: string | null;
  onPick: (teamId: string) => void;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
}) {
  const team1 = match ? findTeam(match.homeTeamId) : (team1Prop ?? null);
  const team2 = match ? findTeam(match.awayTeamId) : (team2Prop ?? null);

  return (
    <div
      className={cn(
        "flex w-24 flex-col gap-1.5 rounded-xl border p-1.5 bg-card/40 min-w-0 overflow-hidden shrink-0",
        isFinal ? "border-amber-400/40 bg-amber-400/5" : "border-color_border1/30"
      )}
    >
      <CompactTeamPill
        team={team1}
        isSelected={selectedWinner === team1?.id}
        isFinal={isFinal}
        onClick={() => team1 && onPick(team1.id)}
        readOnly={readOnly}
        onSelectTeam={onSelectTeam}
      />
      <div className="h-px bg-color_border1/20" />
      <CompactTeamPill
        team={team2}
        isSelected={selectedWinner === team2?.id}
        isFinal={isFinal}
        onClick={() => team2 && onPick(team2.id)}
        readOnly={readOnly}
        onSelectTeam={onSelectTeam}
      />
    </div>
  );
}

function CompactTeamPill({
  team,
  isSelected,
  isFinal,
  onClick,
  readOnly = false,
  onSelectTeam,
}: {
  team: Team | null;
  isSelected: boolean;
  isFinal: boolean;
  onClick: () => void;
  readOnly?: boolean;
  onSelectTeam?: (teamId: string) => void;
}) {
  if (!team) {
    return (
      <div className="flex h-9 items-center justify-center rounded border border-dashed border-color_border1/20 bg-background/20 px-1 min-w-0">
        <span className="font-mono text-xs text-color_textsecondary/30 select-none">—</span>
      </div>
    );
  }

  const selectedStyle = isFinal
    ? "border-amber-400 bg-amber-400/15 text-amber-200"
    : "border-white bg-white/10 text-white font-bold";

  return (
    <button
      type="button"
      onClick={() => {
        if (readOnly) {
          if (team && onSelectTeam) {
            onSelectTeam(team.id);
          }
        } else {
          onClick();
        }
      }}
      className={cn(
        "group flex h-9 w-full items-center gap-1.5 rounded border px-2 text-left transition-colors duration-150 outline-none min-w-0 overflow-hidden cursor-pointer",
        isSelected
          ? selectedStyle
          : "border-color_border1/30 bg-card/60 text-color_textsecondary hover:border-color_border1/60 hover:text-color_text"
      )}
    >
      <img
        src={teamCrestSrc(team.id)}
        alt=""
        aria-hidden
        className="size-[18px] shrink-0 object-contain"
      />
      <span className="truncate font-mono text-sm font-semibold tracking-tight">
        {team.shortName}
      </span>
    </button>
  );
}
