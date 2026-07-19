import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockRef = vi.fn((_storage: unknown, path: string) => ({ path }));

vi.mock("firebase/storage", () => ({
  ref: (...args: unknown[]) => mockRef(...(args as [unknown, string])),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
}));

vi.mock("../firebase", () => ({ db: {}, storage: {} }));

import { useProfile, saveProfile } from "./useProfile";

describe("useProfile", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("returns loading=false and profile=null when uid is null", async () => {
    const { result } = renderHook(() => useProfile(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("returns profile=null when no profile doc exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const { result } = renderHook(() => useProfile("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("returns the profile when a doc exists", async () => {
    const data = { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 123 };
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const { result } = renderHook(() => useProfile("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(data);
  });
});

describe("saveProfile", () => {
  beforeEach(() => {
    mockUploadBytes.mockReset();
    mockGetDownloadURL.mockReset();
    mockSetDoc.mockReset();
  });

  it("uploads the photo, then writes the profile doc with the resulting URL", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/photo.jpg");
    mockSetDoc.mockResolvedValue(undefined);

    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await saveProfile("uid1", "Mert", "G", file);

    expect(mockUploadBytes).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      firstName: "Mert",
      lastName: "G",
      photoURL: "https://example.com/photo.jpg",
      createdAt: expect.any(Number),
    });
  });
});
