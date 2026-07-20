import { TeamBias } from "./teamBias";

interface TeamBiasTableProps {
  teams: TeamBias[];
}

export function TeamBiasTable({ teams }: TeamBiasTableProps) {
  if (teams.length === 0) {
    return <p>Henüz hesaplanabilecek veri yok.</p>;
  }
  return (
    <ol>
      {teams.map((team) => (
        <li key={team.teamId}>
          {team.teamName}: {team.averageDifference.toFixed(2)}
        </li>
      ))}
    </ol>
  );
}
