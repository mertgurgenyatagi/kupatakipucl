/** Shared by every forum surface that shows a relative post time (the Home
 *  widget, the grid feed, the full-thread popup) — pulled out once actually
 *  duplicated across this rewrite rather than left copy-pasted a third time. */
export function timeAgo(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
