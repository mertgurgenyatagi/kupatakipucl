// src/forum/ForumImageThumb.tsx
import { useState, type MouseEvent } from "react";
import { X, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForumImageThumbProps {
  src: string;
  className?: string;
}

type ImageStatus = "loading" | "loaded" | "error";

/**
 * 4chan-style image treatment: a small bounded thumbnail (never full width),
 * expanding to the full image only on click, in a lightbox overlay. Every
 * forum image call site uses this instead of its own inline <img> so the
 * "bounded until clicked" behavior stays in one place.
 *
 * Unlike AvatarImage (base-ui's primitive, which only mounts once a photo
 * has already loaded), this is a plain <img> — the thumbnail box is already
 * fixed-size so there's no layout shift, but the image itself used to pop in
 * with no fade and no failure handling at all. Both the thumbnail and the
 * lightbox now track their own load status independently, since a broken
 * upload should show a fallback in both places, not just one.
 */
export function ForumImageThumb({ src, className }: ForumImageThumbProps) {
  const [expanded, setExpanded] = useState(false);
  const [thumbStatus, setThumbStatus] = useState<ImageStatus>("loading");
  const [fullStatus, setFullStatus] = useState<ImageStatus>("loading");

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
        {thumbStatus === "error" ? (
          <div className="flex size-full items-center justify-center bg-muted" data-testid="forum-image-fallback">
            <ImageOff className="size-4 text-color_textsecondary/50" aria-hidden />
          </div>
        ) : (
          <img
            src={src}
            alt=""
            loading="lazy"
            onLoad={() => setThumbStatus("loaded")}
            onError={() => setThumbStatus("error")}
            className={cn(
              "size-full object-cover transition-opacity duration-300",
              thumbStatus === "loaded" ? "opacity-100" : "opacity-0"
            )}
          />
        )}
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
          {fullStatus === "error" ? (
            <p className="text-sm text-white">Resim yüklenemedi.</p>
          ) : (
            <img
              src={src}
              alt=""
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setFullStatus("loaded")}
              onError={() => setFullStatus("error")}
              className={cn(
                "max-h-full max-w-full cursor-default rounded-lg object-contain transition-opacity duration-300",
                fullStatus === "loaded" ? "opacity-100" : "opacity-0"
              )}
            />
          )}
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
