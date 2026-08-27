import { TOURNAMENT_START_ISO } from "../home/deadlines";

/**
 * /about's content and date logic, shared by the desktop poster layout and
 * the mobile stack. Extracted when the mobile About arrived — the timeline
 * runs horizontally on desktop and vertically on a phone, but "which node is
 * the current one" is the same question either way.
 */

// Encyclopedic, not dramatic (explicit call) — a single paragraph that
// assumes no prior knowledge: what the site is, who it's for, exactly how
// scoring works, and what else the site includes beyond the prediction
// itself.
export const ESSENCE_TEXT =
  "Kupatakip, Şampiyonlar Ligi için bir tahmin oyunudur: turnuva başlamadan önce 36 takım tahmin sırasına göre dizilir ve tahmin edilen sıra gerçek sıradan en fazla iki basamak sapıyorsa o takımdan üç puan, otuz altı takımın tamamı isabetliyse toplamda yüz sekiz puan kazanılır; eleme aşamasında ise çeyrek finalistler üç, yarı finalistler dört, finalistler beş, şampiyon altı puan getirir. Puanlar tek bir puan durumu tablosunda toplanır; site ayrıca bir forum, genel ve özel lobi sohbetlerini, takım/katılımcı detay pencerelerini ve bir istatistik sayfasını içerir.";

export const CONTACT_EMAIL = "mert.gurgenyatagi@gmail.com";

// Real, fixed UEFA-format dates (the project's own hard-dates record).
// TOURNAMENT_START_ISO is the only one with a live consumer elsewhere
// (src/home/deadlines.ts). The last entry's date is a rough placeholder
// (Mert: "not important, dates will be changed anyway") — there's no real
// knockout-phase-end date fixed yet, unlike the other five.
export const KEY_DATES: { label: string; date: Date }[] = [
  { label: "Lig Tahminleri Açılır", date: new Date("2026-08-28T00:00:00+03:00") },
  { label: "Lig Tahminleri Kapanır", date: new Date(TOURNAMENT_START_ISO) },
  { label: "Lig Aşaması", date: new Date("2027-02-24T00:00:00+03:00") },
  { label: "Eleme Tahminleri Açılır", date: new Date("2027-02-25T00:00:00+03:00") },
  { label: "Eleme Tahminleri Kapanır", date: new Date("2027-03-09T00:00:00+03:00") },
  { label: "Eleme Aşaması", date: new Date("2027-06-04T00:00:00+03:00") },
  { label: "Final", date: new Date("2027-06-05T00:00:00+03:00") },
];

const TR_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export function formatChipDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${TR_MONTHS_SHORT[d.getMonth()]}`;
}

export type DateStatus = "past" | "current" | "future";

export function getDateStatus(
  date: Date,
  now: number,
  currentThreshold: number | null
): DateStatus {
  if (date.getTime() < now) return "past";
  if (currentThreshold !== null && date.getTime() === currentThreshold) return "current";
  return "future";
}

/** The timestamp of the next date that hasn't passed — the node the timeline
 *  marks as "current". Null once every date is in the past. */
export function currentThresholdFor(now: number): number | null {
  const upcoming = KEY_DATES.find((item) => item.date.getTime() >= now);
  return upcoming ? upcoming.date.getTime() : null;
}
