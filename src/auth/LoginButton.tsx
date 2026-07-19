import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

export function LoginButton() {
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error("Google sign-in failed", err);
      setError("Sign-in didn't go through, try again.");
    }
  }

  return (
    <div>
      <button onClick={handleClick}>Sign in with Google</button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
