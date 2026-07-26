import { useEffect, useState } from "react";
import { doc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Profile } from "./profileTypes";
import { compressImage } from "../lib/compressImage";
import { getCached, setCached, deleteCached } from "../lib/sessionCache";

// Profile photos only ever render in small avatar frames (size-6 to
// size-8 in most spots, a bit larger on the profile page itself) — 256px
// is generous headroom for that, and keeps uploads tiny.
const PROFILE_PHOTO_MAX_DIMENSION = 256;

function cacheKey(uid: string): string {
  return `profile:${uid}`;
}

export function useProfile(uid: string | null) {
  const [profile, setProfile] = useState<Profile | null>(() => (uid ? (getCached<Profile>(cacheKey(uid)) ?? null) : null));
  const [loading, setLoading] = useState(() => (uid ? getCached<Profile>(cacheKey(uid)) === undefined : false));

  useEffect(() => {
    let ignore = false;

    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const cached = getCached<Profile>(cacheKey(uid));
    if (cached !== undefined) {
      // Already have this uid's profile from an earlier mount this
      // session — show it immediately, then silently revalidate below.
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getDoc(doc(db, "profiles", uid))
      .then((snapshot) => {
        if (ignore) return;
        const next = snapshot.exists() ? (snapshot.data() as Profile) : null;
        if (next) setCached(cacheKey(uid), next);
        setProfile(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load profile", err);
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [uid]);

  return { profile, loading };
}

export async function saveProfile(
  uid: string,
  firstName: string,
  lastName: string,
  photoFile: File
): Promise<Profile> {
  const compressed = await compressImage(photoFile, { maxDimension: PROFILE_PHOTO_MAX_DIMENSION });
  const photoRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(photoRef, compressed);
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { firstName, lastName, photoURL, createdAt: Date.now() };
  await setDoc(doc(db, "profiles", uid), profile);
  setCached(cacheKey(uid), profile);
  return profile;
}

export async function updateProfilePhoto(
  uid: string,
  current: Profile,
  photoFile: File
): Promise<Profile> {
  const compressed = await compressImage(photoFile, { maxDimension: PROFILE_PHOTO_MAX_DIMENSION });
  const photoRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(photoRef, compressed);
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { ...current, photoURL };
  await setDoc(doc(db, "profiles", uid), profile);
  setCached(cacheKey(uid), profile);
  return profile;
}

export async function deleteProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "profiles", uid));
  deleteCached(cacheKey(uid));
}
