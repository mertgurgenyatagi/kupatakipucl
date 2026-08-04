import { memo, useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { RankedEntry } from "./ranking";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";
import { buildPlayersByUid } from "../profile/playersByUid";
import { fullName, initials } from "../profile/deletedAccount";
import { TeamResult } from "./teamResultTypes";
import { qualificationBand } from "./qualification";
import { isPickCorrect } from "./scoring";
import { computeRankHistory, RankCheckpoint } from "./rankHistory";
import { useDevMatches } from "../devpanel/useDevMatches";
import { useSurveyResponse } from "../predictions/useSurveyResponse";
import { TEAM_BY_ID } from "../predictions/teams";
import { MESSI_RONALDO_LABEL, DEVICE_LABEL, ensurePeriod } from "../predictions/surveyLabels";
import { TeamCrest } from "./TeamCrest";
import { TEAMS, teamCrestSrc } from "../predictions/teams";
import { useImagePreload } from "@/lib/useImagePreload";
import { useKnockoutPrediction } from "../knockout/useKnockoutPrediction";
import { KnockoutBracket } from "../knockout/KnockoutBracket";
import { TournamentPhase } from "../tournament/tournamentPhase";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Every call site's containing page has already preloaded the full crest
// set and every player's avatar (see the sitewide image-preload-gate spec),
// so in practice this almost always resolves instantly — this gate exists
// for correctness (a popup opened before its page's own gate somehow
// finished) rather than because it's expected to visibly stall.
const TEAM_CREST_URLS = TEAMS.map((t) => teamCrestSrc(t.id));

interface ParticipantPopupProps {
  /** The clicked participant + their standing rank, or null when closed. */
  ranked: RankedEntry | null;
  /** All participants — needed to reconstruct relative rank at each
   *  historical checkpoint (see rankHistory.ts), not just the selected one. */
  entries: LeaderboardEntry[];
  /** Needed to resolve lastName for signed-in viewers — LeaderboardEntry no
   *  longer carries it (2026-08-02 name-privacy change). */
  players: Player[];
  /** Live team results — the predictions widget shows the same O/A/Y/AV/P
   *  columns as the real team table ("identical to team table," full stop,
   *  stats included), just row-ordered by this participant's prediction
   *  instead of live position — plus a green wash on rows that are
   *  currently landing correct, same accent as the standings-hover
   *  highlight on the team table itself. */
  results: Record<string, TeamResult>;
  onOpenChange: (open: boolean) => void;
  /** Selecting a team from the predictions grid closes this popup and opens
   *  that team's own dossier (TeamPopup.tsx) — the cross-link this grid's
   *  row/crest/name click affordances were built for. */
  onSelectTeam: (teamId: string) => void;
  /** Before the tournament starts, nobody's prediction/quiz/rank-history is
   *  meaningful yet (predictions aren't even locked — PAGEMAP_SPEC §5's
   *  visibility rule keeps them hidden from everyone until they are), so
   *  every widget below shows a plain "not viewable yet" placeholder instead
   *  of fetching or rendering real content. */
  tournamentStarted: boolean;
  /** Quiz answers are the one widget here that shouldn't be visible to a
   *  logged-out viewer (predictions/rank-history stay public, same as the
   *  team table). Defaults to true since every call site but Forum's
   *  logged-out-open page is always signed-in-only. When false, the survey
   *  read is skipped entirely (matches firestore.rules' `surveyResponses`
   *  gate — signed-in only — rather than attempting a read we already know
   *  fails and showing that as an error). */
  viewerLoggedIn?: boolean;
  /** The current tournament phase — when preknockout or knockout, enables
   *  toggling between League Prediction and Knockout Prediction. */
  phase?: TournamentPhase;
}

const NOT_VIEWABLE_MESSAGE = "Turnuva başlamadan bu bilgi görüntülenemez.";

function NotViewablePlaceholder() {
  return (
    <p className="flex h-full items-center justify-center px-4 text-center font-display text-sm text-color_textsecondary italic">
      {NOT_VIEWABLE_MESSAGE}
    </p>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

// No title/label bar on any widget block (Mert's golden rule) — the
// color-distinct background + border alone marks the boundary; content
// starts with its own top padding instead of a label's.
const WIDGET_BLOCK = "flex min-h-0 flex-col rounded-xl bg-background border border-color_border1/60";

// Same shape as TeamTable's own grid ("identical to team table" — stats
// included): rank, team (crest+code), then the 5 stat columns. Narrower
// floors than TeamTable's own (this widget lives in half the popup's width,
// not half the whole page) but the same proportions.
const PRED_HEADER_CELL = "flex h-4 items-center border-b border-color_border1/60";
const PRED_GRID_COLUMNS = "auto minmax(4rem,1fr) repeat(5, 1.6rem)";
const PRED_STAT_COLUMNS: { key: keyof TeamResult; label: string; help: string }[] = [
  { key: "matchesPlayed", label: "O", help: "Oynanan maç" },
  { key: "goalsFor", label: "A", help: "Atılan gol" },
  { key: "goalsAgainst", label: "Y", help: "Yenen gol" },
  { key: "goalDifference", label: "AV", help: "Averaj" },
  { key: "points", label: "P", help: "Puan" },
];

const CHART_W = 560;
const CHART_H = 120;
const CHART_PAD_X = 28;
const CHART_PAD_Y = 22;

/** A hand-rolled sparkline (no charting dependency, matches this codebase's
 *  general "hand-roll rather than pull in a library" stance) — rank 1 plots
 *  at the top, higher fixed viewBox scaling keeps circle markers round. */
function RankHistoryChart({
  checkpoints,
  totalParticipants,
}: {
  checkpoints: RankCheckpoint[];
  totalParticipants: number;
}) {
  if (checkpoints.length < 2) {
    return (
      <p className="px-3 py-3 font-display text-sm text-color_textsecondary italic">
        Yeterli maç oynanmadan gösterilmez.
      </p>
    );
  }

  const plotW = CHART_W - CHART_PAD_X * 2;
  const plotH = CHART_H - CHART_PAD_Y * 2;
  const points = checkpoints.map((cp, i) => {
    const x = CHART_PAD_X + (i / (checkpoints.length - 1)) * plotW;
    const yFrac = totalParticipants > 1 ? (cp.rank - 1) / (totalParticipants - 1) : 0.5;
    const y = CHART_PAD_Y + yFrac * plotH;
    // Only the first point of each matchday gets an axis label — one match
    // now equals one point, and a matchday can hold several matches, so
    // labeling every point would stack "N. hafta" on top of itself.
    const showLabel = i === 0 || checkpoints[i - 1].matchday !== cp.matchday;
    return { x, y, cp, showLabel };
  });
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full px-1 py-2"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Zaman içinde sıralama: sırasıyla ${checkpoints.map((c) => `${c.matchday}. hafta sonrası ${c.rank}.`).join(", ")}`}
    >
      <polyline points={linePoints} fill="none" stroke="var(--color_accent)" strokeWidth="2" />
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <g key={p.cp.fixtureId}>
            <circle cx={p.x} cy={p.y} r={isLast ? 4.5 : 3} fill="var(--color_accent)" />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fontSize="11"
              fontFamily="var(--font-mono)"
              fontWeight={isLast ? 700 : 400}
              fill={isLast ? "var(--color_text)" : "var(--color_textsecondary)"}
            >
              {p.cp.rank}
            </text>
            {(p.showLabel || isLast) && (
              <text
                x={p.x}
                y={CHART_H - 4}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fontWeight={isLast ? 700 : 400}
                fill={isLast ? "var(--color_text)" : "var(--color_textsecondary)"}
              >
                {p.cp.matchday}. hafta
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The participant dossier (PAGE_BRIEFING.txt: "PARTICIPANT POPUP"). Compact
 * profile tab up top — background is the participant's own photo, blurred
 * and scaled up massively into an abstract color field, then darkened for
 * legibility (no per-pixel averaging: that approach silently failed for any
 * cross-origin photo without CORS headers — pravatar.cc included — since
 * reading pixel data taints the canvas; rendering a blurred/filtered *image*
 * has no such restriction). Predictions top-left and quiz answers top-right
 * (both scrollable, both their own color-distinct widget block, no title —
 * see WIDGET_BLOCK), rank-over-time full-width at the bottom. No widget
 * anywhere in this popup carries a label/title band (Mert's golden rule);
 * the background-color change against the popup's own body is the only
 * boundary marker.
 *
 * Predictions use the *exact* team-table column set (O/A/Y/AV/P), row-
 * ordered by prediction, with a green wash on rows currently landing
 * correct — the same `isPickCorrect` check and the same accent as the
 * standings-hover highlight on the real team table. Each row is clickable
 * (`onSelectTeam`) and opens that team's own dossier (TeamPopup.tsx) —
 * closing this popup, not stacking on top of it.
 *
 * Quiz answers are a real, deliberate reversal of SPEC.md §4/§8d's original
 * "survey stays aggregate-only" decision — see useSurveyResponse.ts and
 * firestore.rules for the read-access change this required (deployed
 * 2026-07-23). Still gated to signed-in viewers only (`viewerLoggedIn`,
 * relevant now that Forum opens this popup to logged-out visitors too) —
 * the read is skipped rather than attempted and shown as an error. The
 * "can't be displayed" fallback is reserved for an actual
 * read failure; a participant who simply never took the survey (every
 * seeded dummy participant, for instance) gets its own honest, distinct
 * message instead of looking like a bug.
 *
 * Rank-over-time has no real historical-snapshot data source in production
 * (results get hand-edited with no code path to snapshot through — SPEC.md
 * §7 skipped automation entirely), so it's honestly reconstructed from
 * whatever `devMatches` outcomes exist right now (see rankHistory.ts) rather
 * than invented, memoized (it replays up to 8 matchdays × ~50 participants'
 * scores — real work, and this component re-renders on every leaderboard
 * hover elsewhere on the page since it's always mounted underneath).
 * Wrapped in `memo` for the same reason: without it, hovering a standings
 * row re-renders this whole popup (and its 36-row predictions grid) even
 * while closed.
 */
export const ParticipantPopup = memo(function ParticipantPopup({
  ranked,
  entries,
  players,
  results,
  onOpenChange,
  onSelectTeam,
  tournamentStarted,
  viewerLoggedIn = true,
  phase,
}: ParticipantPopupProps) {
  const [activePredictionTab, setActivePredictionTab] = useState<"league" | "knockout">("league");

  // Keep rendering the last real participant while the dialog animates
  // closed — `ranked` goes null the instant the parent clears selection,
  // but the popup should fade out showing its own content, not an empty
  // shell (see dialog.tsx's cotton-eased exit animation).
  const [lastRanked, setLastRanked] = useState<RankedEntry | null>(null);
  useEffect(() => {
    if (ranked) setLastRanked(ranked);
  }, [ranked]);

  const displayed = ranked ?? lastRanked;
  const displayedUid = displayed?.entry.uid ?? null;

  const playersByUid = useMemo(() => buildPlayersByUid(players), [players]);
  const displayedPlayer = displayedUid
    ? { firstName: displayed!.entry.firstName, lastName: playersByUid.get(displayedUid)?.lastName }
    : null;

  const { outcomes } = useDevMatches();
  const { response: survey, loading: surveyLoading, error: surveyError } = useSurveyResponse(
    tournamentStarted && viewerLoggedIn ? displayedUid : null
  );

  const isKnockoutPhaseOrPre = phase === "preknockout" || phase === "knockout";
  const { prediction: knockoutPrediction, loading: knockoutLoading } = useKnockoutPrediction(
    isKnockoutPhaseOrPre && tournamentStarted ? displayedUid : null
  );

  const rankHistory = useMemo(
    () => (tournamentStarted && displayedUid ? computeRankHistory(displayedUid, entries, outcomes) : []),
    [tournamentStarted, displayedUid, entries, outcomes]
  );

  const popupImageUrls = useMemo(
    () => (displayed ? [displayed.entry.photoURL, ...TEAM_CREST_URLS] : []),
    [displayed]
  );
  const popupImagesReady = useImagePreload(popupImageUrls);

  return (
    <Dialog open={ranked !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-full gap-0 rounded-none bg-transparent p-0 ring-0",
          isKnockoutPhaseOrPre
            ? "max-w-[96vw] h-[94vh] max-h-[94vh] sm:max-w-[96vw]"
            : "max-w-[calc(100%-2rem)] sm:max-w-2xl"
        )}
      >
        {displayed && !popupImagesReady && (
          <Frame
            className={cn(
              "w-full animate-cotton-rise border-color_border1/35",
              isKnockoutPhaseOrPre ? "h-[94vh]" : "h-[min(85vh,44rem)]"
            )}
            aria-hidden
            data-testid="participant-popup-skeleton"
          >
            <div className="flex h-full flex-col gap-3 p-4">
              <Skeleton className="h-16 w-full shrink-0 rounded-xl" />
              <Skeleton className="min-h-0 flex-1 rounded-xl" />
            </div>
          </Frame>
        )}
        {displayed && popupImagesReady && (
          <Frame
            className={cn(
              "w-full animate-cotton-rise border-color_border1/35",
              isKnockoutPhaseOrPre ? "h-[94vh] max-h-[94vh] flex flex-col min-h-0" : "max-h-[min(85vh,44rem)]"
            )}
          >
            {/* 1. Profile tab — the participant's own photo, blurred and
                scaled up into an abstract, darkened color field. Picture +
                name on one line, rank/points (smaller) beneath. */}
            <div className="relative shrink-0 overflow-hidden px-4 py-3 sm:px-5 sm:py-4 border-b border-color_border1/30">
              <img
                src={displayed.entry.photoURL}
                alt=""
                aria-hidden
                className="absolute inset-0 -z-20 size-full scale-[5] object-cover blur-2xl brightness-50"
              />
              <div className="absolute inset-0 -z-10 bg-background/60" />

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

              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="size-12 shrink-0 sm:size-14">
                  <AvatarImage src={displayed.entry.photoURL} alt="" />
                  <AvatarFallback className="bg-color_accent/20 font-mono text-sm text-color_text">
                    {initials(displayedPlayer)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate font-display text-lg font-semibold tracking-[-0.01em] text-color_text sm:text-xl">
                    {fullName(displayedPlayer)}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {fullName(displayedPlayer)} katılımcı popup'ı: sıra,
                    puan, tahminler, anket cevapları ve zaman içindeki sıralaması.
                  </DialogDescription>

                  <div className="mt-1 flex items-baseline gap-4">
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[0.55rem] tracking-[0.18em] text-color_textsecondary uppercase">
                        Sıra
                      </span>
                      <span className="font-display text-sm leading-none font-bold text-color_accent tnum">
                        {displayed.rank}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[0.55rem] tracking-[0.18em] text-color_textsecondary uppercase">
                        Puan
                      </span>
                      <span className="font-display text-sm leading-none font-bold text-color_text tnum">
                        {displayed.entry.points}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isKnockoutPhaseOrPre ? (
              /* KNOCKOUT EXPANDED VIEW: 60% left column (predictions), 40% right column (50/50 quiz & chart) */
              <FrameBody className="min-h-0 flex-1 grid grid-cols-1 md:grid-cols-[60%_40%] gap-3 p-3 sm:p-4 overflow-hidden">
                {/* LEFT COLUMN (60% width): Predictions container alone */}
                <div className={cn(WIDGET_BLOCK, "h-full min-h-0 flex flex-col overflow-hidden")}>
                  <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2 flex flex-col">
                    {!tournamentStarted ? (
                      <NotViewablePlaceholder />
                    ) : (
                      <>
                        <div className="flex items-center gap-1 border-b border-color_border1/40 pb-2 mb-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setActivePredictionTab("league")}
                            className={cn(
                              "rounded px-2.5 py-1 font-mono text-xs font-semibold transition-all cursor-pointer",
                              activePredictionTab === "league"
                                ? "bg-color_accent text-background shadow-xs"
                                : "text-color_textsecondary hover:text-color_text"
                            )}
                          >
                            Lig Tahmini
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePredictionTab("knockout")}
                            className={cn(
                              "rounded px-2.5 py-1 font-mono text-xs font-semibold transition-all cursor-pointer",
                              activePredictionTab === "knockout"
                                ? "bg-color_accent text-background shadow-xs"
                                : "text-color_textsecondary hover:text-color_text"
                            )}
                          >
                            Eleme Tahmini
                          </button>
                        </div>

                        {activePredictionTab === "league" ? (
                          <div
                            role="table"
                            className="grid text-xs min-h-0 flex-1"
                            style={{ gridTemplateColumns: PRED_GRID_COLUMNS }}
                          >
                            <div role="rowgroup" className="contents">
                              <div role="row" className="contents">
                                <div role="columnheader" className={cn(PRED_HEADER_CELL, "pl-1")} />
                                <div
                                  role="columnheader"
                                  className={cn(
                                    PRED_HEADER_CELL,
                                    "pl-1 font-mono text-[0.55rem] tracking-[0.12em] text-color_textsecondary uppercase"
                                  )}
                                >
                                  Takım
                                </div>
                                {PRED_STAT_COLUMNS.map((col) => (
                                  <div
                                    key={col.key}
                                    role="columnheader"
                                    title={col.help}
                                    className={cn(
                                      PRED_HEADER_CELL,
                                      "justify-end pr-1 font-mono text-[0.55rem] tracking-[0.12em] text-color_textsecondary uppercase"
                                    )}
                                  >
                                    {col.label}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div role="rowgroup" className="contents">
                              {displayed.entry.ranking.map((teamId, index) => {
                                const predictedPosition = index + 1;
                                const team = TEAM_BY_ID[teamId];
                                const result = results[teamId];
                                const band = qualificationBand(predictedPosition);
                                const correct = result ? isPickCorrect(predictedPosition, result.position) : false;
                                const cell = cn(
                                  "flex items-center border-b border-color_border1/30 py-1 transition-colors duration-150 ease-[var(--ease-cotton)] group-hover:bg-color_hoverfill",
                                  correct && "bg-color_green/[0.12]"
                                );
                                const statCell = cn(cell, "justify-end pr-1");
                                return (
                                  <div
                                    key={teamId}
                                    role="row"
                                    onClick={() => onSelectTeam(teamId)}
                                    className="group contents cursor-pointer"
                                  >
                                    <div role="cell" className={cn(cell, "gap-1 pl-1")}>
                                      {band === "direct" && (
                                        <span className="h-2.5 w-1 shrink-0 rounded-r-full bg-color_accent" />
                                      )}
                                      {band === "playoff" && (
                                        <span className="h-2.5 w-1 shrink-0 rounded-r-full bg-color_qualification" />
                                      )}
                                      {band === "eliminated" && <span className="w-1 shrink-0" />}
                                      <span className="font-mono text-[0.65rem] text-color_textsecondary tnum">
                                        {predictedPosition}
                                      </span>
                                    </div>
                                    <div role="cell" className={cn(cell, "min-w-0 gap-1.5 pl-1")}>
                                      <TeamCrest teamId={teamId} className="size-5 shrink-0" />
                                      <span
                                        title={team?.name}
                                        className="min-w-0 truncate font-display text-xs font-medium text-color_text"
                                      >
                                        {team?.shortName ?? teamId}
                                      </span>
                                    </div>
                                    {PRED_STAT_COLUMNS.map((col) => (
                                      <div key={col.key} role="cell" className={statCell}>
                                        <span
                                          className={cn(
                                            "font-mono text-[0.65rem] tnum",
                                            col.key === "points"
                                              ? "font-bold text-color_text"
                                              : "text-color_textsecondary"
                                          )}
                                        >
                                          {result
                                            ? col.key === "goalDifference"
                                              ? signed(result.goalDifference)
                                              : result[col.key]
                                            : "-"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="no-scrollbar min-h-0 flex-1 overflow-auto flex items-center justify-center">
                            {knockoutLoading ? (
                              <Skeleton className="h-64 w-full rounded-xl" />
                            ) : knockoutPrediction ? (
                              <KnockoutBracket
                                initialPrediction={knockoutPrediction}
                                readOnly={true}
                                onSelectTeam={onSelectTeam}
                              />
                            ) : (
                              <p className="py-4 text-center font-display text-xs text-color_textsecondary italic">
                                Bu katılımcı henüz eleme tahmini yapmamış.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN (40% width): Split 50/50 vertically */}
                <div className="grid grid-rows-2 min-h-0 h-full gap-3 overflow-hidden">
                  <div className={cn(WIDGET_BLOCK, "min-h-0 flex flex-col overflow-hidden")}>
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {!tournamentStarted ? (
                        <NotViewablePlaceholder />
                      ) : !viewerLoggedIn ? (
                        <p className="py-2 font-display text-sm text-color_textsecondary italic">
                          Anket cevaplarını görmek için giriş yapmalısınız.
                        </p>
                      ) : survey ? (
                        <div className="flex flex-col gap-2.5">
                          {[
                            { question: "Yaşınız", answer: String(survey.age) },
                            {
                              question: "Futbol bilginizi 1-7 arası değerlendirin",
                              answer: `${survey.footballKnowledge} / 7`,
                            },
                            {
                              question: "Messi mi Ronaldo mu?",
                              answer: MESSI_RONALDO_LABEL[survey.messiOrRonaldo],
                            },
                            {
                              question: "Süper Lig'de tuttuğunuz takım",
                              answer: survey.superLigTeam,
                            },
                            {
                              question: "Tuttuğunuz bir UCL takımı var mı? (varsa yazın)",
                              answer: survey.uclTeam ?? "Yok",
                            },
                            {
                              question: "Çoğunlukla hangi cihazı kullanıyorsunuz?",
                              answer: DEVICE_LABEL[survey.device],
                            },
                          ].map((row) => (
                            <div key={row.question}>
                              <p className="font-display text-xs leading-snug font-semibold text-color_text">
                                {row.question}
                              </p>
                              <p className="mt-0.5 font-display text-xs leading-snug font-light text-color_gold italic">
                                {ensurePeriod(row.answer)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : surveyError ? (
                        <p className="py-2 font-display text-sm text-color_textsecondary italic">
                          Anket cevapları görüntülenemiyor.
                        </p>
                      ) : !surveyLoading ? (
                        <p className="py-2 font-display text-sm text-color_textsecondary italic">
                          Bu katılımcı anketi doldurmamış.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className={cn(WIDGET_BLOCK, "min-h-0 flex flex-col overflow-hidden")}>
                    {!tournamentStarted ? (
                      <NotViewablePlaceholder />
                    ) : (
                      <RankHistoryChart checkpoints={rankHistory} totalParticipants={entries.length} />
                    )}
                  </div>
                </div>
              </FrameBody>
            ) : (
              /* CLASSIC COMPACT VIEW: Non-knockout phases */
              <FrameBody className="min-h-0 gap-3 p-3 sm:p-4">
                <div className="grid h-56 min-h-0 grid-cols-2 gap-3 sm:h-64">
                  <div className={WIDGET_BLOCK}>
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {!tournamentStarted ? (
                        <NotViewablePlaceholder />
                      ) : (
                        <div
                          role="table"
                          className="grid text-xs"
                          style={{ gridTemplateColumns: PRED_GRID_COLUMNS }}
                        >
                          <div role="rowgroup" className="contents">
                            <div role="row" className="contents">
                              <div role="columnheader" className={cn(PRED_HEADER_CELL, "pl-1")} />
                              <div
                                role="columnheader"
                                className={cn(
                                  PRED_HEADER_CELL,
                                  "pl-1 font-mono text-[0.55rem] tracking-[0.12em] text-color_textsecondary uppercase"
                                )}
                              >
                                Takım
                              </div>
                              {PRED_STAT_COLUMNS.map((col) => (
                                <div
                                  key={col.key}
                                  role="columnheader"
                                  title={col.help}
                                  className={cn(
                                    PRED_HEADER_CELL,
                                    "justify-end pr-1 font-mono text-[0.55rem] tracking-[0.12em] text-color_textsecondary uppercase"
                                  )}
                                >
                                  {col.label}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div role="rowgroup" className="contents">
                            {displayed.entry.ranking.map((teamId, index) => {
                              const predictedPosition = index + 1;
                              const team = TEAM_BY_ID[teamId];
                              const result = results[teamId];
                              const band = qualificationBand(predictedPosition);
                              const correct = result ? isPickCorrect(predictedPosition, result.position) : false;
                              const cell = cn(
                                "flex items-center border-b border-color_border1/30 py-1 transition-colors duration-150 ease-[var(--ease-cotton)] group-hover:bg-color_hoverfill",
                                correct && "bg-color_green/[0.12]"
                              );
                              const statCell = cn(cell, "justify-end pr-1");
                              return (
                                <div
                                  key={teamId}
                                  role="row"
                                  onClick={() => onSelectTeam(teamId)}
                                  className="group contents cursor-pointer"
                                >
                                  <div role="cell" className={cn(cell, "gap-1 pl-1")}>
                                    {band === "direct" && (
                                      <span className="h-2.5 w-1 shrink-0 rounded-r-full bg-color_accent" />
                                    )}
                                    {band === "playoff" && (
                                      <span className="h-2.5 w-1 shrink-0 rounded-r-full bg-color_qualification" />
                                    )}
                                    {band === "eliminated" && <span className="w-1 shrink-0" />}
                                    <span className="font-mono text-[0.65rem] text-color_textsecondary tnum">
                                      {predictedPosition}
                                    </span>
                                  </div>
                                  <div role="cell" className={cn(cell, "min-w-0 gap-1.5 pl-1")}>
                                    <TeamCrest teamId={teamId} className="size-5 shrink-0" />
                                    <span
                                      title={team?.name}
                                      className="min-w-0 truncate font-display text-xs font-medium text-color_text"
                                    >
                                      {team?.shortName ?? teamId}
                                    </span>
                                  </div>
                                  {PRED_STAT_COLUMNS.map((col) => (
                                    <div key={col.key} role="cell" className={statCell}>
                                      <span
                                        className={cn(
                                          "font-mono text-[0.65rem] tnum",
                                          col.key === "points"
                                            ? "font-bold text-color_text"
                                            : "text-color_textsecondary"
                                        )}
                                      >
                                        {result
                                          ? col.key === "goalDifference"
                                            ? signed(result.goalDifference)
                                            : result[col.key]
                                          : "-"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={WIDGET_BLOCK}>
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {!tournamentStarted ? (
                        <NotViewablePlaceholder />
                      ) : !viewerLoggedIn ? (
                        <p className="py-2 font-display text-sm text-color_textsecondary italic">
                          Anket cevaplarını görmek için giriş yapmalısınız.
                        </p>
                      ) : survey ? (
                        <div className="flex flex-col gap-4">
                          {[
                            { question: "Yaşınız", answer: String(survey.age) },
                            {
                              question: "Futbol bilginizi 1-7 arası değerlendirin",
                              answer: `${survey.footballKnowledge} / 7`,
                            },
                            {
                              question: "Messi mi Ronaldo mu?",
                              answer: MESSI_RONALDO_LABEL[survey.messiOrRonaldo],
                            },
                            {
                              question: "Süper Lig'de tuttuğunuz takım",
                              answer: survey.superLigTeam,
                            },
                            {
                              question: "Tuttuğunuz bir UCL takımı var mı? (varsa yazın)",
                              answer: survey.uclTeam ?? "Yok",
                            },
                            {
                              question: "Çoğunlukla hangi cihazı kullanıyorsunuz?",
                              answer: DEVICE_LABEL[survey.device],
                            },
                          ].map((row) => (
                            <div key={row.question}>
                              <p className="font-display text-sm leading-snug font-semibold text-color_text">
                                {row.question}
                              </p>
                              <p className="mt-0.5 font-display text-sm leading-snug font-light text-color_gold italic">
                                {ensurePeriod(row.answer)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : surveyError ? (
                        <p className="py-2 font-display text-sm text-color_textsecondary italic">
                          Anket cevapları görüntülenemiyor.
                        </p>
                      ) : !surveyLoading ? (
                        <p className="py-2 font-display text-sm text-color_textsecondary italic">
                          Bu katılımcı anketi doldurmamış.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className={cn(WIDGET_BLOCK, "shrink-0", !tournamentStarted && "h-24")}>
                  {!tournamentStarted ? (
                    <NotViewablePlaceholder />
                  ) : (
                    <RankHistoryChart checkpoints={rankHistory} totalParticipants={entries.length} />
                  )}
                </div>
              </FrameBody>
            )}
          </Frame>
        )}
      </DialogContent>
    </Dialog>
  );
});
