import { useEffect, useRef } from "react";
import { StageTab } from "./fixtureStages";
import { isFixtureLive } from "./liveFixtures";
import { LiveDot } from "./LiveDot";
import { cn } from "@/lib/utils";

/**
 * The Matches page's round selector — "1. Hafta" through "8. Hafta", then a
 * pill per knockout round as each draw lands. Horizontally scrollable rather
 * than wrapped: thirteen pills on a phone would otherwise take three lines
 * and push the fixtures themselves below the fold.
 *
 * The selected pill is scrolled into view on mount, which matters because
 * the default round is rarely the first one — landing on "6. Hafta" with the
 * strip scrolled to the far left would look like a bug.
 */
export function StageTabs({
  tabs,
  selectedKey,
  onSelect,
}: {
  tabs: StageTab[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <div
      role="tablist"
      aria-label="Turnuva turları"
      className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2.5"
    >
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        const live = tab.fixtures.some(isFixtureLive);
        return (
          <button
            key={tab.key}
            ref={selected ? selectedRef : undefined}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.12em] whitespace-nowrap uppercase transition-colors duration-150 ease-[var(--ease-cotton)]",
              selected
                ? "bg-color_accent/90 text-color_text"
                : "text-color_textsecondary hover:bg-color_hoverfill hover:text-color_text"
            )}
          >
            {tab.label}
            {live && <LiveDot className="size-1.5" />}
          </button>
        );
      })}
    </div>
  );
}
