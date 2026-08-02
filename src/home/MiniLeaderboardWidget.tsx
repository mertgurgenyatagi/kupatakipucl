import { CSSProperties } from "react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { assignRanks } from "../leaderboard/ranking";
import { selectMiniLeaderboardWindow } from "../leaderboard/miniLeaderboardWindow";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface MiniLeaderboardWidgetProps {
  className?: string;
  style?: CSSProperties;
  entries: LeaderboardEntry[];
  currentUid: string | null;
  onSelectParticipant: (uid: string) => void;
}

/**
 * GREAT_LEAP_SPEC.md §2.5: always exactly 5 rows (or fewer if the whole
 * leaderboard has fewer than 5 people — no padding to a fixed 5), sliding
 * near the top/bottom rather than centered, current user visually
 * distinguished, static (no movement indicators).
 */
export function MiniLeaderboardWidget({
  className,
  style,
  entries,
  currentUid,
  onSelectParticipant,
}: MiniLeaderboardWidgetProps) {
  const ranked = assignRanks(entries);
  const rows = selectMiniLeaderboardWindow(ranked, currentUid);

  return (
    <Frame className={className} style={style}>
      <FrameHeader tone="navy">
        <FrameTitle className="text-base text-color_text sm:text-lg">Lider Tablosu</FrameTitle>
      </FrameHeader>
      <FrameBody className="flex flex-col gap-1 px-3 py-2">
        {rows.map(({ entry, rank }) => (
          <button
            key={entry.uid}
            type="button"
            data-testid="mini-leaderboard-row"
            onClick={() => onSelectParticipant(entry.uid)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-color_hoverfill ${
              entry.uid === currentUid ? "bg-color_hoverfill font-semibold" : ""
            }`}
          >
            <span className="w-5 shrink-0 font-mono text-xs text-color_textsecondary tnum">{rank}</span>
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={entry.photoURL} alt="" />
              <AvatarFallback className="text-[0.6rem]">{initials(entry.firstName, entry.lastName)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm text-color_text">
              {entry.firstName} {entry.lastName}
            </span>
            <span className="font-mono text-xs text-color_text tnum">{entry.points}</span>
          </button>
        ))}
      </FrameBody>
    </Frame>
  );
}
