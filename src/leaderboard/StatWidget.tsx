/** Exported for reuse by TeamPopup.tsx's own per-team scorer/assister/rating
 *  lists, and by stats/RankedStatList.tsx (src/pages/StatsPage.tsx) — same
 *  row shape (rank, solid-fill avatar, name, value), just populated
 *  differently per consumer. */
export interface StatRow {
  name: string;
  value: string;
  fill: string;
}

interface StatWidgetSpec {
  key: string;
  title: string;
  rows: StatRow[];
}

/**
 * The three stat widgets from Mert's brief — best players by rating, top
 * scorers, top assisters. There is no footballer-level data model anywhere
 * in this app (a "Player" here is a pool participant, not a footballer), so
 * these run on dummy rows (Mert: "dummy data is fine, just fill in the
 * picture frames with solid colors") — fictional names, not real
 * footballers, so nobody mistakes this for tracked data before the real
 * feed exists.
 *
 * Rendered via stats/RankedStatList.tsx, the shared ranked-list sub-widget
 * used by all 7 left-column widgets on the stats page (2026-07-23
 * redesign) — this file now holds only the shared row shape and this
 * dummy data.
 */
export const STAT_WIDGETS: StatWidgetSpec[] = [
  {
    key: "rating",
    title: "En İyiler",
    rows: [
      { name: "A. Yıldız", value: "8.7", fill: "bg-navy" },
      { name: "K. Demir", value: "8.3", fill: "bg-silver" },
      { name: "E. Kaya", value: "7.9", fill: "bg-brass" },
    ],
  },
  {
    key: "scorers",
    title: "Gol Krallığı",
    rows: [
      { name: "K. Demir", value: "11", fill: "bg-navy" },
      { name: "A. Yıldız", value: "9", fill: "bg-silver" },
      { name: "B. Aydın", value: "7", fill: "bg-brass" },
    ],
  },
  {
    key: "assists",
    title: "Asist Krallığı",
    rows: [
      { name: "M. Şahin", value: "8", fill: "bg-navy" },
      { name: "E. Kaya", value: "6", fill: "bg-silver" },
      { name: "A. Yıldız", value: "5", fill: "bg-brass" },
    ],
  },
];
