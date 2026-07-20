import { Player } from "./usePlayers";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TEAMS } from "../predictions/teams";

interface PlayerListProps {
  players: Player[];
  showFullNames: boolean;
  leaderboardEntries?: LeaderboardEntry[];
}

function rankingNames(ranking: string[]): string {
  return ranking.map((id) => TEAMS.find((t) => t.id === id)?.name ?? id).join(", ");
}

export function PlayerList({ players, showFullNames, leaderboardEntries }: PlayerListProps) {
  if (!showFullNames) {
    return (
      <p>
        {players.length} kişi katıldı: {players.map((p) => p.firstName).join(", ")}
      </p>
    );
  }

  const entryByUid = new Map((leaderboardEntries ?? []).map((e) => [e.uid, e]));

  return (
    <ul>
      {players.map((player) => {
        const entry = entryByUid.get(player.uid);
        return (
          <li key={player.uid}>
            <img src={player.photoURL} alt="" />
            {player.firstName} {player.lastName}
            {leaderboardEntries && (entry ? ` — ${rankingNames(entry.ranking)}` : " — tahmin göndermedi")}
          </li>
        );
      })}
    </ul>
  );
}
