import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getCached, setCached } from "../lib/sessionCache";

const CACHE_KEY = "predictionSubmitters";

/** Just the set of uids that have submitted a prediction — who has sent their
 *  picks in, never what they picked.
 *
 *  Reads a single document, `leaderboardCache/submitters`, maintained by the
 *  leaderboard Cloud Function in the same transaction as the leaderboard cache
 *  itself (functions/leaderboard/index.js).
 *
 *  This used to fetch the entire `predictions` collection and throw away
 *  everything but the document ids. Two things were wrong with that. It moved
 *  ~150 KiB per visit at 250 participants — a 36-element ranking array per
 *  participant, downloaded solely to read ids — while gating first paint on
 *  LoggedInHome, the most-visited signed-in page. And it required every
 *  participant's ranking to be readable by every other participant before the
 *  deadline, which is the one thing this game cannot allow: predictions are now
 *  private until the league phase starts (firestore.rules, 2026-08-27), so the
 *  old collection read would simply be denied.
 *
 *  The function derives the list from the same entries it scores, so a
 *  prediction left behind by a deleted account (no profile) correctly does not
 *  count as a submission.
 *
 *  Still one-shot rather than a live listener, and still session-cached, for
 *  the same reasons as before: cost is O(page visits), not O(visits ×
 *  listeners). Cached as a string[] rather than a Set, since sessionCache
 *  persists through JSON.stringify and a Set does not survive that. */
export function usePredictionSubmitters() {
  const cached = getCached<string[]>(CACHE_KEY);
  const [submitterUids, setSubmitterUids] = useState<Set<string>>(() => new Set(cached ?? []));
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let ignore = false;
    getDoc(doc(db, "leaderboardCache", "submitters"))
      .then((snapshot) => {
        if (ignore) return;
        // Absent until the function's first recompute after deploy, which is
        // also exactly the state before anyone has submitted anything.
        const uids = snapshot.exists() ? ((snapshot.data().uids as string[]) ?? []) : [];
        setCached(CACHE_KEY, uids);
        setSubmitterUids(new Set(uids));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load prediction submitters", err);
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { submitterUids, loading };
}
