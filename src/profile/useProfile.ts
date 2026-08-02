import { useEffect, useState } from "react";
import { doc, onSnapshot, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { Profile } from "./profileTypes";
import { compressImage, IMMUTABLE_CACHE_CONTROL } from "../lib/compressImage";
import { getCached, setCached, deleteCached } from "../lib/sessionCache";

// Profile photos only ever render in small avatar frames — the single
// largest use anywhere on the site is 56px (Home's greeting avatar), most
// are 20-40px. 96px covers that with some retina headroom; quality 0.5 is
// a deliberately aggressive trade given a free-tier Storage budget with a
// hard billing killswitch behind it, not a soft cost ceiling (2026-07-31).
const PROFILE_PHOTO_MAX_DIMENSION = 96;
const PROFILE_PHOTO_QUALITY = 0.5;

function cacheKey(uid: string): string {
  return `profile:${uid}`;
}

/**
 * not-started-audit item 09/20: this used to be a one-shot `getDoc`, cached
 * per session — so a changed name/photo never reached anyone else already
 * on the site until a hard reload, and every uid that happened to be
 * mounted twice at once (AppShell's nav avatar + the routed page underneath
 * it both call `useProfile(uid)` independently) fired two separate reads
 * before either could populate the shared cache for the other.
 *
 * Fixed by making it a live listener, shared per uid: the first mount for a
 * given uid opens the one `onSnapshot` subscription; every later mount for
 * that same uid just joins its listener set instead of opening a second
 * one, and the subscription only actually closes once nobody's watching
 * that uid anymore.
 */
interface ProfileSubscription {
  unsubscribe: () => void;
  listeners: Set<(profile: Profile | null) => void>;
  latest: Profile | null | undefined; // undefined = no snapshot received yet
}

const subscriptions = new Map<string, ProfileSubscription>();

function subscribeToProfile(uid: string, onChange: (profile: Profile | null) => void): () => void {
  let sub = subscriptions.get(uid);
  if (!sub) {
    // `thisSub` is captured by reference below so a callback belonging to a
    // subscription that's since been torn down (and possibly replaced by a
    // fresh one for the same uid, e.g. a quick unmount+remount) can tell
    // it's stale via identity, not just by checking the map still has *an*
    // entry for this uid.
    const thisSub: ProfileSubscription = {
      unsubscribe: () => {},
      listeners: new Set(),
      latest: undefined,
    };
    thisSub.unsubscribe = onSnapshot(
      doc(db, "profiles", uid),
      (snapshot) => {
        if (subscriptions.get(uid) !== thisSub) return;
        const next = snapshot.exists() ? (snapshot.data() as Profile) : null;
        thisSub.latest = next;
        if (next) setCached(cacheKey(uid), next);
        thisSub.listeners.forEach((listener) => listener(next));
      },
      (err: Error) => {
        console.error("Failed to load profile", err);
      }
    );
    subscriptions.set(uid, thisSub);
    sub = thisSub;
  }
  sub.listeners.add(onChange);
  if (sub.latest !== undefined) onChange(sub.latest);

  return () => {
    const current = subscriptions.get(uid);
    if (!current) return;
    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.unsubscribe();
      subscriptions.delete(uid);
    }
  };
}

export function useProfile(uid: string | null) {
  const [profile, setProfile] = useState<Profile | null>(() => (uid ? (getCached<Profile>(cacheKey(uid)) ?? null) : null));
  const [loading, setLoading] = useState(() => (uid ? getCached<Profile>(cacheKey(uid)) === undefined : false));

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Already have this uid's profile from an earlier mount this session —
    // show it immediately, then let the live subscription silently
    // reconcile it below (its first callback fires fast from Firestore's
    // local cache, ahead of any network round-trip).
    const cached = getCached<Profile>(cacheKey(uid));
    if (cached !== undefined) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    return subscribeToProfile(uid, (next) => {
      setProfile(next);
      setLoading(false);
    });
  }, [uid]);

  return { profile, loading };
}

export async function saveProfile(
  uid: string,
  firstName: string,
  lastName: string,
  photoFile: File
): Promise<Profile> {
  const compressed = await compressImage(photoFile, {
    maxDimension: PROFILE_PHOTO_MAX_DIMENSION,
    quality: PROFILE_PHOTO_QUALITY,
  });
  const photoRef = ref(storage, `profile-photos/${uid}-${Date.now()}`);
  await uploadBytes(photoRef, compressed, { cacheControl: IMMUTABLE_CACHE_CONTROL });
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { firstName, lastName, photoURL, createdAt: Date.now() };
  const batch = writeBatch(db);
  batch.set(doc(db, "profiles", uid), profile);
  batch.set(doc(db, "publicProfiles", uid), {
    firstName: profile.firstName,
    photoURL: profile.photoURL,
    createdAt: profile.createdAt,
  });
  await batch.commit();
  setCached(cacheKey(uid), profile);
  return profile;
}

export async function updateProfilePhoto(
  uid: string,
  current: Profile,
  photoFile: File
): Promise<Profile> {
  const compressed = await compressImage(photoFile, {
    maxDimension: PROFILE_PHOTO_MAX_DIMENSION,
    quality: PROFILE_PHOTO_QUALITY,
  });
  const photoRef = ref(storage, `profile-photos/${uid}-${Date.now()}`);
  await uploadBytes(photoRef, compressed, { cacheControl: IMMUTABLE_CACHE_CONTROL });
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { ...current, photoURL };
  const batch = writeBatch(db);
  batch.set(doc(db, "profiles", uid), profile);
  batch.set(doc(db, "publicProfiles", uid), {
    firstName: profile.firstName,
    photoURL: profile.photoURL,
    createdAt: profile.createdAt,
  });
  await batch.commit();
  setCached(cacheKey(uid), profile);
  // Each upload now gets its own never-reused path (so the immutable cache
  // header above is safe to set), which means — unlike the old fixed-path
  // scheme, where a re-upload overwrote the previous object for free — the
  // previous photo is now an orphan and has to be cleaned up explicitly, or
  // Storage usage would grow with every photo change instead of staying flat.
  // Best-effort: a delete failing here shouldn't undo the photo change that
  // already succeeded.
  if (current.photoURL) {
    try {
      await deleteObject(ref(storage, current.photoURL));
    } catch (err) {
      console.error("Failed to delete previous profile photo from storage", err);
    }
  }
  return profile;
}

export async function deleteProfile(uid: string, photoURL: string | null): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "profiles", uid));
  batch.delete(doc(db, "publicProfiles", uid));
  await batch.commit();
  deleteCached(cacheKey(uid));
  // not-started-audit item 08: the photo used to stay in Storage forever,
  // publicly readable at a predictable URL, for an account that's otherwise
  // fully gone. Best-effort — a missing/already-deleted object shouldn't
  // surface as a failure of the (already-committed) profile deletion.
  // Deletes by the profile's own stored photoURL (rather than a guessed
  // fixed path) since each upload now lives at its own unique path.
  if (photoURL) {
    try {
      await deleteObject(ref(storage, photoURL));
    } catch (err) {
      console.error("Failed to delete profile photo from storage", err);
    }
  }
}
