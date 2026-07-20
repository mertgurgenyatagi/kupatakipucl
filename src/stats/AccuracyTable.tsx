import { AccuracyEntry } from "./accuracy";

interface AccuracyTableProps {
  entries: AccuracyEntry[];
}

export function AccuracyTable({ entries }: AccuracyTableProps) {
  if (entries.length === 0) {
    return <p>Henüz hesaplanabilecek veri yok.</p>;
  }
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.uid}>
          {entry.firstName} {entry.lastName} — ortalama sapma: {entry.averageDeviation.toFixed(2)}
        </li>
      ))}
    </ol>
  );
}
