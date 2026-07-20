import { useState } from "react";
import { FIXTURES } from "./fixtures";
import { TEAMS } from "../predictions/teams";
import { useDevConfig, setTournamentActive, setCurrentDateOverride } from "./useDevConfig";
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

  return (
    <div>
      <h2>Turnuva Durumu</h2>
      <button onClick={() => setTournamentActive(true)} disabled={config.tournamentActive === true}>
        Başladı
      </button>
      <button onClick={() => setTournamentActive(false)} disabled={config.tournamentActive === false}>
        Başlamadı
      </button>
      <button onClick={() => setTournamentActive(null)} disabled={config.tournamentActive === null}>
        Otomatik (gerçek tarihe göre)
      </button>

      <h2>Güncel Tarih</h2>
      <p>{effectiveDate ?? "Henüz hiçbir maç oynanmadı"}</p>
      <input
        value={dateInput}
        onChange={(e) => setDateInput(e.target.value)}
        placeholder="YYYY-MM-DD"
        aria-label="Özel tarih"
      />
      <button onClick={() => setCurrentDateOverride(dateInput || null)}>Ayarla</button>
      <button onClick={() => setCurrentDateOverride(null)}>Otomatiğe dön</button>

      {error && <p role="alert">{error}</p>}

      <h2>Maçlar</h2>
      {MATCHDAYS.map((matchday) => (
        <div key={matchday}>
          <h3>{matchday}. Hafta</h3>
          <ul>
            {FIXTURES.filter((f) => f.matchday === matchday).map((fixture) => {
              const currentOutcome = outcomes[fixture.id] ?? "notplayed";
              const unlocked = isUnlocked(fixture.order, outcomes);
              return (
                <li key={fixture.id}>
                  {teamName(fixture.homeTeamId)} - {teamName(fixture.awayTeamId)}
                  <select
                    aria-label={`${teamName(fixture.homeTeamId)} - ${teamName(fixture.awayTeamId)}`}
                    value={currentOutcome}
                    onChange={(e) => handleOutcomeChange(fixture.id, e.target.value as MatchOutcome)}
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
  );
}
