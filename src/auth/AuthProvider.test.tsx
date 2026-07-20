import { render, screen, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

const mockOnAuthStateChanged = vi.fn();
const mockOnSnapshot = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  setDoc: () => Promise.resolve(undefined),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ auth: {}, db: {} }));

type DevConfigSnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

function emitDevConfig(overrides: Record<string, unknown> = {}) {
  const onNext = mockOnSnapshot.mock.calls[mockOnSnapshot.mock.calls.length - 1][1] as DevConfigSnapshotCallback;
  act(() => {
    onNext({ exists: () => true, data: () => overrides });
  });
}

function TestConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `signed-in:${user.uid}` : "signed-out"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockOnAuthStateChanged.mockReset();
    mockOnSnapshot.mockReset();
    mockOnSnapshot.mockImplementation(() => () => {});
  });

  it("shows loading before auth state resolves", () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows signed-out state when the callback receives null", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
  });

  it("shows signed-in state with uid when the callback receives a user", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "abc123" });
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByText("signed-in:abc123")).toBeInTheDocument()
    );
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    function ConsumerWithoutProvider() {
      useAuth();
      return null;
    }
    expect(() => render(<ConsumerWithoutProvider />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });

  it("forces signed-in (as the dev fake uid) when loggedInOverride is true, even if really signed out", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    emitDevConfig({ loggedInOverride: true });
    expect(await screen.findByText("signed-in:dummy-001")).toBeInTheDocument();
  });

  it("forces signed-out when loggedInOverride is false, even if really signed in", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "abc123" });
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    emitDevConfig({ loggedInOverride: false });
    expect(await screen.findByText("signed-out")).toBeInTheDocument();
  });

  it("falls back to the real auth state when loggedInOverride is null", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "abc123" });
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    emitDevConfig({ loggedInOverride: null });
    expect(await screen.findByText("signed-in:abc123")).toBeInTheDocument();
  });
});
