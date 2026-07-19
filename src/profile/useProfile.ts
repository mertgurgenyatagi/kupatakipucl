import { useEffect, useState } from "react";
// @ts-ignore - firebase SDK missing type definitions
import { doc, getDoc, setDoc, type DocumentSnapshot } from "firebase/firestore";
// @ts-ignore - firebase SDK missing type definitions
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { Profile } from "./profileTypes";

export function useProfile(uid: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, "profiles", uid)).then((snapshot: DocumentSnapshot) => {
      setProfile(snapshot.exists() ? (snapshot.data() as Profile) : null);
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
  const photoRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(photoRef, photoFile);
  const photoURL = await getDownloadURL(photoRef);
  const profile: Profile = { firstName, lastName, photoURL, createdAt: Date.now() };
  await setDoc(doc(db, "profiles", uid), profile);
  return profile;
}
