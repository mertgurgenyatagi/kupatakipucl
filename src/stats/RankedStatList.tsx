import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { cn } from "@/lib/utils";
import { StatsPageTuning, DEFAULT_STATS_PAGE_TUNING } from "./statsPageTuning";

export interface RankedRow {
  key: string;
  name: string;
  value: string;
  /** Solid-fill color for the initials avatar. Only read when `teamId` is
   *  absent — team rows use the real crest instead. */
  fill?: string;
  teamId?: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.replace(".", "").charAt(0))
    .join("")
    .toUpperCase();
}

export function RankedStatList({
  label,
  rows,
  tuning,
}: {
  label: string;
  rows: RankedRow[];
  tuning?: Partial<StatsPageTuning>;
}) {
  const t: StatsPageTuning = { ...DEFAULT_STATS_PAGE_TUNING, ...tuning };
  const crestStyle = { width: `${t.rowAvatar}rem`, height: `${t.rowAvatar}rem` };
  const rowStyle = { paddingTop: `${t.rowPy}rem`, paddingBottom: `${t.rowPy}rem` };
  const fontStyle = { fontSize: `${t.rowFontSize}rem` };

  return (
    <div className="flex flex-col">
      <span
        className="border-b border-border/40 pb-2 font-mono tracking-[0.18em] text-muted-foreground uppercase"
        style={{ fontSize: `${t.labelFontSize}rem` }}
      >
        {label}
      </span>
      {rows.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">Henüz hesaplanabilecek veri yok.</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="flex items-center gap-3 border-b border-border/50 last:border-0"
              style={rowStyle}
            >
              <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground tnum">
                {i + 1}
              </span>
              {row.teamId ? (
                <TeamCrest teamId={row.teamId} className="shrink-0" style={crestStyle} />
              ) : (
                <Avatar className="shrink-0" style={crestStyle}>
                  <AvatarFallback className={cn("font-mono text-[0.58rem] text-navy-ink", row.fill)}>
                    {initials(row.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span
                className="min-w-0 flex-1 truncate font-display font-medium text-ink"
                style={fontStyle}
              >
                {row.name}
              </span>
              <span className="shrink-0 font-mono font-bold text-ink tnum" style={fontStyle}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
