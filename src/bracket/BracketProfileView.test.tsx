import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BracketProfileView } from "./BracketProfileView";
import { BracketPrediction } from "./bracketPredictionTypes";

const OWN_PREDICTION: BracketPrediction = {
  picks: { "ro16-1": "Arsenal" } as BracketPrediction["picks"],
  submittedAt: 1,
};

const ALL_PREDICTIONS: BracketPrediction[] = [
  OWN_PREDICTION,
  { picks: { "ro16-1": "Napoli" } as BracketPrediction["picks"], submittedAt: 2 },
];

describe("BracketProfileView", () => {
  it("renders the user's own pick for a matchup", () => {
    render(<BracketProfileView prediction={OWN_PREDICTION} allPredictions={ALL_PREDICTIONS} />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
  });

  it("annotates the pick with the group consensus percentage", () => {
    render(<BracketProfileView prediction={OWN_PREDICTION} allPredictions={ALL_PREDICTIONS} />);
    expect(screen.getByText("%50")).toBeInTheDocument();
  });

  it("renders nothing for matchups the user didn't pick", () => {
    render(<BracketProfileView prediction={OWN_PREDICTION} allPredictions={ALL_PREDICTIONS} />);
    expect(screen.queryByTestId("bracket-profile-pick-final")).not.toBeInTheDocument();
  });
});
