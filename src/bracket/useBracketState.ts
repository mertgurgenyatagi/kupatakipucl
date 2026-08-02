import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { BracketState } from "./bracketState";

const EMPTY_STATE: BracketState = { ro16Teams: {}, winners: {} };

export function useBracketState(): { bracketState: BracketState; loading: boolean } {
  const [bracketState, setBracketState] = useState<BracketState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "bracketState", "current"),
      (snapshot) => {
        const data = snapshot.exists() ? (snapshot.data() as BracketState) : null;
        setBracketState(data ?? EMPTY_STATE);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Failed to load bracket state", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { bracketState, loading };
}
