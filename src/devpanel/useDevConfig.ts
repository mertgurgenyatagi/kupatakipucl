import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface DevConfig {
  tournamentActive: boolean | null;
  currentDateOverride: string | null;
}

const DEFAULT_CONFIG: DevConfig = { tournamentActive: null, currentDateOverride: null };

export function useDevConfig() {
  const [config, setConfig] = useState<DevConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(import.meta.env.DEV);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const unsubscribe = onSnapshot(
      doc(db, "devConfig", "state"),
      (snapshot) => {
        setConfig(snapshot.exists() ? { ...DEFAULT_CONFIG, ...(snapshot.data() as Partial<DevConfig>) } : DEFAULT_CONFIG);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load dev config", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { config, loading };
}

export async function setTournamentActive(active: boolean | null): Promise<void> {
  await setDoc(doc(db, "devConfig", "state"), { tournamentActive: active }, { merge: true });
}

export async function setCurrentDateOverride(date: string | null): Promise<void> {
  await setDoc(doc(db, "devConfig", "state"), { currentDateOverride: date }, { merge: true });
}
