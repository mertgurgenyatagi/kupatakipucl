export type MessiOrRonaldo = "messi" | "ronaldo" | "no-opinion";
export type Device = "phone" | "desktop" | "both";

export interface SurveyResponse {
  age: number;
  footballKnowledge: number;
  messiOrRonaldo: MessiOrRonaldo;
  superLigTeam: string;
  uclTeam: string | null;
  device: Device;
  submittedAt: number;
}
