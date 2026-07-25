// The "movie intro" beats shown once, before the ranker (predictions-page-
// round-02 Q2/Q3, rewritten in round-03) — user-advanced, a few short lines
// rather than one dense paragraph. The middle beat also carries a live
// scoring-example visual (see ScoringExampleDiagram.tsx), hence boldTerms:
// "iki" and "3" are the two numbers that actually matter in that sentence.
export interface PredictionIntroBeat {
  text: string;
  boldTerms?: string[];
}

export const PREDICTION_INTRO_BEATS: PredictionIntroBeat[] = [
  { text: "Lig aşamasındaki takımların hepsini sırala, 1'den 36'ya kadar." },
  {
    text: "Eğer bir takım tahmin ettiğin yerden iki pozisyondan fazla sapmazsa 3 puan kazanacaksın.",
    boldTerms: ["iki", "3"],
  },
  { text: "Lig aşaması bittikten sonra eleme turu için bir tahmin daha yapacaksın." },
];
