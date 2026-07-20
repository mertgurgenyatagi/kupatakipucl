import { LeaderboardEntry } from "./leaderboardTypes";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return <p>Henüz tahmin gönderen olmadı.</p>;
  }
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.uid}>
          <img src={entry.photoURL} alt="" />
          {entry.firstName} {entry.lastName} — {entry.points} puan
        </li>
      ))}
    </ol>
  );
}
