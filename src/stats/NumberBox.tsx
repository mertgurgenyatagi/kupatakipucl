import { StatsPageTuning, DEFAULT_STATS_PAGE_TUNING } from "./statsPageTuning";

export function NumberBox({
  label,
  value,
  tuning,
}: {
  label: string;
  value: number;
  tuning?: Partial<StatsPageTuning>;
}) {
  const t: StatsPageTuning = { ...DEFAULT_STATS_PAGE_TUNING, ...tuning };
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-6">
      <span className="font-display font-bold text-ink tnum" style={{ fontSize: `${t.numberFontSize}rem` }}>
        {value}
      </span>
      <span
        className="font-mono tracking-[0.18em] text-muted-foreground uppercase"
        style={{ fontSize: `${t.labelFontSize}rem` }}
      >
        {label}
      </span>
    </div>
  );
}
