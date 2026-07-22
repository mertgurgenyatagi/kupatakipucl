import { Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { teamCrestSrc } from "../predictions/teams";
import { cn } from "@/lib/utils";

/**
 * A team crest, square (not circular like a participant Avatar), with a
 * quiet shield placeholder if a badge ever fails to load. Real club badge
 * SVGs (public/club-badges/), randomly assigned per team — see
 * teamCrestSrc in predictions/teams.ts.
 */
export function TeamCrest({
  teamId,
  className,
}: {
  teamId: string;
  className?: string;
}) {
  return (
    <Avatar
      className={cn(
        "size-7 shrink-0 rounded-sm after:rounded-sm after:border-transparent",
        className
      )}
    >
      <AvatarImage
        src={teamCrestSrc(teamId)}
        alt=""
        className="rounded-sm object-contain"
      />
      <AvatarFallback className="rounded-sm bg-secondary">
        <Shield
          className="size-4 text-muted-foreground/50"
          strokeWidth={1.5}
        />
      </AvatarFallback>
    </Avatar>
  );
}
