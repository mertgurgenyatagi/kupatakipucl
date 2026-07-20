import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { useDevConfig, DEV_FAKE_UID } from "../devpanel/useDevConfig";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { config: devConfig } = useDevConfig();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Dev panel override: fakes the signed-in/out state for viewing purposes,
  // independent of the real Firebase Auth session underneath (Firestore
  // security rules still see the real session, so auth-gated writes still
  // work when actually signed in — this only fakes what the UI renders).
  if (import.meta.env.DEV && devConfig.loggedInOverride !== null) {
    const value = devConfig.loggedInOverride
      ? { user: { uid: DEV_FAKE_UID } as User, loading: false }
      : { user: null, loading: false };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
