import { useState } from "react";
import { FIXTURES } from "./fixtures";
import { TEAMS } from "../predictions/teams";
import { useDevConfig, setPhaseOverride, setCurrentDateOverride, setLoggedInOverride } from "./useDevConfig";
import { TournamentPhase } from "../tournament/tournamentPhase";
import { useDevMatches, setMatchOutcome } from "./useDevMatches";
import { MatchOutcome } from "./standings";

function teamName(teamId: string): string {
  return TEAMS.find((t) => t.id === teamId)?.name ?? teamId;
}

function isUnlocked(fixtureOrder: number, outcomes: Record<string, MatchOutcome>): boolean {
  return FIXTURES.filter((f) => f.order < fixtureOrder).every(
    (f) => (outcomes[f.id] ?? "notplayed") !== "notplayed"
  );
}

const MATCHDAYS = [1, 2, 3, 4, 5, 6, 7, 8];

const PHASE_LABELS: Record<TournamentPhase, string> = {
  notstarted: "Başlamadı",
  leaguephase: "Lig Aşaması",
  preknockout: "Eleme Öncesi",
  knockout: "Eleme Aşaması",
};
const PHASES: TournamentPhase[] = ["notstarted", "leaguephase", "preknockout", "knockout"];

export function DevPanel() {
  const { config, loading: configLoading } = useDevConfig();
  const { outcomes, loading: matchesLoading, refetch } = useDevMatches();
  const [error, setError] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState("");

  if (configLoading || matchesLoading) return null;

  async function handleOutcomeChange(fixtureId: string, outcome: MatchOutcome) {
    try {
      await setMatchOutcome(outcomes, fixtureId, outcome);
      setError(null);
      refetch();
    } catch (err) {
      console.error("Failed to set match outcome", err);
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    }
  }

  const decidedFixtures = FIXTURES.filter((f) => (outcomes[f.id] ?? "notplayed") !== "notplayed");
  const latestDecided =
    decidedFixtures.length > 0
      ? decidedFixtures.reduce((latest, f) => (f.order > latest.order ? f : latest))
      : null;
  const autoDate = latestDecided ? latestDecided.kickoffUtc.slice(0, 10) : null;
  const effectiveDate = config.currentDateOverride ?? autoDate;

  const phaseBtn = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm ${
      active ? "border-brass bg-brass text-navy-ink" : "border-border bg-card text-ink hover:border-brass"
    } disabled:cursor-default`;

  return (
    <div className="mx-auto h-full max-w-3xl space-y-6 overflow-y-auto p-6 font-sans text-ink">
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">Turnuva Durumu</h2>
        <div className="flex flex-wrap gap-2">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => setPhaseOverride(phase)}
              disabled={config.phaseOverride === phase}
              className={phaseBtn(config.phaseOverride === phase)}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
          <button
            onClick={() => setPhaseOverride(null)}
            disabled={config.phaseOverride === null}
            className={phaseBtn(config.phaseOverride === null)}
          >
            Otomatik (canlı turnuva durumuna göre)
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">Giriş Durumu</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLoggedInOverride(true)}
            disabled={config.loggedInOverride === true}
            className={phaseBtn(config.loggedInOverride === true)}
          >
            Giriş yapılmış
          </button>
          <button
            onClick={() => setLoggedInOverride(false)}
            disabled={config.loggedInOverride === false}
            className={phaseBtn(config.loggedInOverride === false)}
          >
            Giriş yapılmamış
          </button>
          <button
            onClick={() => setLoggedInOverride(null)}
            disabled={config.loggedInOverride === null}
            className={phaseBtn(config.loggedInOverride === null)}
          >
            Otomatik (gerçek oturum)
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">Güncel Tarih</h2>
        <p className="mb-2 font-mono text-sm tabular-nums text-muted-foreground">
          {effectiveDate ?? "Henüz hiçbir maç oynanmadı"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            placeholder="YYYY-MM-DD"
            aria-label="Özel tarih"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-ink"
          />
          <button onClick={() => setCurrentDateOverride(dateInput || null)} className={phaseBtn(false)}>
            Ayarla
          </button>
          <button onClick={() => setCurrentDateOverride(null)} className={phaseBtn(false)}>
            Otomatiğe dön
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">Maçlar</h2>
        <div className="space-y-4">
          {MATCHDAYS.map((matchday) => (
            <div key={matchday}>
              <h3 className="mb-1.5 text-sm font-semibold text-ink">{matchday}. Hafta</h3>
              <ul className="space-y-1">
                {FIXTURES.filter((f) => f.matchday === matchday).map((fixture) => {
                  const currentOutcome = outcomes[fixture.id] ?? "notplayed";
                  const unlocked = isUnlocked(fixture.order, outcomes);
                  return (
                    <li
                      key={fixture.id}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm odd:bg-background/60"
                    >
                      <span>
                        {teamName(fixture.homeTeamId)} - {teamName(fixture.awayTeamId)}
                      </span>
                      <select
                        aria-label={`${teamName(fixture.homeTeamId)} - ${teamName(fixture.awayTeamId)}`}
                        value={currentOutcome}
                        onChange={(e) => handleOutcomeChange(fixture.id, e.target.value as MatchOutcome)}
                        className="rounded-md border border-border bg-background px-1.5 py-1 text-sm text-ink"
                      >
                        <option value="notplayed">Oynanmadı</option>
                        <option value="homewin" disabled={!unlocked}>
                          Ev sahibi kazandı
                        </option>
                        <option value="draw" disabled={!unlocked}>
                          Berabere
                        </option>
                        <option value="awaywin" disabled={!unlocked}>
                          Deplasman kazandı
                        </option>
                      </select>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
