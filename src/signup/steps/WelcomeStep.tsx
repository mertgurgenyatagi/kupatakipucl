/** Auto-dismissing (see AutoAdvance) — "#kupatakip" bold, the rest regular,
 *  matching the nav wordmark's own weight split (AppShell.tsx). leading-
 *  tight, not Tailwind's default text-6xl line-height of exactly 1 — that
 *  left no room for descenders (the "y" in "ye hoş geldin" was clipping). */
export function WelcomeStep() {
  return (
    <p className="text-center font-display text-5xl leading-tight text-color_text sm:text-6xl">
      <span className="font-bold">#kupatakip</span>
      <span className="font-normal">ucl'ye hoş geldin!</span>
    </p>
  );
}
