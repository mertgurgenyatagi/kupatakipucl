import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HERO_IMAGE_POSITIONS } from "../leaderboard/HeroCarousel";

interface SplitBandProps {
  image: string;
  imageAlt?: string;
  /** grid-template-columns for [content, image] — "approx 50/50, flexible"
   *  per Mert's brief; team-roster widens the content side for the table.
   *  Always expressed as [content-side, image-side], regardless of which
   *  physical side `imagePosition` puts them on. */
  ratio?: string;
  /** Which physical side the image sits on — content takes the other side.
   *  Defaults to "right" (the original brief); one section (the countdown
   *  band) flips this. */
  imagePosition?: "left" | "right";
  tone?: "background" | "navy";
  className?: string;
  children: ReactNode;
}

// A single smooth curve (not a busy multi-wave squiggle), matching the
// horizontal WaveDivider's restraint — a gentle vertical counterpart rather
// than a template "zigzag" shape. Defined in objectBoundingBox units (0-1)
// so it scales to whatever size the image panel actually ends up. Image-on-
// right bulges on its own left edge; image-on-left is the same curve
// mirrored (x -> 1-x) so it bulges on its right edge instead.
const CURVE_PATH_RIGHT = "M0.18,0 C0.05,0.2 0.3,0.4 0.15,0.5 C0.02,0.6 0.28,0.8 0.18,1 L1,1 L1,0 Z";
const CURVE_PATH_LEFT = "M0.82,0 C0.95,0.2 0.7,0.4 0.85,0.5 C0.98,0.6 0.72,0.8 0.82,1 L0,1 L0,0 Z";

/**
 * The layout for every section below the hero (Mert: "push the contents to
 * one side, and to the other side, with a curve border, put each carousel
 * image... approx 50/50, flexible"). One shared component so the curved
 * clip-path is defined once instead of duplicated per section.
 */
export function SplitBand({
  image,
  imageAlt = "",
  ratio = "1fr 1fr",
  imagePosition = "right",
  tone = "background",
  className,
  children,
}: SplitBandProps) {
  // useId() output contains colons, which need escaping to reference safely
  // from a CSS url(#...) — simplest to just strip them for a clean id.
  const clipId = `curve-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const onRight = imagePosition === "right";

  const contentEl = (
    <div className="flex min-w-0 flex-col justify-center gap-6 px-6 py-16 sm:px-10 lg:py-20">{children}</div>
  );
  const imageEl = (
    <div className="relative h-full min-h-[420px]">
      <svg width="0" height="0" aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={onRight ? CURVE_PATH_RIGHT : CURVE_PATH_LEFT} />
          </clipPath>
        </defs>
      </svg>
      <img
        src={image}
        alt={imageAlt}
        className="animate-cotton-fade absolute inset-0 size-full object-cover"
        style={{
          clipPath: `url(#${clipId})`,
          objectPosition: HERO_IMAGE_POSITIONS[image] ?? "50% 50%",
        }}
      />
    </div>
  );

  return (
    <section
      className={cn("grid w-full items-stretch", tone === "navy" ? "bg-navy" : "bg-background", className)}
      style={{ gridTemplateColumns: onRight ? ratio : ratio.split(" ").reverse().join(" ") }}
    >
      {onRight ? (
        <>
          {contentEl}
          {imageEl}
        </>
      ) : (
        <>
          {imageEl}
          {contentEl}
        </>
      )}
    </section>
  );
}
