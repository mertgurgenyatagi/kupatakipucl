import { MessiOrRonaldo, Device } from "./surveyTypes";
import { TEAM_BY_ID } from "./teams";

export const MESSI_RONALDO_LABEL: Record<MessiOrRonaldo, string> = {
  messi: "Messi",
  ronaldo: "Ronaldo",
  "no-opinion": "Fikrim yok",
};
export const DEVICE_LABEL: Record<Device, string> = {
  phone: "Telefon",
  desktop: "Masaüstü",
  both: "Yarı yarıya",
};

/** Every answer reads as a full sentence, even the one-word ones — appends a
 *  period unless the string already ends in sentence-ending punctuation. */
export function ensurePeriod(s: string): string {
  const trimmed = s.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** The UCL question is a crest picker (SignupFlow's UclTeamStep), so
 *  surveyResponses stores a team id — `bayern-munich`, not `Bayern Munich`.
 *  Every surface that reviewed the answer printed the raw id, under copy that
 *  invited people to type a name. Falls back to the stored value rather than
 *  blanking, so an answer naming a team that has since left the competition
 *  still reads as something. */
export function uclTeamLabel(uclTeam: string | null | undefined): string {
  if (!uclTeam) return "Yok";
  return TEAM_BY_ID[uclTeam]?.name ?? uclTeam;
}
