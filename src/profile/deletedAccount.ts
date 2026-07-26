// A uid with no matching entry in the currently-loaded players list means
// the account behind it was deleted (deleteProfile wipes the profiles/{uid}
// doc, but old chat messages / forum posts / likes / mentions that uid made
// are left in place) — every surface that looks up an author by uid should
// render these the same way rather than leaking a raw Firebase uid or a
// generic "Bilinmeyen" that reads like a bug.
export const DELETED_ACCOUNT_LABEL = "Silindi";
export const DELETED_ACCOUNT_AVATAR = "/brand/kupatakip-logo-white.svg";

export function fullName(player: { firstName: string; lastName: string } | null | undefined): string {
  return player ? `${player.firstName} ${player.lastName}` : DELETED_ACCOUNT_LABEL;
}

export function firstNameOnly(player: { firstName: string } | null | undefined): string {
  return player ? player.firstName : DELETED_ACCOUNT_LABEL;
}

export function avatarSrc(player: { photoURL: string } | null | undefined): string {
  return player ? player.photoURL : DELETED_ACCOUNT_AVATAR;
}
