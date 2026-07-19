# Auth + Four-State Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Vite + React + TypeScript app with Google sign-in and correct routing/nav-gating across the four visibility states from `SPEC.md` §8, with empty placeholders for every future section.

**Architecture:** Client-only static SPA (Vite build, `HashRouter`), Firebase Auth (Google provider) for sign-in, two independent pieces of client-computed state (`isLoggedIn`, `tournamentPhase`) combined into one `VisibilityState` that drives nav visibility and page access everywhere.

**Tech Stack:** Vite, React 18, TypeScript, react-router-dom v6, firebase v10 (Auth only in this plan), Vitest + React Testing Library + jsdom for tests.

## Global Constraints

- Tournament-start cutoff is Sept 8, 2026 00:00 Europe/Istanbul. Turkey has used a fixed UTC+3 offset with no DST since 2016, so this is a static UTC instant: `2026-09-07T21:00:00Z`. (`SPEC.md` §2)
- Site is Turkish-only (`SPEC.md` §9) — `index.html` sets `lang="tr"` now even though real copy lands in later units.
- Must work as a static build with no server, and must survive a hard refresh on a deep link, and must work whether served from a domain root or a subpath (`SPEC.md` §7a — eventual home is `mertgurgenyatagi.github.io/kupatakipucl/`). Addressed via `HashRouter` + Vite's `base: "./"`.
- Backend is Firebase, reusing Mert's existing Firebase account (`SPEC.md` §7a, confirmed in design doc). This plan only touches Firebase Auth — Firestore/Storage are out of scope here.
- No CI/test framework mandate from the project itself, but this plan adds Vitest + React Testing Library because the state-matrix logic is exactly the kind of thing that's easy to get subtly wrong, and it costs almost nothing to add on top of Vite. Manual click-through (with a dev-only date override) covers what automated tests can't reach (the real Google OAuth popup).
- No placeholder/lorem-ipsum copy needed to be "real Turkish" — bracketed English dev-labels are fine per the design doc's Non-Goals.

## File Structure

```
package.json              - deps/scripts (grows across tasks)
tsconfig.json              - TS config for src/
tsconfig.node.json         - TS config for vite.config.ts
vite.config.ts              - Vite + Vitest config, base: "./"
index.html                  - HTML entry, lang="tr"
.env.example                 - documents required Firebase env vars (committed)
.gitignore                    - adds node_modules/, dist/, .env.local
test/setup.ts                  - jest-dom matcher setup for Vitest
src/main.tsx                    - React root entry
src/App.tsx                      - top-level: AuthProvider + HashRouter + AppShell + Routes
src/firebase.ts                    - initializeApp/getAuth using Vite env vars
src/auth/AuthProvider.tsx           - context wrapping onAuthStateChanged
src/auth/LoginButton.tsx             - Google sign-in button + inline error
src/auth/LogoutButton.tsx             - sign-out button
src/tournament/tournamentPhase.ts      - pure getTournamentPhase(now): "pre" | "post"
src/tournament/useTournamentPhase.ts     - hook wrapping the pure fn + dev debugDate override
src/state/visibilityState.ts               - pure getVisibilityState(isLoggedIn, phase)
src/state/pageAccess.ts                      - which VisibilityState may see which page
src/state/useVisibilityState.ts                - combines auth + phase into one VisibilityState
src/shell/AppShell.tsx                           - header, gated nav, login/logout control
src/pages/HomePage.tsx                             - per-state placeholder copy
src/pages/PlaceholderPage.tsx                        - shared "coming soon" / "not available" page
src/pages/PredictionsPage.tsx, LeaderboardPage.tsx, ChatPage.tsx, ForumPage.tsx, StatsPage.tsx
                                                        - thin wrappers around PlaceholderPage
```

---

### Task 1: Project Scaffolding + Test Infrastructure

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `test/setup.ts`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `App` — a React component, default export not used (named export `App`), imported by `src/main.tsx`.

- [ ] **Step 1: Create config and scaffolding files**

`package.json`:
```json
{
  "name": "kupatakipucl",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "test"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>#kupatakipucl</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`test/setup.ts`:
```ts
import "@testing-library/jest-dom";
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Modify `.gitignore` (append to the existing `.claude/` line):
```
.claude/
node_modules/
dist/
.env.local
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs with no errors, creates `package-lock.json`.

- [ ] **Step 3: Write the failing smoke test**

`src/App.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the site name", () => {
    render(<App />);
    expect(screen.getByText("#kupatakipucl")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `src/App.tsx` does not exist yet (module not found).

- [ ] **Step 5: Write minimal implementation**

`src/App.tsx`:
```tsx
export function App() {
  return <p>#kupatakipucl</p>;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html test/setup.ts src/main.tsx src/App.tsx src/App.test.tsx .gitignore
git commit -m "$(cat <<'EOF'
Scaffold Vite + React + TypeScript project with Vitest

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Tournament Phase Logic

**Files:**
- Create: `src/tournament/tournamentPhase.ts`, `src/tournament/tournamentPhase.test.ts`, `src/tournament/useTournamentPhase.ts`, `src/tournament/useTournamentPhase.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getTournamentPhase(now: Date): "pre" | "post"`, `useTournamentPhase(): "pre" | "post"`, type `TournamentPhase = "pre" | "post"`. Later tasks (3, 6, 8, 9, 10) import `useTournamentPhase` and the `TournamentPhase` type from `src/tournament/useTournamentPhase.ts` and `src/tournament/tournamentPhase.ts` respectively.

- [ ] **Step 1: Write the failing tests for the pure function**

`src/tournament/tournamentPhase.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getTournamentPhase } from "./tournamentPhase";

describe("getTournamentPhase", () => {
  it("returns 'pre' just before the Istanbul cutoff instant", () => {
    const oneSecondBefore = new Date("2026-09-07T20:59:59Z");
    expect(getTournamentPhase(oneSecondBefore)).toBe("pre");
  });

  it("returns 'post' at exactly the Istanbul cutoff instant", () => {
    const exactCutoff = new Date("2026-09-07T21:00:00Z");
    expect(getTournamentPhase(exactCutoff)).toBe("post");
  });

  it("returns 'post' well after the cutoff", () => {
    const wellAfter = new Date("2027-01-01T00:00:00Z");
    expect(getTournamentPhase(wellAfter)).toBe("post");
  });

  it("returns 'pre' well before the cutoff", () => {
    const wellBefore = new Date("2026-01-01T00:00:00Z");
    expect(getTournamentPhase(wellBefore)).toBe("pre");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tournament/tournamentPhase.test.ts`
Expected: FAIL — `./tournamentPhase` does not exist.

- [ ] **Step 3: Implement the pure function**

`src/tournament/tournamentPhase.ts`:
```ts
// Turkey (Europe/Istanbul) has used a fixed UTC+3 offset with no DST since 2016,
// so the cutoff can be a static UTC instant rather than needing a timezone library.
const TOURNAMENT_START_UTC = new Date("2026-09-07T21:00:00Z"); // Sept 8, 2026 00:00 Istanbul

export type TournamentPhase = "pre" | "post";

export function getTournamentPhase(now: Date): TournamentPhase {
  return now.getTime() >= TOURNAMENT_START_UTC.getTime() ? "post" : "pre";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/tournament/tournamentPhase.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing tests for the hook**

`src/tournament/useTournamentPhase.test.ts`:
```ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { useTournamentPhase } from "./useTournamentPhase";

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

describe("useTournamentPhase", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("reports pre before the cutoff via debug override", () => {
    setDebugDate("2026-01-01");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("pre");
  });

  it("reports post at/after the cutoff via debug override", () => {
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("post");
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/tournament/useTournamentPhase.test.ts`
Expected: FAIL — `./useTournamentPhase` does not exist.

- [ ] **Step 7: Implement the hook**

`src/tournament/useTournamentPhase.ts`:
```ts
import { useEffect, useState } from "react";
import { getTournamentPhase, TournamentPhase } from "./tournamentPhase";

function resolveNow(): Date {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    const debugDate = params.get("debugDate");
    if (debugDate) {
      const parsed = new Date(debugDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}

export function useTournamentPhase(): TournamentPhase {
  const [phase, setPhase] = useState<TournamentPhase>(() => getTournamentPhase(resolveNow()));

  useEffect(() => {
    const recompute = () => setPhase(getTournamentPhase(resolveNow()));
    window.addEventListener("focus", recompute);
    return () => window.removeEventListener("focus", recompute);
  }, []);

  return phase;
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/tournament/useTournamentPhase.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add src/tournament
git commit -m "$(cat <<'EOF'
Add tournament phase logic with dev-only debug date override

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Visibility State Derivation

**Files:**
- Create: `src/state/visibilityState.ts`, `src/state/visibilityState.test.ts`

**Interfaces:**
- Consumes: `TournamentPhase` type from `src/tournament/tournamentPhase.ts` (Task 2).
- Produces: `type VisibilityState = "NST_NLI" | "NST_LI" | "ST_NLI" | "ST_LI"`, `getVisibilityState(isLoggedIn: boolean, phase: TournamentPhase): VisibilityState`. Used by Tasks 6, 9.

- [ ] **Step 1: Write the failing tests**

`src/state/visibilityState.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getVisibilityState } from "./visibilityState";

describe("getVisibilityState", () => {
  it("returns NST_NLI when pre-tournament and logged out", () => {
    expect(getVisibilityState(false, "pre")).toBe("NST_NLI");
  });

  it("returns NST_LI when pre-tournament and logged in", () => {
    expect(getVisibilityState(true, "pre")).toBe("NST_LI");
  });

  it("returns ST_NLI when post-tournament and logged out", () => {
    expect(getVisibilityState(false, "post")).toBe("ST_NLI");
  });

  it("returns ST_LI when post-tournament and logged in", () => {
    expect(getVisibilityState(true, "post")).toBe("ST_LI");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/visibilityState.test.ts`
Expected: FAIL — `./visibilityState` does not exist.

- [ ] **Step 3: Implement**

`src/state/visibilityState.ts`:
```ts
import { TournamentPhase } from "../tournament/tournamentPhase";

export type VisibilityState = "NST_NLI" | "NST_LI" | "ST_NLI" | "ST_LI";

export function getVisibilityState(
  isLoggedIn: boolean,
  phase: TournamentPhase
): VisibilityState {
  if (phase === "pre") {
    return isLoggedIn ? "NST_LI" : "NST_NLI";
  }
  return isLoggedIn ? "ST_LI" : "ST_NLI";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/visibilityState.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/state/visibilityState.ts src/state/visibilityState.test.ts
git commit -m "$(cat <<'EOF'
Add pure visibility-state derivation for the four SPEC.md states

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Firebase Init + AuthProvider

**Files:**
- Create: `src/firebase.ts`, `src/auth/AuthProvider.tsx`, `src/auth/AuthProvider.test.tsx`, `.env.example`
- Modify: `package.json` (add `firebase` dependency)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `AuthProvider` (component, wraps children), `useAuth(): { user: User | null; loading: boolean }` from `src/auth/AuthProvider.tsx`. `auth` (Firebase Auth instance) from `src/firebase.ts`. Used by Tasks 5, 6, 7, 8, 9, 10.

- [ ] **Step 1: Add the firebase dependency**

Modify `package.json` — add to `"dependencies"`:
```json
    "firebase": "^10.13.0",
```
(alphabetical order alongside `react`/`react-dom`)

Run: `npm install`
Expected: installs with no errors.

- [ ] **Step 2: Create the env template**

`.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 3: Create the Firebase init module**

`src/firebase.ts`:
```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
```

This file has no test — it's a thin, side-effecting wrapper around the Firebase SDK with no logic of its own to assert on. Task 11 verifies it works via real manual sign-in against a real Firebase project.

- [ ] **Step 4: Write the failing tests for AuthProvider**

`src/auth/AuthProvider.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

const mockOnAuthStateChanged = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

function TestConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? `signed-in:${user.uid}` : "signed-out"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockOnAuthStateChanged.mockReset();
  });

  it("shows loading before auth state resolves", () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows signed-out state when the callback receives null", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("signed-out")).toBeInTheDocument());
  });

  it("shows signed-in state with uid when the callback receives a user", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ uid: "abc123" });
      return () => {};
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByText("signed-in:abc123")).toBeInTheDocument()
    );
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    function ConsumerWithoutProvider() {
      useAuth();
      return null;
    }
    expect(() => render(<ConsumerWithoutProvider />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npx vitest run src/auth/AuthProvider.test.tsx`
Expected: FAIL — `./AuthProvider` does not exist.

- [ ] **Step 6: Implement AuthProvider**

`src/auth/AuthProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run src/auth/AuthProvider.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/firebase.ts src/auth/AuthProvider.tsx src/auth/AuthProvider.test.tsx .env.example
git commit -m "$(cat <<'EOF'
Add Firebase init and AuthProvider context

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: LoginButton + LogoutButton

**Files:**
- Create: `src/auth/LoginButton.tsx`, `src/auth/LoginButton.test.tsx`, `src/auth/LogoutButton.tsx`, `src/auth/LogoutButton.test.tsx`

**Interfaces:**
- Consumes: `auth` from `src/firebase.ts` (Task 4).
- Produces: `LoginButton`, `LogoutButton` components. Used by Task 7 (`AppShell`).

- [ ] **Step 1: Write the failing tests for LoginButton**

`src/auth/LoginButton.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginButton } from "./LoginButton";

const mockSignIn = vi.fn();

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

describe("LoginButton", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
  });

  it("calls signInWithPopup when clicked", async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<LoginButton />);
    fireEvent.click(screen.getByText("Sign in with Google"));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
  });

  it("shows an inline error when sign-in fails", async () => {
    mockSignIn.mockRejectedValue(new Error("popup-closed-by-user"));
    render(<LoginButton />);
    fireEvent.click(screen.getByText("Sign in with Google"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Sign-in didn't go through, try again."
      )
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/auth/LoginButton.test.tsx`
Expected: FAIL — `./LoginButton` does not exist.

- [ ] **Step 3: Implement LoginButton**

`src/auth/LoginButton.tsx`:
```tsx
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";

export function LoginButton() {
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/auth/LoginButton.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for LogoutButton**

`src/auth/LogoutButton.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LogoutButton } from "./LogoutButton";

const mockSignOut = vi.fn();

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock("../firebase", () => ({ auth: {} }));

describe("LogoutButton", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
  });

  it("calls signOut when clicked", async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<LogoutButton />);
    fireEvent.click(screen.getByText("Sign out"));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/auth/LogoutButton.test.tsx`
Expected: FAIL — `./LogoutButton` does not exist.

- [ ] **Step 7: Implement LogoutButton**

`src/auth/LogoutButton.tsx`:
```tsx
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export function LogoutButton() {
  return <button onClick={() => signOut(auth)}>Sign out</button>;
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/auth/LogoutButton.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 9: Commit**

```bash
git add src/auth/LoginButton.tsx src/auth/LoginButton.test.tsx src/auth/LogoutButton.tsx src/auth/LogoutButton.test.tsx
git commit -m "$(cat <<'EOF'
Add Google LoginButton and LogoutButton components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Page Access Rules + Combined Visibility Hook

**Files:**
- Create: `src/state/pageAccess.ts`, `src/state/pageAccess.test.ts`, `src/state/useVisibilityState.ts`

**Interfaces:**
- Consumes: `VisibilityState` from `src/state/visibilityState.ts` (Task 3), `useAuth` from `src/auth/AuthProvider.tsx` (Task 4), `useTournamentPhase` from `src/tournament/useTournamentPhase.ts` (Task 2).
- Produces: `type PageKey = "predictions" | "leaderboard" | "chat" | "forum" | "stats"`, `isPageAllowed(page: PageKey, state: VisibilityState): boolean`, `useVisibilityState(): VisibilityState`. Used by Tasks 7, 8, 9, 10.

Per `SPEC.md` §8: NST-NLI sees neither chat nor forum; NST-LI sees predictions (round-1 submission window is Aug 26 → Sept 8, entirely pre-tournament), chat, and forum; ST-NLI sees leaderboard/stats/forum but explicitly not chat; ST-LI sees everything (round-2 submission window Feb 26 → Mar 9 falls after Sept 8, i.e. inside "started").

- [ ] **Step 1: Write the failing tests**

`src/state/pageAccess.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isPageAllowed } from "./pageAccess";

describe("isPageAllowed", () => {
  it("blocks every gated page for NST_NLI", () => {
    expect(isPageAllowed("predictions", "NST_NLI")).toBe(false);
    expect(isPageAllowed("leaderboard", "NST_NLI")).toBe(false);
    expect(isPageAllowed("chat", "NST_NLI")).toBe(false);
    expect(isPageAllowed("forum", "NST_NLI")).toBe(false);
    expect(isPageAllowed("stats", "NST_NLI")).toBe(false);
  });

  it("allows predictions, chat and forum (not leaderboard/stats) for NST_LI", () => {
    expect(isPageAllowed("predictions", "NST_LI")).toBe(true);
    expect(isPageAllowed("chat", "NST_LI")).toBe(true);
    expect(isPageAllowed("forum", "NST_LI")).toBe(true);
    expect(isPageAllowed("leaderboard", "NST_LI")).toBe(false);
    expect(isPageAllowed("stats", "NST_LI")).toBe(false);
  });

  it("allows leaderboard, stats and forum but not chat or predictions for ST_NLI", () => {
    expect(isPageAllowed("leaderboard", "ST_NLI")).toBe(true);
    expect(isPageAllowed("stats", "ST_NLI")).toBe(true);
    expect(isPageAllowed("forum", "ST_NLI")).toBe(true);
    expect(isPageAllowed("chat", "ST_NLI")).toBe(false);
    expect(isPageAllowed("predictions", "ST_NLI")).toBe(false);
  });

  it("allows every gated page for ST_LI", () => {
    expect(isPageAllowed("predictions", "ST_LI")).toBe(true);
    expect(isPageAllowed("leaderboard", "ST_LI")).toBe(true);
    expect(isPageAllowed("chat", "ST_LI")).toBe(true);
    expect(isPageAllowed("forum", "ST_LI")).toBe(true);
    expect(isPageAllowed("stats", "ST_LI")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/pageAccess.test.ts`
Expected: FAIL — `./pageAccess` does not exist.

- [ ] **Step 3: Implement pageAccess**

`src/state/pageAccess.ts`:
```ts
import { VisibilityState } from "./visibilityState";

export type PageKey = "predictions" | "leaderboard" | "chat" | "forum" | "stats";

const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: ["NST_LI", "ST_LI"],
  leaderboard: ["ST_NLI", "ST_LI"],
  chat: ["NST_LI", "ST_LI"],
  forum: ["NST_LI", "ST_NLI", "ST_LI"],
  stats: ["ST_NLI", "ST_LI"],
};

export function isPageAllowed(page: PageKey, state: VisibilityState): boolean {
  return PAGE_ACCESS[page].includes(state);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/pageAccess.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Implement the combined hook (no separate test — pure composition of already-tested pieces)**

`src/state/useVisibilityState.ts`:
```ts
import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "./visibilityState";

export function useVisibilityState(): VisibilityState {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  return getVisibilityState(Boolean(user), phase);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/state/pageAccess.ts src/state/pageAccess.test.ts src/state/useVisibilityState.ts
git commit -m "$(cat <<'EOF'
Add per-page access rules and combined visibility-state hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: AppShell (Header + Gated Nav)

**Files:**
- Create: `src/shell/AppShell.tsx`, `src/shell/AppShell.test.tsx`
- Modify: `package.json` (add `react-router-dom` dependency)

**Interfaces:**
- Consumes: `useAuth` from `src/auth/AuthProvider.tsx` (Task 4), `useTournamentPhase` from `src/tournament/useTournamentPhase.ts` (Task 2), `getVisibilityState` from `src/state/visibilityState.ts` (Task 3), `LoginButton`/`LogoutButton` from Task 5.
- Produces: `AppShell` component, takes `{ children: ReactNode }`. Used by Task 10 (`App.tsx`).

`AppShell` computes its own visibility state directly from `useAuth`/`useTournamentPhase` (not via `useVisibilityState` from Task 6) so its tests can mock `useAuth` alone without also needing to mock the combined hook module — keeps the test setup in this task self-contained.

- [ ] **Step 1: Add react-router-dom dependency**

Modify `package.json` — add to `"dependencies"`:
```json
    "react-router-dom": "^6.26.0",
```

Run: `npm install`
Expected: installs with no errors.

- [ ] **Step 2: Write the failing tests**

`src/shell/AppShell.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, afterEach } from "vitest";
import { AppShell } from "./AppShell";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../auth/LoginButton", () => ({
  LoginButton: () => <button>Sign in with Google</button>,
}));

vi.mock("../auth/LogoutButton", () => ({
  LogoutButton: () => <button>Sign out</button>,
}));

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

function renderShell() {
  render(
    <MemoryRouter>
      <AppShell>
        <div>content</div>
      </AppShell>
    </MemoryRouter>
  );
}

describe("AppShell nav gating", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("shows only Home when not started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-01-01");
    renderShell();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Chat")).not.toBeInTheDocument();
    expect(screen.queryByText("Forum")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
  });

  it("shows predictions, chat and forum when not started but logged in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-01-01");
    renderShell();
    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
  });

  it("shows leaderboard, stats and forum but not chat when started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-09-09");
    renderShell();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.queryByText("Chat")).not.toBeInTheDocument();
  });

  it("shows every link when started and logged in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-09-09");
    renderShell();
    for (const label of ["Predictions", "Leaderboard", "Chat", "Forum", "Stats"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows LoginButton when logged out and LogoutButton when logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-01-01");
    renderShell();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    renderShell();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/shell/AppShell.test.tsx`
Expected: FAIL — `./AppShell` does not exist.

- [ ] **Step 4: Implement AppShell**

`src/shell/AppShell.tsx`:
```tsx
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "../state/visibilityState";
import { LoginButton } from "../auth/LoginButton";
import { LogoutButton } from "../auth/LogoutButton";

interface NavLink {
  path: string;
  label: string;
}

const NAV_LINKS: Record<VisibilityState, NavLink[]> = {
  NST_NLI: [{ path: "/", label: "Home" }],
  NST_LI: [
    { path: "/", label: "Home" },
    { path: "/predictions", label: "Predictions" },
    { path: "/chat", label: "Chat" },
    { path: "/forum", label: "Forum" },
  ],
  ST_NLI: [
    { path: "/", label: "Home" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/stats", label: "Stats" },
    { path: "/forum", label: "Forum" },
  ],
  ST_LI: [
    { path: "/", label: "Home" },
    { path: "/predictions", label: "Predictions" },
    { path: "/leaderboard", label: "Leaderboard" },
    { path: "/chat", label: "Chat" },
    { path: "/forum", label: "Forum" },
    { path: "/stats", label: "Stats" },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const phase = useTournamentPhase();
  const state = getVisibilityState(Boolean(user), phase);
  const links = NAV_LINKS[state];

  return (
    <div>
      <header>
        <span>#kupatakipucl</span>
        <nav>
          {links.map((link) => (
            <Link key={link.path} to={link.path}>
              {link.label}
            </Link>
          ))}
        </nav>
        {!loading && (user ? <LogoutButton /> : <LoginButton />)}
      </header>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/shell/AppShell.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/shell/AppShell.tsx src/shell/AppShell.test.tsx
git commit -m "$(cat <<'EOF'
Add AppShell with per-state gated navigation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: HomePage

**Files:**
- Create: `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `useTournamentPhase` (Task 2), `getVisibilityState` (Task 3).
- Produces: `HomePage` component. Used by Task 10 (`App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/pages/HomePage.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

describe("HomePage", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("shows the not-started/logged-out placeholder", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-01-01");
    render(<HomePage />);
    expect(screen.getByText(/Not started, not logged in/)).toBeInTheDocument();
  });

  it("shows the not-started/logged-in placeholder", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-01-01");
    render(<HomePage />);
    expect(screen.getByText(/Not started, logged in/)).toBeInTheDocument();
  });

  it("shows the started/logged-out placeholder", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-09-09");
    render(<HomePage />);
    expect(screen.getByText(/Started, not logged in/)).toBeInTheDocument();
  });

  it("shows the started/logged-in placeholder", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-09-09");
    render(<HomePage />);
    expect(screen.getByText(/Started, logged in/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — `./HomePage` does not exist.

- [ ] **Step 3: Implement HomePage**

`src/pages/HomePage.tsx`:
```tsx
import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "../state/visibilityState";

const PLACEHOLDER_COPY: Record<VisibilityState, string> = {
  NST_NLI: "[Placeholder] Not started, not logged in: mission blurb + sign-up countdown go here.",
  NST_LI: "[Placeholder] Not started, logged in: prediction submission countdown + rules go here.",
  ST_NLI: "[Placeholder] Started, not logged in: live rankings + stats go here.",
  ST_LI: "[Placeholder] Started, logged in: full dashboard goes here.",
};

export function HomePage() {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  const state = getVisibilityState(Boolean(user), phase);
  return <p>{PLACEHOLDER_COPY[state]}</p>;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "$(cat <<'EOF'
Add HomePage with per-state placeholder content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Placeholder Pages (Predictions/Leaderboard/Chat/Forum/Stats)

**Files:**
- Create: `src/pages/PlaceholderPage.tsx`, `src/pages/PlaceholderPage.test.tsx`, `src/pages/PredictionsPage.tsx`, `src/pages/LeaderboardPage.tsx`, `src/pages/ChatPage.tsx`, `src/pages/ForumPage.tsx`, `src/pages/StatsPage.tsx`

**Interfaces:**
- Consumes: `useVisibilityState` (Task 6), `isPageAllowed`/`PageKey` (Task 6).
- Produces: `PlaceholderPage` (takes `{ page: PageKey; label: string }`), and five page components with no props, each rendering `PlaceholderPage` with its own `page`/`label`. Used by Task 10 (`App.tsx`).

- [ ] **Step 1: Write the failing tests for PlaceholderPage**

`src/pages/PlaceholderPage.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { PlaceholderPage } from "./PlaceholderPage";

const mockUseVisibilityState = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

describe("PlaceholderPage", () => {
  it("shows the coming-soon label when the page is allowed for the current state", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    render(<PlaceholderPage page="leaderboard" label="Leaderboard" />);
    expect(screen.getByText("Leaderboard — coming soon.")).toBeInTheDocument();
  });

  it("shows a blocked message when the page is not allowed for the current state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<PlaceholderPage page="leaderboard" label="Leaderboard" />);
    expect(
      screen.getByText("This section isn't available right now.")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/PlaceholderPage.test.tsx`
Expected: FAIL — `./PlaceholderPage` does not exist.

- [ ] **Step 3: Implement PlaceholderPage and the five page wrappers**

`src/pages/PlaceholderPage.tsx`:
```tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed, PageKey } from "../state/pageAccess";

export function PlaceholderPage({ page, label }: { page: PageKey; label: string }) {
  const state = useVisibilityState();
  if (!isPageAllowed(page, state)) {
    return <p>This section isn't available right now.</p>;
  }
  return <p>{label} — coming soon.</p>;
}
```

`src/pages/PredictionsPage.tsx`:
```tsx
import { PlaceholderPage } from "./PlaceholderPage";

export function PredictionsPage() {
  return <PlaceholderPage page="predictions" label="Predictions" />;
}
```

`src/pages/LeaderboardPage.tsx`:
```tsx
import { PlaceholderPage } from "./PlaceholderPage";

export function LeaderboardPage() {
  return <PlaceholderPage page="leaderboard" label="Leaderboard" />;
}
```

`src/pages/ChatPage.tsx`:
```tsx
import { PlaceholderPage } from "./PlaceholderPage";

export function ChatPage() {
  return <PlaceholderPage page="chat" label="Chat" />;
}
```

`src/pages/ForumPage.tsx`:
```tsx
import { PlaceholderPage } from "./PlaceholderPage";

export function ForumPage() {
  return <PlaceholderPage page="forum" label="Forum" />;
}
```

`src/pages/StatsPage.tsx`:
```tsx
import { PlaceholderPage } from "./PlaceholderPage";

export function StatsPage() {
  return <PlaceholderPage page="stats" label="Stats" />;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/PlaceholderPage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlaceholderPage.tsx src/pages/PlaceholderPage.test.tsx src/pages/PredictionsPage.tsx src/pages/LeaderboardPage.tsx src/pages/ChatPage.tsx src/pages/ForumPage.tsx src/pages/StatsPage.tsx
git commit -m "$(cat <<'EOF'
Add gated placeholder pages for the five future sections

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Wire Up App.tsx Routing (Replaces Task 1's Placeholder)

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `AuthProvider` (Task 4), `AppShell` (Task 7), `HomePage` (Task 8), five placeholder pages (Task 9).
- Produces: final `App` component — same export name/shape as Task 1, content fully replaced.

- [ ] **Step 1: Write the failing integration tests (replaces Task 1's smoke test)**

`src/App.test.tsx` (replace entire file content from Task 1):
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { App } from "./App";

const mockUseAuth = vi.fn();

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

describe("App routing integration", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders the home placeholder for the not-started/logged-out state by default", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    window.history.pushState({}, "", "?debugDate=2026-01-01");
    render(<App />);
    expect(screen.getByText(/Not started, not logged in/)).toBeInTheDocument();
  });

  it("navigates to an allowed page via the nav link", () => {
    // Logged in (not logged-out) so Forum is actually in the NST_LI nav —
    // NST_NLI hides Forum too per SPEC.md §8, so that combination has no
    // Forum link to click.
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    window.history.pushState({}, "", "?debugDate=2026-01-01");
    render(<App />);
    fireEvent.click(screen.getByText("Forum"));
    expect(screen.getByText("Forum — coming soon.")).toBeInTheDocument();
  });

  it("shows the blocked message when a disallowed page is reached directly", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    window.history.pushState({}, "", "?debugDate=2026-01-01#/leaderboard");
    render(<App />);
    expect(
      screen.getByText("This section isn't available right now.")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `src/App.tsx` still renders Task 1's `<p>#kupatakipucl</p>`, none of the expected text is present.

- [ ] **Step 3: Implement the final App.tsx**

`src/App.tsx` (replace entire file content from Task 1):
```tsx
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AppShell } from "./shell/AppShell";
import { HomePage } from "./pages/HomePage";
import { PredictionsPage } from "./pages/PredictionsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ChatPage } from "./pages/ChatPage";
import { ForumPage } from "./pages/ForumPage";
import { StatsPage } from "./pages/StatsPage";

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all tests across every task pass together (no regressions from the App.tsx replacement).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "$(cat <<'EOF'
Wire up HashRouter routing and replace App.tsx placeholder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Firebase Project Setup + Manual Verification

**Files:** none (configuration + manual QA task; no source files created)

**Interfaces:** none — this task validates Tasks 4-5's Firebase wiring against a real project instead of adding code.

This task needs Mert directly for the interactive Google OAuth step — hand off at Step 1.

- [ ] **Step 1: Create the Firebase project (needs Mert)**

Walk through together:
1. Run `npm install -g firebase-tools` if not already installed.
2. Run `firebase login` — opens a real browser window for Google OAuth. Mert completes this step himself.
3. Go to https://console.firebase.google.com, create a new project (suggested name: `kupatakipucl`).
4. In the project, go to Authentication → Sign-in method → enable the Google provider.
5. In Project Settings → General → "Your apps", add a Web app, and copy the resulting `apiKey`, `authDomain`, `projectId`, `appId` values.

- [ ] **Step 2: Wire up local env**

Create `.env.local` (gitignored, not committed) in the repo root:
```
VITE_FIREBASE_API_KEY=<value from console>
VITE_FIREBASE_AUTH_DOMAIN=<value from console>
VITE_FIREBASE_PROJECT_ID=<value from console>
VITE_FIREBASE_APP_ID=<value from console>
```

- [ ] **Step 3: Manual verification checklist**

Run: `npm run dev`, then in a browser:
1. Visit `/?debugDate=2026-01-01` (pre-tournament) while logged out — confirm the NST-NLI placeholder and only the Home nav link show.
2. Click "Sign in with Google", complete a real sign-in — confirm the nav updates to show Predictions/Chat/Forum and the "Sign out" button appears (NST-LI).
3. Click "Sign out" — confirm it returns to the logged-out nav/placeholder.
4. Visit `/?debugDate=2026-09-09` (post-tournament) while logged out — confirm Leaderboard/Stats/Forum show, Chat does not (ST-NLI).
5. Sign in again at that same URL — confirm every nav link shows (ST-LI).
6. Hard-refresh the browser on a deep link (e.g. `/#/forum`) — confirm it loads correctly rather than 404ing (validates the `HashRouter` choice).

- [ ] **Step 4: Commit the env template reminder (if anything changed)**

If any code changed during manual verification (it shouldn't have), repeat the relevant task's commit steps. Otherwise, no commit — this task's output is a verified, working live app, not new files.
