import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./useProfile";
import { ProfileForm } from "./ProfileForm";
import { Profile } from "./profileTypes";

export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setSavedProfile(null);
  }, [user?.uid]);

  if (authLoading || (user && profileLoading)) {
    return null;
  }

  if (user && !profile && !savedProfile) {
    return <ProfileForm uid={user.uid} onSaved={setSavedProfile} />;
  }

  return <>{children}</>;
}
