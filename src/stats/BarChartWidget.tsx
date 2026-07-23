import { StatsPageTuning, DEFAULT_STATS_PAGE_TUNING } from "./statsPageTuning";

export interface BarDatum {
  label: string;
  count: number;
}

export function BarChartWidget({
  label,
  bars,
  tuning,
}: {
  label: string;
  bars: BarDatum[];
  tuning?: Partial<StatsPageTuning>;
}) {
  const t: StatsPageTuning = { ...DEFAULT_STATS_PAGE_TUNING, ...tuning };
  const max = Math.max(1, ...bars.map((bar) => bar.count));
  const fontStyle = { fontSize: `${t.barFontSize}rem` };

  return (
    <div className="flex flex-col">
      <span
        className="border-b border-border/40 pb-2 font-mono tracking-[0.18em] text-muted-foreground uppercase"
        style={{ fontSize: `${t.labelFontSize}rem` }}
      >
        {label}
      </span>
      {bars.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">Henüz hesaplanabilecek veri yok.</p>
      ) : (
        <div className="flex flex-col pt-2" style={{ gap: `${t.barRowGap}rem` }}>
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span
                className="shrink-0 whitespace-nowrap font-display text-ink"
                style={fontStyle}
              >
                {bar.label}
              </span>
              <div
                className="min-w-[2rem] flex-1 rounded-sm bg-muted"
                style={{ height: `${t.barHeight}rem` }}
              >
                <div
                  className="h-full rounded-sm bg-brass"
                  style={{ width: `${(bar.count / max) * 100}%`, backgroundColor: t.barFill }}
                />
              </div>
              <span
                className="w-6 shrink-0 text-right font-mono text-muted-foreground tnum"
                style={fontStyle}
              >
                {bar.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
