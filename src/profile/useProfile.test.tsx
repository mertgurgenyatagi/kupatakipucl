import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
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

import { useProfile, saveProfile, updateProfilePhoto, deleteProfile } from "./useProfile";

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

  it("stops loading and leaves profile null when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDoc.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useProfile("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load profile", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("does not overwrite state with a stale profile when uid changes before the read resolves", async () => {
    let resolveFirst: (value: { exists: () => boolean; data: () => unknown }) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondData = { firstName: "Second", lastName: "User", photoURL: "url2", createdAt: 456 };

    mockGetDoc.mockImplementationOnce(() => firstPromise);
    mockGetDoc.mockImplementationOnce(() =>
      Promise.resolve({ exists: () => true, data: () => secondData })
    );

    const { result, rerender } = renderHook(({ uid }) => useProfile(uid), {
      initialProps: { uid: "uid1" },
    });

    rerender({ uid: "uid2" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(secondData);

    // Resolving the stale first promise afterwards must not clobber state.
    resolveFirst!({ exists: () => true, data: () => ({ firstName: "Stale" }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.profile).toEqual(secondData);
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

describe("updateProfilePhoto", () => {
  beforeEach(() => {
    mockUploadBytes.mockReset();
    mockGetDownloadURL.mockReset();
    mockSetDoc.mockReset();
  });

  it("uploads the new photo and writes the profile doc, preserving name and createdAt", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/new-photo.jpg");
    mockSetDoc.mockResolvedValue(undefined);

    const current = { firstName: "Mert", lastName: "G", photoURL: "old-url", createdAt: 123 };
    const file = new File(["data"], "new-photo.jpg", { type: "image/jpeg" });
    const result = await updateProfilePhoto("uid1", current, file);

    expect(mockUploadBytes).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      firstName: "Mert",
      lastName: "G",
      photoURL: "https://example.com/new-photo.jpg",
      createdAt: 123,
    });
  });
});

describe("deleteProfile", () => {
  beforeEach(() => {
    mockDeleteDoc.mockReset();
  });

  it("deletes the profile doc for the given uid", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    await deleteProfile("uid1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ collection: "profiles", id: "uid1" });
  });
});
