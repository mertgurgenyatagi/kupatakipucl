import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

const mockOnAuthStateChanged = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

function TestConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `signed-in:${user.uid}` : "signed-out"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockOnAuthStateChanged.mockReset();
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
});
