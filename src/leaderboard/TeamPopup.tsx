import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { XIcon } from "lucide-react";
import { TEAM_BY_ID, teamCrestSrc } from "../predictions/teams";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";
import { getTeamDossier, TeamDossier, DossierPlayer } from "./teamDossier";
import { getTeamMatchHistory, getNextMatch, getPastMatches, ResultLetter } from "./teamMatchHistory";
import { getTeamPredictors } from "./teamPredictors";
import { useDevMatches } from "../devpanel/useDevMatches";
import { TeamCrest } from "./TeamCrest";
import { StatRow } from "./StatWidget";
import { TeamPopupTuning, DEFAULT_TEAM_POPUP_TUNING } from "./teamPopupTuning";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Frame, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeamPopupProps {
  /** The clicked team's id, or null when closed. */
  teamId: string | null;
  /** Every participant — needed to work out who predicted this team where,
   *  and where each of them stands on the real leaderboard (see
   *  teamPredictors.ts), not just to look up one of them. */
  entries: LeaderboardEntry[];
  results: Record<string, TeamResult>;
  onOpenChange: (open: boolean) => void;
  /** Selecting a predictor closes this popup and opens theirs — the two
   *  dossiers cross-link (TeamTable.tsx and ParticipantPopup.tsx's own
   *  predictions grid both already lead here via `onSelectTeam`). */
  onSelectParticipant: (uid: string) => void;
  /** Overrides for the tunable layout constants (column widths, row sizes,
   *  marker size, etc.) — defaults to the exact shipped look
   *  (DEFAULT_TEAM_POPUP_TUNING) when omitted, which is every real call
   *  site. Only TeamPopupTuner.tsx (dev-only) ever passes this, and it
   *  renders this exact component — see teamPopupTuning.ts. */
  tuning?: Partial<TeamPopupTuning>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function participantInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** "Lucas Silva" -> "L. Silva" — short enough to sit under a pitch marker
 *  without crowding its neighbors. */
function shortPlayerName(name: string): string {
  const [first, ...rest] = name.split(" ");
  return rest.length > 0 ? `${first.charAt(0)}. ${rest.join(" ")}` : name;
}

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Istanbul",
});
const TIME_FMT = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Istanbul",
});

// Copied from UpcomingMatchesDrawer.tsx's own row construct (crest-over-
// code, centered date/time, place/score on the outer edges) — Mert:
// "copy the match history part from the leaderboard page... place it
// exactly, but rework it to fit our purpose." Reworked bits: score instead
// of live table place on the edges (blank until decided), and a result dot
// swaps in for the time once a fixture is decided.
const MATCH_ROW_GRID = "1.5rem minmax(0,1fr) 4rem minmax(0,1fr) 1.5rem";

const WIDGET_BLOCK = "flex min-h-0 flex-col rounded-xl bg-background border border-border/60";

// One shared row-sizing "constant" for every list row in this popup — the
// stat lists, "who predicted this team", and match history all used to
// have their own independent row sizes; Mert: "we treat them as a single
// constant." Now driven by `TeamPopupTuning` (rowGap/rowPy/rowAvatar/
// fsName/fsValue) via inline styles rather than fixed Tailwind classes, so
// TeamPopupTuner.tsx can adjust them live — see teamPopupTuning.ts. Only
// the rank column's fixed width stays a static class; nobody's asked to
// tune that one.
const ROW_RANK_W = "w-[0.8rem]";

const RESULT_LABEL: Record<ResultLetter, string> = {
  G: "Galibiyet",
  B: "Beraberlik",
  M: "Mağlubiyet",
};
// Green for won, gray for draw, red for loss — Mert's own spec, no letter,
// just the color (the current build's lettered badge circle was dropped).
const RESULT_DOT_CLASS: Record<ResultLetter, string> = {
  G: "bg-brass",
  B: "bg-muted-foreground",
  M: "bg-destructive",
};

function ResultDot({ result }: { result: ResultLetter }) {
  return (
    <span
      role="img"
      aria-label={RESULT_LABEL[result]}
      className={cn("size-2.5 shrink-0 rounded-full", RESULT_DOT_CLASS[result])}
    />
  );
}

/** Clickable, but intentionally does nothing yet — same pattern as
 *  UpcomingMatchesDrawer.tsx: reserved for a future match-detail view. */
function handleMatchupClick() {}
function handleMatchupKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handleMatchupClick();
  }
}

/** The crest+code for one side, its own clickable target broken out of the
 *  row's big clickable zone (stops propagation) — same "one object, name
 *  underlines whenever any part of it is hovered" spec as
 *  UpcomingMatchesDrawer's own team buttons. */
function handleMatchTeamClick(e: MouseEvent) {
  e.stopPropagation();
}

/** One match row — copied from UpcomingMatchesDrawer's own construct
 *  (crest-over-code stacked, centered date/time, the whole row and each
 *  side's crest+code independently clickable) and reworked for this
 *  context: literal home/away like the source, each side's own goal tally
 *  on the outer edges instead of live-table place, and the time swaps for
 *  a result dot once the fixture is decided. */
function MatchRow({
  homeId,
  awayId,
  homeGoals,
  awayGoals,
  kickoffUtc,
  result,
  t,
}: {
  homeId: string;
  awayId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffUtc: string;
  result: ResultLetter | null;
  t: TeamPopupTuning;
}) {
  const home = TEAM_BY_ID[homeId];
  const away = TEAM_BY_ID[awayId];
  const kickoff = new Date(kickoffUtc);
  const nameStyle: CSSProperties = { fontSize: `${t.fsName}rem` };
  const crestStyle: CSSProperties = { width: `${t.rowAvatar}rem`, height: `${t.rowAvatar}rem` };
  return (
    // A div, not a <button> — a real <button> can't contain the home/away
    // crest+code buttons below (invalid nesting), same reasoning as
    // UpcomingMatchesDrawer.tsx's own match row.
    <div
      role="button"
      tabIndex={0}
      onClick={handleMatchupClick}
      onKeyDown={handleMatchupKeyDown}
      className="grid cursor-pointer items-center gap-1.5 rounded-lg px-2 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-accent focus-visible:bg-accent"
      style={{ gridTemplateColumns: MATCH_ROW_GRID, height: `${t.matchRowHeight}rem` }}
    >
      <span className="text-right font-mono text-[0.65rem] text-muted-foreground tnum">{homeGoals ?? ""}</span>
      <button
        type="button"
        onClick={handleMatchTeamClick}
        className="group flex min-w-0 cursor-pointer flex-col items-center gap-1"
      >
        <TeamCrest teamId={homeId} style={crestStyle} />
        <span className="truncate font-display font-medium text-ink group-hover:underline" style={nameStyle}>
          {home?.shortName ?? homeId}
        </span>
      </button>

      <span className="flex flex-col items-center justify-center gap-1 leading-tight">
        <span className="font-mono text-[0.65rem] text-ink tnum">{DATE_FMT.format(kickoff)}</span>
        {result ? (
          <ResultDot result={result} />
        ) : (
          <span className="font-mono text-[0.6rem] text-muted-foreground tnum">{TIME_FMT.format(kickoff)}</span>
        )}
      </span>

      <button
        type="button"
        onClick={handleMatchTeamClick}
        className="group flex min-w-0 cursor-pointer flex-col items-center gap-1"
      >
        <TeamCrest teamId={awayId} style={crestStyle} />
        <span className="truncate font-display font-medium text-ink group-hover:underline" style={nameStyle}>
          {away?.shortName ?? awayId}
        </span>
      </button>
      <span className="text-left font-mono text-[0.65rem] text-muted-foreground tnum">{awayGoals ?? ""}</span>
    </div>
  );
}

const PITCH_W = 380;
const PITCH_H = 560;
const PITCH_PAD_Y = 46;

interface PitchMarker {
  player: DossierPlayer;
  x: number;
  y: number;
}

/** A hand-rolled full pitch (no diagram library, same stance as the site's
 *  other hand-rolled SVGs) — goalkeeper nearest the bottom edge, attack
 *  nearest the top, rows spaced by the dummy formation's own line counts.
 *  Each marker is a plain solid-color dot plus the player's name underneath
 *  — no jersey numbers, no photos, no rating badges (Mert, explicit: "only
 *  have icon and name, nothing else"). */
function PitchDiagram({ dossier, t }: { dossier: TeamDossier; t: TeamPopupTuning }) {
  const outfieldLines = useMemo(() => dossier.formation.split("-").map(Number), [dossier.formation]);
  const totalLines = outfieldLines.length + 1;

  const markers = useMemo<PitchMarker[]>(() => {
    const grouped = new Map<number, DossierPlayer[]>();
    dossier.startingXI.forEach((p) => {
      const bucket = grouped.get(p.line) ?? [];
      bucket.push(p);
      grouped.set(p.line, bucket);
    });

    function yForLine(line: number): number {
      const usable = PITCH_H - PITCH_PAD_Y * 2;
      return PITCH_H - PITCH_PAD_Y - (line / (totalLines - 1)) * usable;
    }
    function xPositions(count: number): number[] {
      const pad = 50;
      const usable = PITCH_W - pad * 2;
      if (count === 1) return [PITCH_W / 2];
      return Array.from({ length: count }, (_, i) => pad + (i / (count - 1)) * usable);
    }

    return Array.from(grouped.entries()).flatMap(([line, players]) => {
      const xs = xPositions(players.length);
      const y = yForLine(line);
      return players.map((player, i) => ({ player, x: xs[i], y }));
    });
  }, [dossier.startingXI, totalLines]);

  return (
    <div className="flex min-h-0 flex-1">
      {/* `preserveAspectRatio="none"` stretches the drawing to exactly fill
          whatever box the layout hands it — no letterboxing bars down the
          sides (the previous pass locked the SVG to its own 19:28 ratio,
          which read as "not filling the widget" once the column's real
          shape didn't match). Losing the exact real-pitch proportions is
          the deliberate trade for a widget that genuinely fills its area. */}
      <svg
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        className="size-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Muhtemel 11, ${dossier.formation} dizilişi: ${dossier.startingXI.map((p) => p.name).join(", ")}`}
      >
        <rect x="0" y="0" width={PITCH_W} height={PITCH_H} fill={t.pitchFill} />
        <line
          x1="0"
          y1={PITCH_H / 2}
          x2={PITCH_W}
          y2={PITCH_H / 2}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        <circle
          cx={PITCH_W / 2}
          cy={PITCH_H / 2}
          r="42"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        {/* Top penalty + 6-yard box */}
        <rect
          x={PITCH_W / 2 - 105}
          y="0"
          width="210"
          height="85"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        <rect
          x={PITCH_W / 2 - 48}
          y="0"
          width="96"
          height="32"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        {/* Bottom penalty + 6-yard box */}
        <rect
          x={PITCH_W / 2 - 105}
          y={PITCH_H - 85}
          width="210"
          height="85"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        <rect
          x={PITCH_W / 2 - 48}
          y={PITCH_H - 32}
          width="96"
          height="32"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />

        {markers.map(({ player, x, y }, i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={t.markerRadius} fill="var(--brass)" />
            <text
              x={x}
              y={y + t.markerRadius + 16}
              textAnchor="middle"
              fontSize={t.markerFontSize}
              fontFamily="var(--font-mono)"
              fill="#EDECEC"
            >
              {shortPlayerName(player.name)}
            </text>
          </g>
        ))}

        <text
          x={PITCH_W - 8}
          y={PITCH_H - 10}
          textAnchor="end"
          fontSize="10"
          letterSpacing="1"
          fontFamily="var(--font-mono)"
          fill="rgba(255,255,255,0.7)"
        >
          {dossier.formation}
        </text>
      </svg>
    </div>
  );
}

/** One of the three ranked lists (top scorers / top assisters / top rated)
 *  — reuses StatWidget.tsx's own row shape (rank, solid-fill avatar, name,
 *  value), the shelved "best players by rating" widget from the original
 *  leaderboard brief, populated per-team here instead of from one fixed
 *  global list. */
function StatList({
  label,
  rows,
  badge,
  t,
}: {
  label: string;
  rows: StatRow[];
  badge: boolean;
  t: TeamPopupTuning;
}) {
  const rowStyle: CSSProperties = { gap: `${t.rowGap}rem`, paddingTop: `${t.rowPy}rem`, paddingBottom: `${t.rowPy}rem` };
  const avatarStyle: CSSProperties = { width: `${t.rowAvatar}rem`, height: `${t.rowAvatar}rem` };
  const avatarTextStyle: CSSProperties = { fontSize: `${(t.rowAvatar * 0.343).toFixed(3)}rem` };
  const nameStyle: CSSProperties = { fontSize: `${t.fsName}rem` };
  const valueStyle: CSSProperties = { fontSize: `${t.fsValue}rem` };
  return (
    <div className="flex h-full flex-col justify-center px-4 py-2">
      <span className="border-b border-border/40 pt-0.5 pb-2.5 font-mono text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      {rows.map((row, i) => (
        <div
          key={row.name + i}
          className="flex items-center border-b border-border/30 last:border-0"
          style={rowStyle}
        >
          <span className={cn(ROW_RANK_W, "shrink-0 font-mono text-muted-foreground tnum")} style={valueStyle}>
            {i + 1}
          </span>
          <Avatar className="shrink-0" style={avatarStyle}>
            <AvatarFallback className={cn("font-mono text-navy-ink", row.fill)} style={avatarTextStyle}>
              {initials(row.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate font-display font-medium text-ink" style={nameStyle}>
            {row.name}
          </span>
          {badge ? (
            <span
              className="shrink-0 rounded-sm bg-brass/15 px-1.5 py-0.5 font-mono font-semibold text-brass tnum"
              style={valueStyle}
            >
              {row.value}
            </span>
          ) : (
            <span className="shrink-0 font-mono font-bold text-ink tnum" style={valueStyle}>
              {row.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * The team dossier — reworked from a hand-drawn wireframe (see
 * TEAM_POPUP_QUESTIONNAIRE.md for the full 20-question spec this was built
 * from). Three columns, 3:1:1 width: the pitch diagram fills the whole
 * left column; the three ranked squad lists stack in the middle column,
 * each enlarged to a third of the height; "who predicted this team" and
 * match history stack in the right column at equal height. No photo
 * backdrop (the earlier stadium-photo version was dropped
 * in favor of the team's own crest, blurred and enlarged — same treatment,
 * different source image). No crest click-interaction either (the earlier
 * palette-flash easter egg was cut).
 *
 * Real data: live rank/points, the pitch diagram's *formation shape* is
 * dummy but every fixture in match history and every row in "who predicted
 * this team" is real. The three ranked lists (scorers/assisters/rated) and
 * the starting XI are explicit dummy data — no player-level data source
 * exists anywhere in this app yet (Mert: "there is no existing API for
 * football data wired right now... just do dummy data... use solid
 * colors" — see teamDossier.ts).
 */
export const TeamPopup = memo(function TeamPopup({
  teamId,
  entries,
  results,
  onOpenChange,
  onSelectParticipant,
  tuning,
}: TeamPopupProps) {
  const t: TeamPopupTuning = { ...DEFAULT_TEAM_POPUP_TUNING, ...tuning };

  // Same "keep showing the last real content while the exit animation
  // plays" trick as ParticipantPopup — `teamId` goes null the instant the
  // parent clears selection.
  const [lastTeamId, setLastTeamId] = useState<string | null>(null);
  useEffect(() => {
    if (teamId) setLastTeamId(teamId);
  }, [teamId]);

  const displayedId = teamId ?? lastTeamId;
  const team = displayedId ? TEAM_BY_ID[displayedId] : null;

  const { outcomes } = useDevMatches();

  const dossier = useMemo(() => (displayedId ? getTeamDossier(displayedId) : null), [displayedId]);
  const matchHistory = useMemo(
    () => (displayedId ? getTeamMatchHistory(displayedId, outcomes) : []),
    [displayedId, outcomes]
  );
  const nextMatch = useMemo(() => getNextMatch(matchHistory), [matchHistory]);
  const pastMatches = useMemo(() => getPastMatches(matchHistory), [matchHistory]);
  const predictors = useMemo(
    () => (displayedId ? getTeamPredictors(displayedId, entries, results) : []),
    [displayedId, entries, results]
  );

  const result = displayedId ? results[displayedId] : undefined;

  return (
    <Dialog open={teamId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-4xl"
      >
        {team && dossier && (
          <Frame className="max-h-[min(92vh,60rem)] w-full animate-cotton-rise border-navy-line/35">
            {/* Profile tab — the team's own crest, blurred and scaled into
                an abstract, darkened backdrop (was the stadium photo;
                dropped in favor of reusing an asset that already exists).
                Crest + name + manager left, big rank/points right. */}
            <div className="relative shrink-0 overflow-hidden px-4 py-3 sm:px-5 sm:py-4">
              <img
                src={teamCrestSrc(team.id)}
                alt=""
                aria-hidden
                className="absolute inset-0 -z-20 size-full scale-[3] object-cover blur-2xl brightness-50"
              />
              <div className="absolute inset-0 -z-10 bg-background/60" />

              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-2 right-2 text-muted-foreground hover:bg-white/10 hover:text-ink"
                  />
                }
              >
                <XIcon />
                <span className="sr-only">Kapat</span>
              </DialogClose>

              <div className="flex items-center" style={{ gap: `${t.headerGap}rem` }}>
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <TeamCrest
                    teamId={team.id}
                    style={{ width: `${t.crestSize}rem`, height: `${t.crestSize}rem` }}
                  />
                  <div className="min-w-0">
                    <DialogTitle className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl">
                      {team.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      {team.name} takım dosyası: sıra, puan, muhtemel 11, gol/asist/reyting
                      krallığı, maç geçmişi ve bu takımı tahmin eden katılımcılar.
                    </DialogDescription>
                    <p className="truncate font-display text-sm text-muted-foreground">{dossier.manager}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-baseline gap-8 sm:gap-10">
                  <span
                    aria-label={`Sıra ${result ? result.position : "belirsiz"}`}
                    className="font-display leading-none font-bold text-ink tnum"
                    style={{ fontSize: `${t.rankPtsSize}rem` }}
                  >
                    {result ? `#${result.position}` : "#-"}
                  </span>
                  <span
                    aria-label={`Puan ${result?.points ?? "belirsiz"}`}
                    className="font-display leading-none font-bold text-ink tnum"
                    style={{ fontSize: `${t.rankPtsSize}rem` }}
                  >
                    {result?.points ?? "-"}
                  </span>
                </div>
              </div>
            </div>

            <FrameBody className="no-scrollbar min-h-0 gap-3 overflow-y-auto p-3 sm:p-4">
              {/* Three full-height columns now, not two — pitch (enlarged,
                  fills the whole height), the three ranked lists (each
                  enlarged to a third of the height instead of shrink-
                  wrapping their own content), and predicted-by + match
                  history stacked in the rightmost column at equal height.
                  Width ratio 2.3:1:1.7 — started at 2:1:2, then pitch +15%
                  with the rightmost column giving up the difference so the
                  stat-list column (and the 5-part total) stay put; "increase
                  2" turned out to mean the stat-list *rows*, not the column
                  (see StatList's row sizing below) — column ratio stays a
                  pitch/rightmost trade against a fixed stat-list column;
                  then stat-list and rightmost set equal by growing the
                  stat-list column up to the rightmost column's own width
                  (not by shrinking the rightmost one), taking that width
                  back out of the pitch column. */}
              <div
                className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)]"
                style={{ gridTemplateColumns: `${t.col1}fr ${t.col2}fr ${t.col3}fr`, gap: `${t.gridGap}rem` }}
              >
                <div className={cn(WIDGET_BLOCK, "min-h-0")}>
                  <PitchDiagram dossier={dossier} t={t} />
                </div>

                <div className="flex min-h-0 flex-col gap-3">
                  <div className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}>
                    <StatList label="Gol Krallığı" rows={dossier.topScorers} badge={false} t={t} />
                  </div>
                  <div className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}>
                    <StatList label="Asist Krallığı" rows={dossier.topAssisters} badge={false} t={t} />
                  </div>
                  <div className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}>
                    <StatList label="En İyiler" rows={dossier.topRated} badge={true} t={t} />
                  </div>
                </div>

                <div className="flex min-h-0 flex-col gap-3">
                  {/* "Who predicted this team" — scrollable, sorted by
                      real leaderboard rank. */}
                  <div
                    className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}
                    title="Katılımcıların bu takım için tahmin ettiği sıralamalar, gerçek sıralamalarına göre"
                  >
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
                      {predictors.length === 0 ? (
                        <p className="px-2 py-2 font-display text-sm text-muted-foreground italic">
                          Bu takımı tahmin eden katılımcı yok.
                        </p>
                      ) : (
                        predictors.map((p) => (
                          <button
                            key={p.entry.uid}
                            type="button"
                            onClick={() => onSelectParticipant(p.entry.uid)}
                            className={cn(
                              "group flex w-full cursor-pointer items-center rounded-lg px-1.5 text-left transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-accent",
                              p.correct && "bg-brass/[0.12]"
                            )}
                            style={{ gap: `${t.rowGap}rem`, paddingTop: `${t.rowPy}rem`, paddingBottom: `${t.rowPy}rem` }}
                          >
                            <Avatar
                              className="shrink-0"
                              style={{ width: `${t.rowAvatar}rem`, height: `${t.rowAvatar}rem` }}
                            >
                              <AvatarImage src={p.entry.photoURL} alt="" />
                              <AvatarFallback
                                className="bg-secondary font-mono text-navy-text"
                                style={{ fontSize: `${(t.rowAvatar * 0.343).toFixed(3)}rem` }}
                              >
                                {participantInitials(p.entry.firstName, p.entry.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className="min-w-0 flex-1 truncate font-display font-medium text-ink group-hover:underline"
                              style={{ fontSize: `${t.fsName}rem` }}
                            >
                              {p.entry.firstName} {p.entry.lastName}
                            </span>
                            <span
                              className={cn(ROW_RANK_W, "shrink-0 text-right font-mono text-muted-foreground tnum")}
                              style={{ fontSize: `${t.fsValue}rem` }}
                            >
                              {p.predictedPosition}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Match history — next fixture pinned on top, decided
                      fixtures scrolling backward in time below it. */}
                  <div className={cn(WIDGET_BLOCK, "min-h-0 flex-1")}>
                    {nextMatch ? (
                      <div className="shrink-0 border-b border-border/40">
                        <MatchRow
                          homeId={nextMatch.home ? team.id : nextMatch.opponentId}
                          awayId={nextMatch.home ? nextMatch.opponentId : team.id}
                          homeGoals={null}
                          awayGoals={null}
                          kickoffUtc={nextMatch.kickoffUtc}
                          result={null}
                          t={t}
                        />
                      </div>
                    ) : (
                      <p className="shrink-0 px-3 py-2 font-display text-xs text-muted-foreground italic">
                        Kalan maç yok.
                      </p>
                    )}
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
                      {pastMatches.length === 0 ? (
                        <p className="px-3 py-2 font-display text-xs text-muted-foreground italic">
                          Henüz oynanmış maç yok.
                        </p>
                      ) : (
                        pastMatches.map((m) => (
                          <div key={m.fixtureId} className="border-b border-border/30 last:border-0">
                            <MatchRow
                              homeId={m.home ? team.id : m.opponentId}
                              awayId={m.home ? m.opponentId : team.id}
                              homeGoals={m.home ? m.teamGoals : m.opponentGoals}
                              awayGoals={m.home ? m.opponentGoals : m.teamGoals}
                              kickoffUtc={m.kickoffUtc}
                              result={m.result}
                              t={t}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </FrameBody>
          </Frame>
        )}
      </DialogContent>
    </Dialog>
  );
});
