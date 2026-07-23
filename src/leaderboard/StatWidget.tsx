import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameMeta,
  FrameBody,
} from "@/components/ui/frame";
import { cn } from "@/lib/utils";

/** Exported for reuse by TeamPopup.tsx's own per-team scorer/assister/rating
 *  lists — same row shape (rank, solid-fill avatar, name, value), just
 *  populated per-team instead of from this file's fixed global rows. */
export interface StatRow {
  name: string;
  value: string;
  fill: string;
}

interface StatWidgetSpec {
  key: string;
  title: string;
  meta: string;
  valueTone: "badge" | "plain";
  rows: StatRow[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.replace(".", "").charAt(0))
    .join("")
    .toUpperCase();
}

/**
 * The three stat widgets from Mert's brief — best players by rating, top
 * scorers, top assisters. There is no footballer-level data model anywhere
 * in this app (a "Player" here is a pool participant, not a footballer), so
 * these run on dummy rows (Mert: "dummy data is fine, just fill in the
 * picture frames with solid colors") — fictional names, not real
 * footballers, so nobody mistakes this for tracked data before the real
 * feed exists. Modeled loosely on the reference screenshots: rank, a solid-
 * fill avatar, name, value right-aligned (no position line — Mert: "get
 * rid of position information for players in middle widgets").
 */
export const STAT_WIDGETS: StatWidgetSpec[] = [
  {
    key: "rating",
    title: "En İyiler",
    meta: "Reyting",
    valueTone: "badge",
    rows: [
      { name: "A. Yıldız", value: "8.7", fill: "bg-navy" },
      { name: "K. Demir", value: "8.3", fill: "bg-silver" },
      { name: "E. Kaya", value: "7.9", fill: "bg-brass" },
    ],
  },
  {
    key: "scorers",
    title: "Gol Krallığı",
    meta: "Goller",
    valueTone: "plain",
    rows: [
      { name: "K. Demir", value: "11", fill: "bg-navy" },
      { name: "A. Yıldız", value: "9", fill: "bg-silver" },
      { name: "B. Aydın", value: "7", fill: "bg-brass" },
    ],
  },
  {
    key: "assists",
    title: "Asist Krallığı",
    meta: "Asistler",
    valueTone: "plain",
    rows: [
      { name: "M. Şahin", value: "8", fill: "bg-navy" },
      { name: "E. Kaya", value: "6", fill: "bg-silver" },
      { name: "A. Yıldız", value: "5", fill: "bg-brass" },
    ],
  },
];

export function StatWidget({ spec, index }: { spec: StatWidgetSpec; index: number }) {
  return (
    <Frame
      data-testid="stat-widget"
      className="min-h-[128px] animate-cotton-rise border-navy-line/35 lg:h-full"
      style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
    >
      <FrameHeader tone="navy">
        <FrameTitle className="text-navy-ink">{spec.title}</FrameTitle>
        <FrameMeta className="text-navy-muted">{spec.meta}</FrameMeta>
      </FrameHeader>
      <FrameBody className="min-h-0 justify-center gap-0 px-4 py-1">
        {spec.rows.map((row, i) => (
          <div
            key={row.name + i}
            className="flex items-center gap-3 border-b border-border/50 py-1 last:border-0"
          >
            <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground tnum">
              {i + 1}
            </span>
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className={cn("font-mono text-[0.58rem] text-navy-ink", row.fill)}>
                {initials(row.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-display text-[0.8125rem] font-medium text-ink">
              {row.name}
            </span>
            {spec.valueTone === "badge" ? (
              <span className="shrink-0 rounded-sm bg-brass/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-brass tnum">
                {row.value}
              </span>
            ) : (
              <span className="shrink-0 font-mono text-[0.8125rem] font-bold text-ink tnum">
                {row.value}
              </span>
            )}
          </div>
        ))}
      </FrameBody>
    </Frame>
  );
}
