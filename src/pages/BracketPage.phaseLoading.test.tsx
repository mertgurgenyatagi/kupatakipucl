import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Unlike BracketPage.test.tsx (which mocks useTournamentPhase to a fixed
// value), this file exercises the REAL useTournamentPhase/useDevConfig
// hooks against a controllable firestore mock, to reproduce the reported
// bug: clicking into /bracket while the real phase is "preknockout" bounces
// straight back to "/" because the hook's first render always starts at its
// "notstarted" default, before the async tournamentState snapshot arrives.
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: vi.fn(),
}));
vi.mock("../firebase", () => ({ db: {} }));

const mockUseAuth = vi.fn();
const mockUseBracketState = vi.fn();
const mockUseBracketPrediction = vi.fn();

vi.mock("../auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../bracket/useBracketState", () => ({ useBracketState: () => mockUseBracketState() }));
vi.mock("../bracket/useBracketPrediction", () => ({
  useBracketPrediction: (uid: string | null) => mockUseBracketPrediction(uid),
  saveBracketPrediction: vi.fn(),
}));

import { BracketPage } from "./BracketPage";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("BracketPage against the real useTournamentPhase hook", () => {
  let callbacks: Record<string, SnapshotCallback>;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    callbacks = {};
    mockOnSnapshot.mockImplementation((docRef: { collection: string; id: string }, onNext: SnapshotCallback) => {
      callbacks[`${docRef.collection}/${docRef.id}`] = onNext;
      return vi.fn();
    });

    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockUseBracketState.mockReturnValue({
      bracketState: { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} },
      loading: false,
    });
    mockUseBracketPrediction.mockReturnValue({ prediction: null, loading: false });
  });

  function renderAtBracket() {
    return render(
      <MemoryRouter initialEntries={["/bracket"]}>
        <Routes>
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/bracket" element={<BracketPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("does not bounce back to / before the real phase has loaded, then shows the bracket once preknockout arrives", () => {
    renderAtBracket();

    // tournamentState/current hasn't delivered its first snapshot yet here —
    // this is the exact moment a user clicking the CTA link would be in.
    expect(screen.queryByText("HOME")).not.toBeInTheDocument();

    act(() => {
      callbacks["tournamentState/current"]({ exists: () => true, data: () => ({ phase: "preknockout" }) });
    });
    act(() => {
      callbacks["devConfig/state"]({ exists: () => false, data: () => ({}) });
    });

    expect(screen.queryByText("HOME")).not.toBeInTheDocument();
    expect(screen.getByText(/Şimdi eleme turu/)).toBeInTheDocument();
  });
});
