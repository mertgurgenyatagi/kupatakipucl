import { Frame } from "@/components/ui/frame";

/** Exact wording as given, not to be reworded. */
export const SLOW_LOAD_MESSAGE = "Eğer sayfa yüklenmiyorsa tarayıcınızın eklentilerini kontrol edin.";

/**
 * A wide, low-key notice for a page that has been loading for unusually
 * long — see useLoadingStuck for what triggers it. One Frame cell, same mat
 * every other cell on the site uses, so it reads as part of the page rather
 * than as an alert box bolted on. Deliberately not styled as an error: it
 * isn't one, and most people seeing it don't need more than this to know
 * what to try.
 */
export function SlowLoadNotice() {
  return (
    <Frame className="w-full items-center px-5 py-6 text-center sm:px-8">
      <p className="font-display text-sm text-color_textsecondary italic sm:text-base">{SLOW_LOAD_MESSAGE}</p>
    </Frame>
  );
}
