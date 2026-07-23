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
  /** NumberBox big digit font size, in rem. */
  numberFontSize: number;
}

// Tuned live via StatsPageTuner.tsx and pasted back in.
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
  barFontSize: 0.62,
  barFill: "#1F8A65",
  numberFontSize: 3,
};
