export function NumberBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-6">
      <span className="font-display text-4xl font-bold text-ink tnum">{value}</span>
      <span className="font-mono text-[0.68rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
