import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamCrest } from "../leaderboard/TeamCrest";
import { cn } from "@/lib/utils";

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

export function RankedStatList({ label, rows }: { label: string; rows: RankedRow[] }) {
  return (
    <div className="flex min-h-0 flex-col">
      <span className="border-b border-border/40 pb-2 font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      {rows.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">Henüz hesaplanabilecek veri yok.</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className="flex items-center gap-3 border-b border-border/50 py-1.5 last:border-0"
            >
              <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground tnum">
                {i + 1}
              </span>
              {row.teamId ? (
                <TeamCrest teamId={row.teamId} className="size-7 shrink-0" />
              ) : (
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className={cn("font-mono text-[0.58rem] text-navy-ink", row.fill)}>
                    {initials(row.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="min-w-0 flex-1 truncate font-display text-[0.8125rem] font-medium text-ink">
                {row.name}
              </span>
              <span className="shrink-0 font-mono text-[0.8125rem] font-bold text-ink tnum">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
