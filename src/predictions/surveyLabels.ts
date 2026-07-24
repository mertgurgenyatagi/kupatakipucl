import { MessiOrRonaldo, Device } from "./surveyTypes";

export const MESSI_RONALDO_LABEL: Record<MessiOrRonaldo, string> = {
  messi: "Messi",
  ronaldo: "Ronaldo",
  "no-opinion": "Fikrim yok",
};
export const DEVICE_LABEL: Record<Device, string> = {
  phone: "Telefon",
  desktop: "Bilgisayar",
  both: "İkisi de",
};

/** Every answer reads as a full sentence, even the one-word ones — appends a
 *  period unless the string already ends in sentence-ending punctuation. */
export function ensurePeriod(s: string): string {
  const trimmed = s.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
