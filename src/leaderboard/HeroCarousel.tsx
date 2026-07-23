import { useEffect, useState } from "react";

// Three portrait crops (public/hero/, pre-cropped to a 3:2 height:width box
// — see scripts/crop-hero-images.mjs). One rectangular card, full-bleed
// (object-cover, no mask/fade at the edges), cross-fading between the
// three — not stacked, one slot, one image visible at a time. 7s each
// (Mert's explicit spec).
const HERO_IMAGES = ["/hero/harry_kane.webp", "/hero/mbappe.webp", "/hero/dembele.webp"];
const CYCLE_MS = 7000;
const FADE_MS = 1500;

/**
 * The crossfading portrait carousel itself, extracted so it can be reused
 * without the upcoming-fixtures drawer LeaderboardHero docks to it — the
 * stats page's own hero section wants the exact same carousel, no drawer.
 */
export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % HERO_IMAGES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {HERO_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          data-testid="hero-image"
          className="absolute inset-0 size-full object-cover transition-opacity ease-linear"
          style={{ opacity: i === active ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
    </>
  );
}
