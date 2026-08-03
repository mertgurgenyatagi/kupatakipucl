import { useEffect, useState } from "react";

// Shared by every page/popup that gates its reveal on images being ready —
// originally private to HeroCarousel.tsx. Resolves each url via a detached
// Image(); both onload and onerror count as "settled" so one broken image
// (404, network failure) can never hang a page's reveal forever — it just
// falls through to that component's own fallback (e.g. AvatarFallback's
// shield/initials) once the page reveals. See
// docs/superpowers/specs/2026-08-03-sitewide-image-preload-gate-design.md.
export function useImagePreload(urls: string[]): boolean {
  const [ready, setReady] = useState(urls.length === 0);

  useEffect(() => {
    if (urls.length === 0) {
      setReady(true);
      return;
    }
    setReady(false);
    let cancelled = false;
    Promise.all(
      urls.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
          })
      )
    ).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);

  return ready;
}
