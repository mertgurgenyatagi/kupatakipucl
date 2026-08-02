import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockOnSnapshot = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockCommit = vi.fn();
const mockWriteBatch = vi.fn((_db: unknown) => ({ set: mockSet, delete: mockDelete, commit: mockCommit }));
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...(args as [unknown])),
}));

const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockDeleteObject = vi.fn();
const mockRef = vi.fn((_storage: unknown, path: string) => ({ path }));

vi.mock("firebase/storage", () => ({
  ref: (...args: unknown[]) => mockRef(...(args as [unknown, string])),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
}));

vi.mock("../firebase", () => ({ db: {}, storage: {} }));

import { useProfile, saveProfile, updateProfilePhoto, deleteProfile } from "./useProfile";
import { IMMUTABLE_CACHE_CONTROL } from "../lib/compressImage";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;
type ErrorCallback = (err: Error) => void;
interface Captured {
  uid: string;
  onNext: SnapshotCallback;
  onError: ErrorCallback;
}

describe("useProfile", () => {
  let captured: Captured[];

  function lastFor(uid: string): Captured {
    const match = [...captured].reverse().find((c) => c.uid === uid);
    if (!match) throw new Error(`no onSnapshot call captured for uid ${uid}`);
    return match;
  }

  beforeEach(() => {
    captured = [];
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockSet.mockReset();
    clearSessionCache();
    mockOnSnapshot.mockImplementation(
      (docRef: { id: string }, onNext: SnapshotCallback, onError: ErrorCallback) => {
        captured.push({ uid: docRef.id, onNext, onError });
        return mockUnsubscribe;
      }
    );
  });

  it("returns loading=false and profile=null when uid is null", async () => {
    const { result } = renderHook(() => useProfile(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("returns profile=null when no profile doc exists", async () => {
    const { result } = renderHook(() => useProfile("uid1"));
    act(() => lastFor("uid1").onNext({ exists: () => false, data: () => undefined }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("returns the profile when a doc exists", async () => {
    const data = { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 123 };
    const { result } = renderHook(() => useProfile("uid1"));
    act(() => lastFor("uid1").onNext({ exists: () => true, data: () => data }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(data);
  });

  it("stops loading and leaves profile null when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useProfile("uid1"));
    act(() => lastFor("uid1").onError(new Error("permission-denied")));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load profile", expect.any(Error));
    expect(result.current.profile).toBeNull();
    consoleErrorSpy.mockRestore();
  });

  it("updates live when a later snapshot reflects a changed name/photo", async () => {
    const { result } = renderHook(() => useProfile("uid1"));
    const original = { firstName: "Mert", lastName: "G", photoURL: "old.jpg", createdAt: 1 };
    act(() => lastFor("uid1").onNext({ exists: () => true, data: () => original }));
    await waitFor(() => expect(result.current.profile).toEqual(original));

    const updated = { ...original, photoURL: "new.jpg" };
    act(() => lastFor("uid1").onNext({ exists: () => true, data: () => updated }));
    await waitFor(() => expect(result.current.profile).toEqual(updated));
  });

  it("shares one live subscription across two simultaneous mounts for the same uid", async () => {
    const first = renderHook(() => useProfile("uid1"));
    const second = renderHook(() => useProfile("uid1"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    const data = { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 1 };
    act(() => lastFor("uid1").onNext({ exists: () => true, data: () => data }));
    await waitFor(() => expect(first.result.current.profile).toEqual(data));
    await waitFor(() => expect(second.result.current.profile).toEqual(data));
  });

  it("only unsubscribes once every mount for that uid has unmounted", async () => {
    const first = renderHook(() => useProfile("uid1"));
    const second = renderHook(() => useProfile("uid1"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    second.unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite state with a stale profile when uid changes", async () => {
    const secondData = { firstName: "Second", lastName: "User", photoURL: "url2", createdAt: 456 };

    const { result, rerender } = renderHook(({ uid }) => useProfile(uid), {
      initialProps: { uid: "uid1" },
    });

    rerender({ uid: "uid2" });
    act(() => lastFor("uid2").onNext({ exists: () => true, data: () => secondData }));
    await waitFor(() => expect(result.current.profile).toEqual(secondData));

    // The old uid1 subscription was torn down on rerender — its onNext is
    // no longer wired to this hook instance's setState at all, so calling
    // it (simulating a slow, now-orphaned listener callback) must not
    // clobber the current uid2 state.
    act(() => lastFor("uid1").onNext({ exists: () => true, data: () => ({ firstName: "Stale" }) }));
    await Promise.resolve();
    expect(result.current.profile).toEqual(secondData);
  });
});

describe("saveProfile", () => {
  beforeEach(() => {
    mockUploadBytes.mockReset();
    mockGetDownloadURL.mockReset();
    mockSet.mockReset();
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockWriteBatch.mockClear();
  });

  it("uploads the photo, then batches profiles + publicProfiles writes with the resulting URL", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/photo.jpg");

    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await saveProfile("uid1", "Mert", "G", file);

    expect(mockUploadBytes).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      { collection: "profiles", id: "uid1" },
      { firstName: "Mert", lastName: "G", photoURL: "https://example.com/photo.jpg", createdAt: expect.any(Number) }
    );
    expect(mockSet).toHaveBeenCalledWith(
      { collection: "publicProfiles", id: "uid1" },
      { firstName: "Mert", photoURL: "https://example.com/photo.jpg", createdAt: expect.any(Number) }
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
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
    mockSet.mockReset();
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockWriteBatch.mockClear();
    mockDeleteObject.mockReset();
  });

  it("uploads the new photo and batches profiles + publicProfiles writes, preserving name and createdAt", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/new-photo.jpg");
    mockDeleteObject.mockResolvedValue(undefined);

    const current = { firstName: "Mert", lastName: "G", photoURL: "old-url", createdAt: 123 };
    const file = new File(["data"], "new-photo.jpg", { type: "image/jpeg" });
    const result = await updateProfilePhoto("uid1", current, file);

    expect(mockUploadBytes).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      { collection: "profiles", id: "uid1" },
      { firstName: "Mert", lastName: "G", photoURL: "https://example.com/new-photo.jpg", createdAt: 123 }
    );
    expect(mockSet).toHaveBeenCalledWith(
      { collection: "publicProfiles", id: "uid1" },
      { firstName: "Mert", photoURL: "https://example.com/new-photo.jpg", createdAt: 123 }
    );
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      firstName: "Mert",
      lastName: "G",
      photoURL: "https://example.com/new-photo.jpg",
      createdAt: 123,
    });
  });

  it("uploads to a fresh per-upload path (not the old fixed uid path) with an immutable cache-control", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/new-photo.jpg");
    mockDeleteObject.mockResolvedValue(undefined);

    const current = { firstName: "Mert", lastName: "G", photoURL: "old-url", createdAt: 123 };
    const file = new File(["data"], "new-photo.jpg", { type: "image/jpeg" });
    await updateProfilePhoto("uid1", current, file);

    const [, uploadPath] = mockRef.mock.calls[0];
    expect(uploadPath).toMatch(/^profile-photos\/uid1-\d+$/);
    expect(mockUploadBytes).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { cacheControl: IMMUTABLE_CACHE_CONTROL }
    );
  });

  it("best-effort deletes the previous photo (by its stored URL) after a successful update", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/new-photo.jpg");
    mockDeleteObject.mockResolvedValue(undefined);

    const current = { firstName: "Mert", lastName: "G", photoURL: "https://example.com/old-photo.jpg", createdAt: 123 };
    const file = new File(["data"], "new-photo.jpg", { type: "image/jpeg" });
    await updateProfilePhoto("uid1", current, file);

    expect(mockDeleteObject).toHaveBeenCalledTimes(1);
    expect(mockRef).toHaveBeenCalledWith({}, "https://example.com/old-photo.jpg");
  });

  it("does not throw, and still returns the updated profile, when deleting the old photo fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/new-photo.jpg");
    mockDeleteObject.mockRejectedValue(new Error("object-not-found"));

    const current = { firstName: "Mert", lastName: "G", photoURL: "https://example.com/old-photo.jpg", createdAt: 123 };
    const file = new File(["data"], "new-photo.jpg", { type: "image/jpeg" });
    const result = await updateProfilePhoto("uid1", current, file);

    expect(result.photoURL).toBe("https://example.com/new-photo.jpg");
    consoleErrorSpy.mockRestore();
  });
});

describe("deleteProfile", () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockWriteBatch.mockClear();
    mockDeleteObject.mockReset();
  });

  it("deletes both the profile and publicProfile docs for the given uid, in one batch", async () => {
    mockDeleteObject.mockResolvedValue(undefined);
    await deleteProfile("uid1", "https://example.com/photo.jpg");
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenCalledWith({ collection: "profiles", id: "uid1" });
    expect(mockDelete).toHaveBeenCalledWith({ collection: "publicProfiles", id: "uid1" });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("also deletes the profile photo from storage, by its stored URL", async () => {
    mockDeleteObject.mockResolvedValue(undefined);
    await deleteProfile("uid1", "https://example.com/photo.jpg");
    expect(mockDeleteObject).toHaveBeenCalledTimes(1);
    expect(mockRef).toHaveBeenCalledWith({}, "https://example.com/photo.jpg");
  });

  it("skips the storage delete entirely when there's no photoURL", async () => {
    await deleteProfile("uid1", null);
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it("does not throw when the photo delete fails (e.g. already gone)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockDeleteObject.mockRejectedValue(new Error("object-not-found"));
    await expect(deleteProfile("uid1", "https://example.com/photo.jpg")).resolves.toBeUndefined();
    consoleErrorSpy.mockRestore();
  });
});
