import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export function LogoutButton() {
  return <button onClick={() => signOut(auth)}>Sign out</button>;
}
