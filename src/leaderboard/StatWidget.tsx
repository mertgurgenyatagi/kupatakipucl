import type { LucideIcon } from "lucide-react";
import { Star, Goal, Handshake } from "lucide-react";
import {
  Frame,
  FrameHeader,
  FrameTitle,
  FrameMeta,
  FrameBody,
} from "@/components/ui/frame";

interface StatWidgetSpec {
  key: string;
  title: string;
  meta: string;
  icon: LucideIcon;
}

/**
 * The three stat widgets from Mert's brief — best players by rating, top
 * scorers, top assisters. There is no footballer-level data model anywhere in
 * this app (a "Player" here is a pool participant, not a footballer), so these
 * are built honestly empty rather than fabricated: real titles so the future
 * intent and grid rhythm are visible (Mert: "space the widgets accordingly
 * even if we aren't able to populate them yet"), a quiet "no data yet" state
 * inside, matching the app's own empty-state voice (§29, §15).
 */
export const STAT_WIDGETS: StatWidgetSpec[] = [
  { key: "rating", title: "En İyi Oyuncular", meta: "Reyting", icon: Star },
  { key: "scorers", title: "Gol Krallığı", meta: "Goller", icon: Goal },
  { key: "assists", title: "Asist Krallığı", meta: "Asistler", icon: Handshake },
];

export function StatWidget({ spec, index }: { spec: StatWidgetSpec; index: number }) {
  const Icon = spec.icon;
  return (
    <Frame
      data-testid="stat-widget"
      className="min-h-[128px] animate-cotton-rise border-navy-line/35 lg:h-full"
      style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }}
    >
      <FrameHeader tone="navy" className="py-3.5">
        <FrameTitle className="text-lg text-navy-ink sm:text-xl">
          {spec.title}
        </FrameTitle>
        <FrameMeta className="text-navy-muted">{spec.meta}</FrameMeta>
      </FrameHeader>
      <FrameBody className="items-center justify-center gap-2 px-5 py-6 text-center">
        <Icon
          className="size-5 text-silver/70"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="font-display text-[0.95rem] text-muted-foreground italic">
          Henüz veri yok.
        </p>
        <p className="font-mono text-[0.54rem] tracking-[0.18em] text-muted-foreground/70 uppercase">
          Sezon istatistikleri yakında
        </p>
      </FrameBody>
    </Frame>
  );
}
