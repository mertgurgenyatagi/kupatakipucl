import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Profile } from "./profileTypes";

export function useProfile(uid: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, "profiles", uid))
      .then((snapshot) => {
        if (ignore) return;
        setProfile(snapshot.exists() ? (snapshot.data() as Profile) : null);
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
  const photoRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(photoRef, photoFile);
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { firstName, lastName, photoURL, createdAt: Date.now() };
  await setDoc(doc(db, "profiles", uid), profile);
  return profile;
}
