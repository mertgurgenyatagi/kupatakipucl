export interface BarDatum {
  label: string;
  count: number;
}

export function BarChartWidget({ label, bars }: { label: string; bars: BarDatum[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.count));
  return (
    <div className="flex flex-col">
      <span className="border-b border-border/40 pb-2 font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      {bars.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">Henüz hesaplanabilecek veri yok.</p>
      ) : (
        <div className="flex flex-col gap-2 pt-2">
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="shrink-0 whitespace-nowrap font-display text-[0.75rem] text-ink">
                {bar.label}
              </span>
              <div className="h-3 min-w-[2rem] flex-1 rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-brass"
                  style={{ width: `${(bar.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right font-mono text-[0.7rem] text-muted-foreground tnum">
                {bar.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
