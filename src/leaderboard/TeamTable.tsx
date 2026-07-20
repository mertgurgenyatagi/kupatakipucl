import { useState } from "react";
import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";

type SortKey = "position" | "points" | "goalDifference" | "goalsFor" | "goalsAgainst";

interface TeamTableProps {
  results: Record<string, TeamResult>;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "position", label: "Sıra" },
  { key: "points", label: "Puan" },
  { key: "goalDifference", label: "Averaj" },
  { key: "goalsFor", label: "Attığı" },
  { key: "goalsAgainst", label: "Yediği" },
];

export function TeamTable({ results }: TeamTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const hasResults = Object.keys(results).length > 0;

  if (!hasResults) {
    return (
      <table>
        <thead>
          <tr>
            <th>Takım</th>
            <th>Puan</th>
          </tr>
        </thead>
        <tbody>
          {TEAMS.map((team) => (
            <tr key={team.id}>
              <td>{team.name}</td>
              <td>0</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const sorted = [...TEAMS].sort((a, b) => {
    const ra = results[a.id];
    const rb = results[b.id];
    if (!ra && !rb) return 0;
    if (!ra) return 1;
    if (!rb) return -1;
    if (sortKey === "position") return ra.position - rb.position;
    return rb[sortKey] - ra[sortKey];
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Takım</th>
          {COLUMNS.map((col) => (
            <th key={col.key}>
              <button onClick={() => setSortKey(col.key)}>{col.label}</button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((team) => {
          const result = results[team.id];
          return (
            <tr key={team.id}>
              <td>{team.name}</td>
              <td>{result?.position ?? "-"}</td>
              <td>{result?.points ?? "-"}</td>
              <td>{result?.goalDifference ?? "-"}</td>
              <td>{result?.goalsFor ?? "-"}</td>
              <td>{result?.goalsAgainst ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
