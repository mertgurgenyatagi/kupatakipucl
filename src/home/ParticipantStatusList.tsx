import { Check } from "lucide-react";
import { Player } from "../profile/usePlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ParticipantStatusListProps {
  players: Player[];
  submitterUids: Set<string>;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * "Full list of participants" per Mert's sketch — every signed-up player,
 * alphabetical (easiest to scan for your own name / a specific friend's),
 * with a gold tick marking who's already submitted their league prediction.
 * Gold here is literally Tailwind's amber-400/500 — the same "gold" already
 * used for rank numerals and standout figures elsewhere (RankingList,
 * ParticipantPopup), not the site's --brass token (which reads green despite
 * its name, a leftover from the dark-theme rework).
 */
export function ParticipantStatusList({ players, submitterUids }: ParticipantStatusListProps) {
  const sorted = [...players].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline justify-between border-b border-border/50 px-5 py-2.5 sm:px-6">
        <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
          Tahminini Gönderdi
        </span>
        <span className="font-mono text-[0.68rem] text-amber-400 tnum">
          {submitterUids.size} / {players.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
          <p className="text-center font-display text-sm text-muted-foreground italic">Henüz katılımcı yok.</p>
        </div>
      ) : (
        <ul className="no-scrollbar min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto px-5 sm:px-6">
          {sorted.map((player) => {
            const submitted = submitterUids.has(player.uid);
            return (
              <li key={player.uid} className="flex items-center gap-3 py-2.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={player.photoURL} alt="" />
                  <AvatarFallback className="font-mono text-[0.6rem] text-muted-foreground">
                    {initials(player.firstName, player.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-display text-sm text-ink">
                  {player.firstName} {player.lastName}
                </span>
                <span
                  aria-label={submitted ? "Tahminini gönderdi" : "Henüz göndermedi"}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    submitted ? "border-amber-400/40 bg-amber-400/15 text-amber-400" : "border-border/60 text-transparent"
                  )}
                >
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
