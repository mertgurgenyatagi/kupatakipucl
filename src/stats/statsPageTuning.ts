/**
 * Every dimension in the stats page's widgets that's a plausible candidate
 * for live pixel-tuning, pulled into one tunable set instead of being
 * hardcoded inline — same reasoning as leaderboard/teamPopupTuning.ts.
 * DEFAULT_STATS_PAGE_TUNING is the exact current shipped look — every
 * consumer falls back to it when no `tuning` prop is passed, so ordinary
 * app usage is byte-for-byte unaffected by this existing.
 * devpanel/StatsPageTuner.tsx renders the same real components with a
 * live-editable version of this object.
 */
export interface StatsPageTuning {
  /** Gap between the two top-level frames, in rem. */
  columnGap: number;
  /** Gap between widgets inside each frame's 2-column grid, in rem. */
  widgetGap: number;
  /** Padding inside each frame's widget-grid area, in rem. */
  gridPadding: number;
  /** Shared sub-widget label font size (RankedStatList/BarChartWidget/
   *  NumberBox all read this), in rem. */
  labelFontSize: number;
  /** RankedStatList row avatar/crest size, in rem. */
  rowAvatar: number;
  /** RankedStatList row vertical padding, in rem. */
  rowPy: number;
  /** RankedStatList name/value font size, in rem. */
  rowFontSize: number;
  /** BarChartWidget bar track height, in rem. */
  barHeight: number;
  /** BarChartWidget gap between bar rows, in rem. */
  barRowGap: number;
  /** BarChartWidget bar label/count font size, in rem. */
  barFontSize: number;
  /** BarChartWidget bar fill color. */
  barFill: string;
  /** BarChartWidget label column width, as a percentage of the row's own
   *  width — fixed proportion (not auto) so every row's track shares the
   *  same reference width regardless of label length; longer labels
   *  truncate. Without this, two bars with the same count but different
   *  label lengths render at different pixel widths, since each row's
   *  flex-1 track only gets whatever space its own label didn't take. Real
   *  survey answers vary wildly in length ("Yok" vs. free-text-length joke
   *  answers), so this isn't just a theoretical case. A percentage rather
   *  than a fixed rem width on purpose: the label:track ratio should hold
   *  steady if the frame itself resizes, not just the absolute label size. */
  barLabelWidth: number;
  /** NumberBox big digit font size, in rem. */
  numberFontSize: number;
}

// Tuned live via StatsPageTuner.tsx and pasted back in. barLabelWidth is
// set here (not the literal tuned value) — its unit changed from a fixed
// rem width to a row-relative percentage in the same change that set this,
// so the previous rem-based tuned number doesn't carry over as-is.
export const DEFAULT_STATS_PAGE_TUNING: StatsPageTuning = {
  columnGap: 0.9,
  widgetGap: 1.05,
  gridPadding: 1.8,
  labelFontSize: 0.58,
  rowAvatar: 1.15,
  rowPy: 0.34,
  rowFontSize: 0.78,
  barHeight: 0.55,
  barRowGap: 0.1,
  barFontSize: 0.67,
  barFill: "#1F8A65",
  barLabelWidth: 22,
  numberFontSize: 2.7,
};
