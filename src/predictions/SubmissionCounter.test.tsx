import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SubmissionCounter } from "./SubmissionCounter";

const mockGetCountFromServer = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getCountFromServer: (...args: unknown[]) => mockGetCountFromServer(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

describe("SubmissionCounter", () => {
  beforeEach(() => {
    mockGetCountFromServer.mockReset();
  });

  it("shows the submitted and total counts once both queries resolve", async () => {
    mockGetCountFromServer.mockImplementation((ref: { name: string }) => {
      const count = ref.name === "predictions" ? 12 : 30;
      return Promise.resolve({ data: () => ({ count }) });
    });
    render(<SubmissionCounter />);
    await waitFor(() =>
      expect(screen.getByText("12 / 30 kişi tahminini gönderdi")).toBeInTheDocument()
    );
  });
});
