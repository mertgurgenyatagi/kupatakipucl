import { FormEvent, useState } from "react";
import { SurveyResponse, MessiOrRonaldo, Device } from "./surveyTypes";

const SUPER_LIG_TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Anadolu takımı", "Yok"];
const TOTAL_STEPS = 6;

interface SurveyFormProps {
  onComplete: (response: SurveyResponse) => void;
}

export function SurveyForm({ onComplete }: SurveyFormProps) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [footballKnowledge, setFootballKnowledge] = useState(4);
  const [messiOrRonaldo, setMessiOrRonaldo] = useState<MessiOrRonaldo>("no-opinion");
  const [superLigTeam, setSuperLigTeam] = useState(SUPER_LIG_TEAMS[0]);
  const [uclTeam, setUclTeam] = useState("");
  const [device, setDevice] = useState<Device>("both");

  function next(event: FormEvent) {
    event.preventDefault();
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    onComplete({
      age: Number(age),
      footballKnowledge,
      messiOrRonaldo,
      superLigTeam,
      uclTeam: uclTeam.trim() === "" ? null : uclTeam.trim(),
      device,
      submittedAt: Date.now(),
    });
  }

  return (
    <form onSubmit={next}>
      <progress aria-label="Anket ilerlemesi" value={step + 1} max={TOTAL_STEPS} />
      {step === 0 && (
        <label>
          Yaşınız
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
        </label>
      )}
      {step === 1 && (
        <label>
          Futbol bilginizi 1-7 arası değerlendirin
          <input
            type="number"
            min={1}
            max={7}
            value={footballKnowledge}
            onChange={(e) => setFootballKnowledge(Number(e.target.value))}
            required
          />
        </label>
      )}
      {step === 2 && (
        <label>
          Messi mi Ronaldo mu?
          <select
            value={messiOrRonaldo}
            onChange={(e) => setMessiOrRonaldo(e.target.value as MessiOrRonaldo)}
          >
            <option value="messi">Messi</option>
            <option value="ronaldo">Ronaldo</option>
            <option value="no-opinion">Fikrim yok</option>
          </select>
        </label>
      )}
      {step === 3 && (
        <label>
          Süper Lig'de tuttuğunuz takım
          <select value={superLigTeam} onChange={(e) => setSuperLigTeam(e.target.value)}>
            {SUPER_LIG_TEAMS.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>
      )}
      {step === 4 && (
        <label>
          Tuttuğunuz bir UCL takımı var mı? (varsa yazın)
          <input value={uclTeam} onChange={(e) => setUclTeam(e.target.value)} />
        </label>
      )}
      {step === 5 && (
        <label>
          Çoğunlukla hangi cihazı kullanıyorsunuz?
          <select value={device} onChange={(e) => setDevice(e.target.value as Device)}>
            <option value="phone">Telefon</option>
            <option value="desktop">Bilgisayar</option>
            <option value="both">İkisi de</option>
          </select>
        </label>
      )}
      <button type="submit">{step < TOTAL_STEPS - 1 ? "İleri" : "Gönder"}</button>
    </form>
  );
}
