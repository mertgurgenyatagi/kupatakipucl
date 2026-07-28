// src/forum/ForumImageThumb.tsx
import { useState, type MouseEvent } from "react";
import { X } from "lucide-react";

interface ForumImageThumbProps {
  src: string;
  className?: string;
}

/**
 * 4chan-style image treatment: a small bounded thumbnail (never full width),
 * expanding to the full image only on click, in a lightbox overlay. Every
 * forum image call site uses this instead of its own inline <img> so the
 * "bounded until clicked" behavior stays in one place.
 */
export function ForumImageThumb({ src, className }: ForumImageThumbProps) {
  const [expanded, setExpanded] = useState(false);

  function openLightbox(e: MouseEvent) {
    // Image click must never bubble into a post-row's own "open the thread
    // popup" click handler (RecentPostsPreview) — the thumbnail is its own
    // target, not a door into the popup.
    e.stopPropagation();
    setExpanded(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openLightbox}
        aria-label="Resmi büyüt"
        className={className ?? "block size-16 shrink-0 cursor-pointer overflow-hidden rounded-md border border-color_border1/50"}
      >
        <img src={src} alt="" loading="lazy" className="size-full object-cover" />
      </button>

      {expanded && (
        <div
          role="button"
          tabIndex={-1}
          aria-label="Kapat"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-color_idk/80 p-6"
        >
          <img
            src={src}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            aria-label="Kapat"
            className="absolute top-4 right-4 cursor-pointer rounded-full bg-color_idk/50 p-2 text-white outline-none transition-colors hover:bg-color_idk/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
