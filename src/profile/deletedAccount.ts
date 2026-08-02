// A uid with no matching entry in the currently-loaded players list means
// the account behind it was deleted (deleteProfile wipes the profiles/{uid}
// doc, but old chat messages / forum posts / likes / mentions that uid made
// are left in place) — every surface that looks up an author by uid should
// render these the same way rather than leaking a raw Firebase uid or a
// generic "Bilinmeyen" that reads like a bug.
export const DELETED_ACCOUNT_LABEL = "Silindi";
export const DELETED_ACCOUNT_AVATAR = "/brand/kupatakip-logo-white.svg";

interface NamedPlayer {
  firstName: string;
  lastName?: string;
}

// `lastName` is optional here (not just on a deleted account) because a
// logged-out visitor's player data comes from `publicProfiles`, which never
// carries lastName at all (2026-08-02 — see the name-privacy design spec).
// That's a distinct case from "no player found" below, which still means a
// deleted account and still renders the Silindi label.
export function fullName(player: NamedPlayer | null | undefined): string {
  if (!player) return DELETED_ACCOUNT_LABEL;
  return player.lastName ? `${player.firstName} ${player.lastName}` : player.firstName;
}

export function firstNameOnly(player: { firstName: string } | null | undefined): string {
  return player ? player.firstName : DELETED_ACCOUNT_LABEL;
}

// Single shared home for what used to be 7 duplicated inline `initials()`
// functions across Forum/Leaderboard components (not-started-audit-style
// dedup, 2026-08-02) — duplicating it meant every copy assumed `lastName`
// was always a real string and crashed on `undefined.charAt(0)` the moment
// a logged-out-sourced player (no lastName) reached it.
export function initials(player: NamedPlayer | null | undefined): string {
  if (!player) return "?";
  const first = player.firstName.charAt(0);
  const last = player.lastName ? player.lastName.charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

export function avatarSrc(player: { photoURL: string } | null | undefined): string {
  return player ? player.photoURL : DELETED_ACCOUNT_AVATAR;
}
