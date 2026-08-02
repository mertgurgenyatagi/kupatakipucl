import { CSSProperties, useState } from "react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { RankHistoryPoint } from "../leaderboard/rankHistoryChart";

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 100;
const PADDING = 12;

interface RankHistoryGraphProps {
  className?: string;
  style?: CSSProperties;
  points: RankHistoryPoint[];
  maxRank: number;
  handoffMatchday: number | null;
}

/**
 * GREAT_LEAP_SPEC.md §2.7: one line, rank (not points) over time, one point
 * per matchday, continues through the knockout rounds, hover reveals the
 * exact rank, a small subtle mark at the league->bracket scoring handoff.
 * Hand-rolled SVG — no charting library in this codebase's dependency tree.
 */
export function RankHistoryGraph({ className, style, points, maxRank, handoffMatchday }: RankHistoryGraphProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const body =
    points.length === 0 ? (
      <p className="flex h-full items-center justify-center font-display text-sm text-color_textsecondary italic">
        Henüz veri yok.
      </p>
    ) : (
      (() => {
        const minMatchday = points[0].matchday;
        const maxMatchday = points[points.length - 1].matchday;
        const matchdaySpan = Math.max(1, maxMatchday - minMatchday);

        const usableWidth = VIEWBOX_WIDTH - PADDING * 2;
        const usableHeight = VIEWBOX_HEIGHT - PADDING * 2;

        function x(matchday: number): number {
          return PADDING + ((matchday - minMatchday) / matchdaySpan) * usableWidth;
        }
        // Rank 1 (best) plots at the top; maxRank (worst) at the bottom.
        function y(rank: number): number {
          const clampedMax = Math.max(maxRank, 1);
          return PADDING + ((rank - 1) / clampedMax) * usableHeight;
        }

        const linePoints = points.map((p) => `${x(p.matchday)},${y(p.rank)}`).join(" ");
        const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

        return (
          <div className="relative h-full w-full">
            <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-full w-full" preserveAspectRatio="none">
              <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
              {handoffMatchday !== null && (
                <line
                  data-testid="rank-history-handoff-mark"
                  x1={x(handoffMatchday)}
                  x2={x(handoffMatchday)}
                  y1={PADDING}
                  y2={VIEWBOX_HEIGHT - PADDING}
                  stroke="var(--color-textsecondary)"
                  strokeWidth={0.75}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
              {points.map((p, index) => (
                <circle
                  key={p.matchday}
                  data-testid="rank-history-point"
                  cx={x(p.matchday)}
                  cy={y(p.rank)}
                  r={3}
                  fill="var(--color-accent)"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>
            {hovered && (
              <div
                data-testid="rank-history-tooltip"
                className="pointer-events-none absolute top-1 left-1 rounded-md bg-color_text px-2 py-1 font-mono text-[0.65rem] text-background"
              >
                {hovered.matchday}. hafta — #{hovered.rank}
              </div>
            )}
          </div>
        );
      })()
    );

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">Sıralama Geçmişi</FrameTitle>
      </FrameHeader>
      <FrameBody className="px-4 py-3">{body}</FrameBody>
    </Frame>
  );
}
