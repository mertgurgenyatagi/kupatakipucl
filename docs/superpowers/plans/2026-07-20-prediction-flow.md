# Prediction Submission Flow (Round 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the round-1 prediction flow — one-time profile setup, one-time background survey, drag-to-rank team submission, pre-deadline editing with overwrite confirmation, and a post-tournament locked read-only view — per `docs/superpowers/specs/2026-07-20-prediction-flow-design.md`.

**Architecture:** Firestore (`profiles`, `surveyResponses`, `predictions` collections, doc ID = uid) + Firebase Storage (profile photos), added to the existing `kupatakipucl` Firebase project. An app-level `ProfileGate` blocks all routes for a logged-in user with no profile yet. `PredictionsPage` is a small explicit state machine (`idle` / `rank` / `confirm-overwrite`) branching first on tournament phase (locked read-only once started), then on whether a prediction already exists.

**Tech Stack:** Vite + React + TypeScript (existing), Firebase v10 (`firebase/firestore`, `firebase/storage` — new to this unit), `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (new), Vitest + React Testing Library (existing).

## Global Constraints

- All user-facing copy is Turkish, no English fallback (`SPEC.md` §9).
- Bare functional skeleton — no visual/brand polish this unit; one deliberate `impeccable` design pass happens later across the whole site (`SPEC.md` §9a, design doc Non-Goals).
- Round 1 (league-phase ranking) only — no round-2 bracket UI in this unit.
- Dev placeholder team data = the real 2024–25 UCL league-phase 36 clubs (verified via Wikipedia), swapped for the real Aug 26, 2026 list later — isolated to `src/predictions/teams.ts` so the swap is a one-line change.
- No new backend/service — reuses the existing `kupatakipucl` Firebase project via `import.meta.env.VITE_FIREBASE_*` env vars already wired in `src/firebase.ts`.
- Tests: Vitest + React Testing Library, `firebase/firestore`/`firebase/storage`/`../firebase` mocked at the module level in every test file that touches them — no emulator suite (matches unit 1's pattern).
- Every commit: plain imperative message (e.g. "Add X"), no task-number prefix — matches unit 1's git history style.

## File Structure

- `src/firebase.ts` (modify) — add `db` (Firestore) and `storage` (Storage) exports.
- `test/setup.ts` (modify) — add a `ResizeObserver` polyfill (jsdom doesn't implement it; `@dnd-kit` needs it).
- `src/predictions/teams.ts` + `.test.ts` — static list of the 36 dev-placeholder teams.
- `src/profile/profileTypes.ts` — `Profile` type.
- `src/profile/useProfile.ts` + `.test.ts` — read/create the `profiles/{uid}` doc, upload the photo to Storage.
- `src/profile/ProfileForm.tsx` + `.test.tsx` — the one-time "complete your profile" form.
- `src/profile/ProfileGate.tsx` + `.test.tsx` — blocks the app behind `ProfileForm` until a profile exists.
- `src/App.tsx` (modify) + `src/App.test.tsx` (modify) — wrap routing in `ProfileGate`.
- `src/predictions/surveyTypes.ts` — `SurveyResponse` type.
- `src/predictions/SurveyForm.tsx` + `.test.tsx` — one-question-at-a-time survey with a progress bar.
- `src/predictions/TeamRanker.tsx` + `.test.tsx` — drag-to-rank team list (`@dnd-kit`).
- `src/predictions/predictionTypes.ts` — `Prediction` type.
- `src/predictions/usePrediction.ts` + `.test.ts` — read/write the `predictions/{uid}` doc.
- `src/predictions/useSurveyResponse.ts` + `.test.ts` — write-once `surveyResponses/{uid}` doc.
- `src/predictions/SubmissionCounter.tsx` + `.test.tsx` — "X of Y have submitted" counter.
- `src/pages/PredictionsPage.tsx` (rewrite) + `.test.tsx` — orchestrates all of the above.

---

### Task 1: Team data module

**Files:**
- Create: `src/predictions/teams.ts`
- Test: `src/predictions/teams.test.ts`

**Interfaces:**
- Produces: `interface Team { id: string; name: string }`, `export const TEAMS: Team[]` (36 entries, alphabetical by `name`, unique `id`s).

- [ ] **Step 1: Write the failing test**

```ts
// src/predictions/teams.test.ts
import { describe, it, expect } from "vitest";
import { TEAMS } from "./teams";

describe("TEAMS", () => {
  it("has exactly 36 teams", () => {
    expect(TEAMS).toHaveLength(36);
  });

  it("has unique ids", () => {
    const ids = TEAMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is sorted alphabetically by name", () => {
    const sorted = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
    expect(TEAMS.map((t) => t.name)).toEqual(sorted.map((t) => t.name));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- teams.test.ts`
Expected: FAIL — `Cannot find module './teams'`

- [ ] **Step 3: Write the implementation**

```ts
// src/predictions/teams.ts
export interface Team {
  id: string;
  name: string;
}

export const TEAMS: Team[] = [
  { id: "arsenal", name: "Arsenal" },
  { id: "aston-villa", name: "Aston Villa" },
  { id: "atalanta", name: "Atalanta" },
  { id: "atletico-madrid", name: "Atlético Madrid" },
  { id: "barcelona", name: "Barcelona" },
  { id: "bayer-leverkusen", name: "Bayer Leverkusen" },
  { id: "bayern-munich", name: "Bayern Munich" },
  { id: "benfica", name: "Benfica" },
  { id: "bologna", name: "Bologna" },
  { id: "borussia-dortmund", name: "Borussia Dortmund" },
  { id: "brest", name: "Brest" },
  { id: "celtic", name: "Celtic" },
  { id: "club-brugge", name: "Club Brugge" },
  { id: "dinamo-zagreb", name: "Dinamo Zagreb" },
  { id: "feyenoord", name: "Feyenoord" },
  { id: "girona", name: "Girona" },
  { id: "inter-milan", name: "Inter Milan" },
  { id: "juventus", name: "Juventus" },
  { id: "lille", name: "Lille" },
  { id: "liverpool", name: "Liverpool" },
  { id: "manchester-city", name: "Manchester City" },
  { id: "milan", name: "Milan" },
  { id: "monaco", name: "Monaco" },
  { id: "paris-saint-germain", name: "Paris Saint-Germain" },
  { id: "psv-eindhoven", name: "PSV Eindhoven" },
  { id: "rb-leipzig", name: "RB Leipzig" },
  { id: "real-madrid", name: "Real Madrid" },
  { id: "red-bull-salzburg", name: "Red Bull Salzburg" },
  { id: "red-star-belgrade", name: "Red Star Belgrade" },
  { id: "shakhtar-donetsk", name: "Shakhtar Donetsk" },
  { id: "slovan-bratislava", name: "Slovan Bratislava" },
  { id: "sparta-prague", name: "Sparta Prague" },
  { id: "sporting-cp", name: "Sporting CP" },
  { id: "sturm-graz", name: "Sturm Graz" },
  { id: "vfb-stuttgart", name: "VfB Stuttgart" },
  { id: "young-boys", name: "Young Boys" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- teams.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/predictions/teams.ts src/predictions/teams.test.ts
git commit -m "Add dev-placeholder team data (2024-25 UCL league phase, 36 clubs)"
```

---

### Task 2: Profile data layer (Firestore + Storage)

**Files:**
- Modify: `src/firebase.ts`
- Create: `src/profile/profileTypes.ts`
- Create: `src/profile/useProfile.ts`
- Test: `src/profile/useProfile.test.tsx`

**Interfaces:**
- Consumes: `firebaseApp` from `src/firebase.ts` (existing).
- Produces: `export const db` and `export const storage` from `src/firebase.ts`; `interface Profile { firstName: string; lastName: string; photoURL: string; createdAt: number }`; `export function useProfile(uid: string | null): { profile: Profile | null; loading: boolean }`; `export async function saveProfile(uid: string, firstName: string, lastName: string, photoFile: File): Promise<Profile>`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/profile/useProfile.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockRef = vi.fn((_storage: unknown, path: string) => ({ path }));

vi.mock("firebase/storage", () => ({
  ref: (...args: unknown[]) => mockRef(...(args as [unknown, string])),
  uploadBytes: (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: (...args: unknown[]) => mockGetDownloadURL(...args),
}));

vi.mock("../firebase", () => ({ db: {}, storage: {} }));

import { useProfile, saveProfile } from "./useProfile";

describe("useProfile", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("returns loading=false and profile=null when uid is null", async () => {
    const { result } = renderHook(() => useProfile(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("returns profile=null when no profile doc exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const { result } = renderHook(() => useProfile("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("returns the profile when a doc exists", async () => {
    const data = { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 123 };
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const { result } = renderHook(() => useProfile("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(data);
  });
});

describe("saveProfile", () => {
  beforeEach(() => {
    mockUploadBytes.mockReset();
    mockGetDownloadURL.mockReset();
    mockSetDoc.mockReset();
  });

  it("uploads the photo, then writes the profile doc with the resulting URL", async () => {
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue("https://example.com/photo.jpg");
    mockSetDoc.mockResolvedValue(undefined);

    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = await saveProfile("uid1", "Mert", "G", file);

    expect(mockUploadBytes).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      firstName: "Mert",
      lastName: "G",
      photoURL: "https://example.com/photo.jpg",
      createdAt: expect.any(Number),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useProfile.test.tsx`
Expected: FAIL — `Cannot find module './useProfile'`

- [ ] **Step 3: Extend `src/firebase.ts`**

```ts
// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
```

- [ ] **Step 4: Write `src/profile/profileTypes.ts`**

```ts
// src/profile/profileTypes.ts
export interface Profile {
  firstName: string;
  lastName: string;
  photoURL: string;
  createdAt: number;
}
```

- [ ] **Step 5: Write `src/profile/useProfile.ts`**

```ts
// src/profile/useProfile.ts
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    getDoc(doc(db, "profiles", uid)).then((snapshot) => {
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- useProfile.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 7: Run the full test suite and `tsc` to make sure nothing else broke**

Run: `npm test && npx tsc -b --noEmit`
Expected: all existing tests still pass; no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/firebase.ts src/profile/profileTypes.ts src/profile/useProfile.ts src/profile/useProfile.test.tsx
git commit -m "Add Firestore/Storage init and profile data layer"
```

---

### Task 3: ProfileForm component

**Files:**
- Create: `src/profile/ProfileForm.tsx`
- Test: `src/profile/ProfileForm.test.tsx`

**Interfaces:**
- Consumes: `saveProfile` from `./useProfile` (Task 2), `Profile` from `./profileTypes`.
- Produces: `export function ProfileForm({ uid, onSaved }: { uid: string; onSaved: (profile: Profile) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/profile/ProfileForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProfileForm } from "./ProfileForm";

const mockSaveProfile = vi.fn();

vi.mock("./useProfile", () => ({
  saveProfile: (...args: unknown[]) => mockSaveProfile(...args),
}));

describe("ProfileForm", () => {
  beforeEach(() => {
    mockSaveProfile.mockReset();
  });

  it("shows an error and does not save when no photo is chosen", async () => {
    render(<ProfileForm uid="uid1" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Mert" } });
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "G" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lütfen bir profil fotoğrafı seçin."
    );
    expect(mockSaveProfile).not.toHaveBeenCalled();
  });

  it("calls saveProfile and onSaved when submitted with a photo", async () => {
    const savedProfile = { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 1 };
    mockSaveProfile.mockResolvedValue(savedProfile);
    const onSaved = vi.fn();
    render(<ProfileForm uid="uid1" onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Mert" } });
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "G" } });
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Profil fotoğrafı"), { target: { files: [file] } });
    fireEvent.click(screen.getByText("Kaydet"));

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledWith("uid1", "Mert", "G", file));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedProfile));
  });

  it("shows an inline error when saving fails", async () => {
    mockSaveProfile.mockRejectedValue(new Error("network"));
    render(<ProfileForm uid="uid1" onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Mert" } });
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "G" } });
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Profil fotoğrafı"), { target: { files: [file] } });
    fireEvent.click(screen.getByText("Kaydet"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Profil kaydedilemedi, tekrar deneyin."
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProfileForm.test.tsx`
Expected: FAIL — `Cannot find module './ProfileForm'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/profile/ProfileForm.tsx
import { FormEvent, useState } from "react";
import { saveProfile } from "./useProfile";
import { Profile } from "./profileTypes";

interface ProfileFormProps {
  uid: string;
  onSaved: (profile: Profile) => void;
}

export function ProfileForm({ uid, onSaved }: ProfileFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!photoFile) {
      setError("Lütfen bir profil fotoğrafı seçin.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const profile = await saveProfile(uid, firstName, lastName, photoFile);
      onSaved(profile);
    } catch (err) {
      console.error("Profile save failed", err);
      setError("Profil kaydedilemedi, tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Profilini tamamla</h1>
      <label>
        Ad
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </label>
      <label>
        Soyad
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </label>
      <label>
        Profil fotoğrafı
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ProfileForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/profile/ProfileForm.tsx src/profile/ProfileForm.test.tsx
git commit -m "Add one-time profile-completion form"
```

---

### Task 4: ProfileGate component

**Files:**
- Create: `src/profile/ProfileGate.tsx`
- Test: `src/profile/ProfileGate.test.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../auth/AuthProvider` (existing), `useProfile` from `./useProfile` (Task 2), `ProfileForm` from `./ProfileForm` (Task 3).
- Produces: `export function ProfileGate({ children }: { children: ReactNode })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/profile/ProfileGate.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { ProfileGate } from "./ProfileGate";

const mockUseAuth = vi.fn();
const mockUseProfile = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
}));

vi.mock("./ProfileForm", () => ({
  ProfileForm: ({ uid }: { uid: string }) => <div>profile-form:{uid}</div>,
}));

describe("ProfileGate", () => {
  it("renders nothing while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseProfile.mockReturnValue({ profile: null, loading: true });
    const { container } = render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children directly when logged out", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("renders the profile form when logged in with no profile yet", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("profile-form:uid1")).toBeInTheDocument();
  });

  it("renders children when logged in and a profile already exists", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" }, loading: false });
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 1 },
      loading: false,
    });
    render(
      <ProfileGate>
        <div>app-content</div>
      </ProfileGate>
    );
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProfileGate.test.tsx`
Expected: FAIL — `Cannot find module './ProfileGate'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/profile/ProfileGate.tsx
import { ReactNode, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useProfile } from "./useProfile";
import { ProfileForm } from "./ProfileForm";
import { Profile } from "./profileTypes";

export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.uid ?? null);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

  if (authLoading || (user && profileLoading)) {
    return null;
  }

  if (user && !profile && !savedProfile) {
    return <ProfileForm uid={user.uid} onSaved={setSavedProfile} />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ProfileGate.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/profile/ProfileGate.tsx src/profile/ProfileGate.test.tsx
git commit -m "Add ProfileGate to block the app until a profile exists"
```

---

### Task 5: Wire ProfileGate into App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ProfileGate` from `./profile/ProfileGate` (Task 4).

- [ ] **Step 1: Update `src/App.test.tsx` to mock ProfileGate as a passthrough**

Add this mock alongside the existing ones (near the top, with the other `vi.mock` calls):

```tsx
vi.mock("./profile/ProfileGate", () => ({
  ProfileGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

- [ ] **Step 2: Run test to verify existing App tests still pass with the mock in place (ProfileGate not yet wired)**

Run: `npm test -- App.test.tsx`
Expected: PASS (mock is unused so far, no behavior change yet)

- [ ] **Step 3: Wire `ProfileGate` into `src/App.tsx`**

```tsx
// src/App.tsx
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProfileGate } from "./profile/ProfileGate";
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
      <ProfileGate>
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
      </ProfileGate>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it still passes**

Run: `npm test -- App.test.tsx`
Expected: PASS (3 tests, unchanged)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Wire ProfileGate into App routing"
```

---

### Task 6: Survey types + SurveyForm component

**Files:**
- Create: `src/predictions/surveyTypes.ts`
- Create: `src/predictions/SurveyForm.tsx`
- Test: `src/predictions/SurveyForm.test.tsx`

**Interfaces:**
- Produces: `type MessiOrRonaldo = "messi" | "ronaldo" | "no-opinion"`, `type Device = "phone" | "desktop" | "both"`, `interface SurveyResponse { age: number; footballKnowledge: number; messiOrRonaldo: MessiOrRonaldo; superLigTeam: string; uclTeam: string | null; device: Device; submittedAt: number }`, `export function SurveyForm({ onComplete }: { onComplete: (response: SurveyResponse) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/predictions/SurveyForm.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { SurveyForm } from "./SurveyForm";

describe("SurveyForm", () => {
  it("only shows one question at a time", () => {
    render(<SurveyForm onComplete={vi.fn()} />);
    expect(screen.getByLabelText("Yaşınız")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Futbol bilginizi 1-7 arası değerlendirin")
    ).not.toBeInTheDocument();
  });

  it("walks through all six questions and calls onComplete with the collected answers", () => {
    const onComplete = vi.fn();
    render(<SurveyForm onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText("Yaşınız"), { target: { value: "30" } });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Futbol bilginizi 1-7 arası değerlendirin"), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Messi mi Ronaldo mu?"), {
      target: { value: "messi" },
    });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Süper Lig'de tuttuğunuz takım"), {
      target: { value: "Galatasaray" },
    });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(
      screen.getByLabelText("Tuttuğunuz bir UCL takımı var mı? (varsa yazın)"),
      { target: { value: "" } }
    );
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Çoğunlukla hangi cihazı kullanıyorsunuz?"), {
      target: { value: "desktop" },
    });
    fireEvent.click(screen.getByText("Gönder"));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      age: 30,
      footballKnowledge: 6,
      messiOrRonaldo: "messi",
      superLigTeam: "Galatasaray",
      uclTeam: null,
      device: "desktop",
      submittedAt: expect.any(Number),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SurveyForm.test.tsx`
Expected: FAIL — `Cannot find module './SurveyForm'`

- [ ] **Step 3: Write `src/predictions/surveyTypes.ts`**

```ts
// src/predictions/surveyTypes.ts
export type MessiOrRonaldo = "messi" | "ronaldo" | "no-opinion";
export type Device = "phone" | "desktop" | "both";

export interface SurveyResponse {
  age: number;
  footballKnowledge: number;
  messiOrRonaldo: MessiOrRonaldo;
  superLigTeam: string;
  uclTeam: string | null;
  device: Device;
  submittedAt: number;
}
```

- [ ] **Step 4: Write `src/predictions/SurveyForm.tsx`**

```tsx
// src/predictions/SurveyForm.tsx
import { FormEvent, useState } from "react";
import { SurveyResponse, MessiOrRonaldo, Device } from "./surveyTypes";

const SUPER_LIG_TEAMS = ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Anadolu takımı", "Yok"];
const TOTAL_STEPS = 6;

interface SurveyFormProps {
  onComplete: (response: SurveyResponse) => void;
}

export function SurveyForm({ onComplete }: SurveyFormProps) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState("");
  const [footballKnowledge, setFootballKnowledge] = useState(4);
  const [messiOrRonaldo, setMessiOrRonaldo] = useState<MessiOrRonaldo>("no-opinion");
  const [superLigTeam, setSuperLigTeam] = useState(SUPER_LIG_TEAMS[0]);
  const [uclTeam, setUclTeam] = useState("");
  const [device, setDevice] = useState<Device>("both");

  function next(event: FormEvent) {
    event.preventDefault();
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    onComplete({
      age: Number(age),
      footballKnowledge,
      messiOrRonaldo,
      superLigTeam,
      uclTeam: uclTeam.trim() === "" ? null : uclTeam.trim(),
      device,
      submittedAt: Date.now(),
    });
  }

  return (
    <form onSubmit={next}>
      <progress aria-label="Anket ilerlemesi" value={step + 1} max={TOTAL_STEPS} />
      {step === 0 && (
        <label>
          Yaşınız
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
        </label>
      )}
      {step === 1 && (
        <label>
          Futbol bilginizi 1-7 arası değerlendirin
          <input
            type="number"
            min={1}
            max={7}
            value={footballKnowledge}
            onChange={(e) => setFootballKnowledge(Number(e.target.value))}
            required
          />
        </label>
      )}
      {step === 2 && (
        <label>
          Messi mi Ronaldo mu?
          <select
            value={messiOrRonaldo}
            onChange={(e) => setMessiOrRonaldo(e.target.value as MessiOrRonaldo)}
          >
            <option value="messi">Messi</option>
            <option value="ronaldo">Ronaldo</option>
            <option value="no-opinion">Fikrim yok</option>
          </select>
        </label>
      )}
      {step === 3 && (
        <label>
          Süper Lig'de tuttuğunuz takım
          <select value={superLigTeam} onChange={(e) => setSuperLigTeam(e.target.value)}>
            {SUPER_LIG_TEAMS.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>
      )}
      {step === 4 && (
        <label>
          Tuttuğunuz bir UCL takımı var mı? (varsa yazın)
          <input value={uclTeam} onChange={(e) => setUclTeam(e.target.value)} />
        </label>
      )}
      {step === 5 && (
        <label>
          Çoğunlukla hangi cihazı kullanıyorsunuz?
          <select value={device} onChange={(e) => setDevice(e.target.value as Device)}>
            <option value="phone">Telefon</option>
            <option value="desktop">Bilgisayar</option>
            <option value="both">İkisi de</option>
          </select>
        </label>
      )}
      <button type="submit">{step < TOTAL_STEPS - 1 ? "İleri" : "Gönder"}</button>
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- SurveyForm.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/predictions/surveyTypes.ts src/predictions/SurveyForm.tsx src/predictions/SurveyForm.test.tsx
git commit -m "Add one-time background survey form"
```

---

### Task 7: TeamRanker component (drag-to-rank)

**Files:**
- Modify: `package.json` (add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
- Modify: `test/setup.ts` (ResizeObserver polyfill)
- Create: `src/predictions/TeamRanker.tsx`
- Test: `src/predictions/TeamRanker.test.tsx`

**Interfaces:**
- Consumes: `Team` from `./teams` (Task 1).
- Produces: `export function TeamRanker({ teams, initialOrder, onSubmit }: { teams: Team[]; initialOrder: string[]; onSubmit: (order: string[]) => void })`.

- [ ] **Step 1: Install the drag-and-drop dependencies**

Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Add a ResizeObserver polyfill to `test/setup.ts`**

```ts
// test/setup.ts
import "@testing-library/jest-dom";

if (typeof ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error jsdom has no ResizeObserver
  global.ResizeObserver = ResizeObserverMock;
}
```

- [ ] **Step 3: Write the failing test**

```tsx
// src/predictions/TeamRanker.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { TeamRanker } from "./TeamRanker";
import { Team } from "./teams";

const teams: Team[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

describe("TeamRanker", () => {
  it("renders all teams in the given initial order", () => {
    render(<TeamRanker teams={teams} initialOrder={["b", "a", "c"]} onSubmit={vi.fn()} />);
    const items = screen.getAllByRole("listitem").map((el) => el.textContent);
    expect(items).toEqual(["1. Beta", "2. Alpha", "3. Gamma"]);
  });

  it("calls onSubmit with the current order when the save button is clicked", () => {
    const onSubmit = vi.fn();
    render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Sıralamayı kaydet"));
    expect(onSubmit).toHaveBeenCalledWith(["a", "b", "c"]);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- TeamRanker.test.tsx`
Expected: FAIL — `Cannot find module './TeamRanker'`

- [ ] **Step 5: Write the implementation**

```tsx
// src/predictions/TeamRanker.tsx
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Team } from "./teams";

interface TeamRankerProps {
  teams: Team[];
  initialOrder: string[];
  onSubmit: (order: string[]) => void;
}

function SortableTeamRow({ team, index }: { team: Team; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: team.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {index + 1}. {team.name}
    </li>
  );
}

export function TeamRanker({ teams, initialOrder, onSubmit }: TeamRankerProps) {
  const [order, setOrder] = useState<string[]>(initialOrder);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol>
            {order.map((id, index) => {
              const team = teamsById.get(id);
              if (!team) return null;
              return <SortableTeamRow key={id} team={team} index={index} />;
            })}
          </ol>
        </SortableContext>
      </DndContext>
      <button onClick={() => onSubmit(order)}>Sıralamayı kaydet</button>
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- TeamRanker.test.tsx`
Expected: PASS (2 tests)

Note for whoever executes this task: actual drag gestures aren't simulated here — jsdom has no real layout/pointer geometry, which is a known limitation for `@dnd-kit` testing. This test only covers render order and the submit callback. Real drag behavior (including on mobile/touch) needs a quick manual check in a real browser once this is wired into `PredictionsPage` (Task 10) — flag that to Mert rather than assuming it works.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json test/setup.ts src/predictions/TeamRanker.tsx src/predictions/TeamRanker.test.tsx
git commit -m "Add drag-to-rank TeamRanker component"
```

---

### Task 8: Prediction and survey-response data layer

**Files:**
- Create: `src/predictions/predictionTypes.ts`
- Create: `src/predictions/usePrediction.ts`
- Test: `src/predictions/usePrediction.test.ts`
- Create: `src/predictions/useSurveyResponse.ts`
- Test: `src/predictions/useSurveyResponse.test.ts`

**Interfaces:**
- Consumes: `db` from `../firebase` (Task 2), `SurveyResponse` from `./surveyTypes` (Task 6).
- Produces: `interface Prediction { ranking: string[]; submittedAt: number; updatedAt: number }`, `export function usePrediction(uid: string | null): { prediction: Prediction | null; loading: boolean }`, `export async function savePrediction(uid: string, ranking: string[]): Promise<Prediction>`, `export async function saveSurveyResponse(uid: string, response: SurveyResponse): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/predictions/usePrediction.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePrediction, savePrediction } from "./usePrediction";

describe("usePrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("returns prediction=null and loading=false when uid is null", async () => {
    const { result } = renderHook(() => usePrediction(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns null when no prediction doc exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const { result } = renderHook(() => usePrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns the prediction when a doc exists", async () => {
    const data = { ranking: ["a", "b"], submittedAt: 1, updatedAt: 2 };
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const { result } = renderHook(() => usePrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toEqual(data);
  });
});

describe("savePrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("keeps the original submittedAt on an update, and refreshes updatedAt", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ranking: ["a"], submittedAt: 100, updatedAt: 100 }),
    });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await savePrediction("uid1", ["b", "a"]);

    expect(result.ranking).toEqual(["b", "a"]);
    expect(result.submittedAt).toBe(100);
    expect(result.updatedAt).toBeGreaterThanOrEqual(100);
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), result);
  });

  it("sets submittedAt to now on the first-ever save", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await savePrediction("uid1", ["a"]);

    expect(result.submittedAt).toBe(result.updatedAt);
  });
});
```

```ts
// src/predictions/useSurveyResponse.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { saveSurveyResponse } from "./useSurveyResponse";

describe("saveSurveyResponse", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
  });

  it("writes the survey response doc for the given uid", async () => {
    const response = {
      age: 25,
      footballKnowledge: 5,
      messiOrRonaldo: "messi" as const,
      superLigTeam: "Galatasaray",
      uclTeam: null,
      device: "phone" as const,
      submittedAt: 123,
    };
    await saveSurveyResponse("uid1", response);
    expect(mockDoc).toHaveBeenCalledWith({}, "surveyResponses", "uid1");
    expect(mockSetDoc).toHaveBeenCalledWith({ collection: "surveyResponses", id: "uid1" }, response);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- usePrediction.test.ts useSurveyResponse.test.ts`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Write `src/predictions/predictionTypes.ts`**

```ts
// src/predictions/predictionTypes.ts
export interface Prediction {
  ranking: string[];
  submittedAt: number;
  updatedAt: number;
}
```

- [ ] **Step 4: Write `src/predictions/usePrediction.ts`**

```ts
// src/predictions/usePrediction.ts
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Prediction } from "./predictionTypes";

export function usePrediction(uid: string | null) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setPrediction(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, "predictions", uid)).then((snapshot) => {
      setPrediction(snapshot.exists() ? (snapshot.data() as Prediction) : null);
      setLoading(false);
    });
  }, [uid]);

  return { prediction, loading };
}

export async function savePrediction(uid: string, ranking: string[]): Promise<Prediction> {
  const now = Date.now();
  const existing = await getDoc(doc(db, "predictions", uid));
  const submittedAt = existing.exists() ? (existing.data() as Prediction).submittedAt : now;
  const prediction: Prediction = { ranking, submittedAt, updatedAt: now };
  await setDoc(doc(db, "predictions", uid), prediction);
  return prediction;
}
```

- [ ] **Step 5: Write `src/predictions/useSurveyResponse.ts`**

```ts
// src/predictions/useSurveyResponse.ts
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SurveyResponse } from "./surveyTypes";

export async function saveSurveyResponse(uid: string, response: SurveyResponse): Promise<void> {
  await setDoc(doc(db, "surveyResponses", uid), response);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- usePrediction.test.ts useSurveyResponse.test.ts`
Expected: PASS (6 tests total)

- [ ] **Step 7: Commit**

```bash
git add src/predictions/predictionTypes.ts src/predictions/usePrediction.ts src/predictions/usePrediction.test.ts src/predictions/useSurveyResponse.ts src/predictions/useSurveyResponse.test.ts
git commit -m "Add prediction and survey-response data layer"
```

---

### Task 9: SubmissionCounter component

**Files:**
- Create: `src/predictions/SubmissionCounter.tsx`
- Test: `src/predictions/SubmissionCounter.test.tsx`

**Interfaces:**
- Consumes: `db` from `../firebase` (Task 2).
- Produces: `export function SubmissionCounter()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/predictions/SubmissionCounter.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SubmissionCounter } from "./SubmissionCounter";

const mockGetCountFromServer = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getCountFromServer: (...args: unknown[]) => mockGetCountFromServer(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

describe("SubmissionCounter", () => {
  beforeEach(() => {
    mockGetCountFromServer.mockReset();
  });

  it("shows the submitted and total counts once both queries resolve", async () => {
    mockGetCountFromServer.mockImplementation((ref: { name: string }) => {
      const count = ref.name === "predictions" ? 12 : 30;
      return Promise.resolve({ data: () => ({ count }) });
    });
    render(<SubmissionCounter />);
    await waitFor(() =>
      expect(screen.getByText("12 / 30 kişi tahminini gönderdi")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SubmissionCounter.test.tsx`
Expected: FAIL — `Cannot find module './SubmissionCounter'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/predictions/SubmissionCounter.tsx
import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase";

export function SubmissionCounter() {
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCountFromServer(collection(db, "predictions")),
      getCountFromServer(collection(db, "profiles")),
    ]).then(([predictionsSnapshot, profilesSnapshot]) => {
      if (cancelled) return;
      setSubmitted(predictionsSnapshot.data().count);
      setTotal(profilesSnapshot.data().count);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (submitted === null || total === null) return null;

  return (
    <p>
      {submitted} / {total} kişi tahminini gönderdi
    </p>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SubmissionCounter.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/predictions/SubmissionCounter.tsx src/predictions/SubmissionCounter.test.tsx
git commit -m "Add live submission counter"
```

---

### Task 10: PredictionsPage integration

**Files:**
- Modify (rewrite): `src/pages/PredictionsPage.tsx`
- Test (rewrite): `src/pages/PredictionsPage.test.tsx` (there is no existing test file for this page yet — `PlaceholderPage.test.tsx` covered its previous placeholder behavior generically)

**Interfaces:**
- Consumes: `useAuth` (`../auth/AuthProvider`), `useVisibilityState` (`../state/useVisibilityState`), `isPageAllowed` (`../state/pageAccess`), `usePrediction`/`savePrediction` (`../predictions/usePrediction`, Task 8), `saveSurveyResponse` (`../predictions/useSurveyResponse`, Task 8), `SurveyForm` (`../predictions/SurveyForm`, Task 6), `TeamRanker` (`../predictions/TeamRanker`, Task 7), `SubmissionCounter` (`../predictions/SubmissionCounter`, Task 9), `TEAMS` (`../predictions/teams`, Task 1).
- Produces: `export function PredictionsPage()` — no other module depends on its internals.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/PredictionsPage.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PredictionsPage } from "./PredictionsPage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUsePrediction = vi.fn();
const mockSavePrediction = vi.fn();
const mockSaveSurveyResponse = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../predictions/usePrediction", () => ({
  usePrediction: (uid: string | null) => mockUsePrediction(uid),
  savePrediction: (...args: unknown[]) => mockSavePrediction(...args),
}));

vi.mock("../predictions/useSurveyResponse", () => ({
  saveSurveyResponse: (...args: unknown[]) => mockSaveSurveyResponse(...args),
}));

vi.mock("../predictions/SurveyForm", () => ({
  SurveyForm: ({ onComplete }: { onComplete: (r: unknown) => void }) => (
    <button onClick={() => onComplete({ age: 30 })}>complete-survey</button>
  ),
}));

vi.mock("../predictions/TeamRanker", () => ({
  TeamRanker: ({
    initialOrder,
    onSubmit,
  }: {
    initialOrder: string[];
    onSubmit: (order: string[]) => void;
  }) => (
    <div>
      <span>ranker-initial:{initialOrder.join(",")}</span>
      <button onClick={() => onSubmit(["z", "y", "x"])}>submit-ranking</button>
    </div>
  ),
}));

vi.mock("../predictions/SubmissionCounter", () => ({
  SubmissionCounter: () => <div>submission-counter</div>,
}));

describe("PredictionsPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockSavePrediction.mockReset();
    mockSaveSurveyResponse.mockReset();
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while the prediction is loading", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: true });
    const { container } = render(<PredictionsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the survey first when there's no existing prediction (pre-tournament)", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("complete-survey")).toBeInTheDocument();
  });

  it("moves to the ranker after the survey completes, then saves survey+prediction on submit", async () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 1 });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("complete-survey"));
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();

    fireEvent.click(screen.getByText("submit-ranking"));

    await waitFor(() => expect(mockSaveSurveyResponse).toHaveBeenCalledWith("uid1", { age: 30 }));
    expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]);
  });

  it("shows the current ranking with an edit button when a prediction already exists (pre-tournament)", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Düzenle")).toBeInTheDocument();
    expect(screen.getByText("submission-counter")).toBeInTheDocument();
  });

  it("editing skips the survey, requires overwrite confirmation, and discarding leaves the original unchanged", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("Düzenle"));
    expect(screen.queryByText("complete-survey")).not.toBeInTheDocument();
    expect(screen.getByText("submit-ranking")).toBeInTheDocument();

    fireEvent.click(screen.getByText("submit-ranking"));
    expect(mockSavePrediction).not.toHaveBeenCalled();
    expect(
      screen.getByText("Bu tahmini üzerine yazmak istediğinize emin misiniz?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Vazgeç"));
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(mockSavePrediction).not.toHaveBeenCalled();
  });

  it("confirming the overwrite saves the new ranking", async () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    mockSavePrediction.mockResolvedValue({ ranking: ["z", "y", "x"], submittedAt: 1, updatedAt: 2 });
    render(<PredictionsPage />);

    fireEvent.click(screen.getByText("Düzenle"));
    fireEvent.click(screen.getByText("submit-ranking"));
    fireEvent.click(screen.getByText("Evet, kaydet"));

    await waitFor(() => expect(mockSavePrediction).toHaveBeenCalledWith("uid1", ["z", "y", "x"]));
  });

  it("shows the locked read-only ranking post-tournament", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUsePrediction.mockReturnValue({
      prediction: { ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 },
      loading: false,
    });
    render(<PredictionsPage />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.queryByText("Düzenle")).not.toBeInTheDocument();
  });

  it("shows a not-submitted message post-tournament when there's no prediction", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUsePrediction.mockReturnValue({ prediction: null, loading: false });
    render(<PredictionsPage />);
    expect(screen.getByText("Bir tahmin göndermediniz.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PredictionsPage.test.tsx`
Expected: FAIL (current `PredictionsPage` is still the unit-1 placeholder wrapper)

- [ ] **Step 3: Write the implementation**

```tsx
// src/pages/PredictionsPage.tsx
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { usePrediction, savePrediction } from "../predictions/usePrediction";
import { saveSurveyResponse } from "../predictions/useSurveyResponse";
import { SurveyForm } from "../predictions/SurveyForm";
import { TeamRanker } from "../predictions/TeamRanker";
import { SubmissionCounter } from "../predictions/SubmissionCounter";
import { TEAMS } from "../predictions/teams";
import { SurveyResponse } from "../predictions/surveyTypes";
import { Prediction } from "../predictions/predictionTypes";

type UiStep = "idle" | "rank" | "confirm-overwrite";

function rankingNames(ranking: string[]): string[] {
  return ranking.map((id) => TEAMS.find((t) => t.id === id)?.name ?? id);
}

export function PredictionsPage() {
  const { user } = useAuth();
  const state = useVisibilityState();
  const { prediction, loading } = usePrediction(user?.uid ?? null);
  const [uiStep, setUiStep] = useState<UiStep>("idle");
  const [pendingSurvey, setPendingSurvey] = useState<SurveyResponse | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [saved, setSaved] = useState<Prediction | null>(null);

  if (!isPageAllowed("predictions", state)) {
    return <p>This section isn't available right now.</p>;
  }

  if (loading) return null;

  const currentPrediction = saved ?? prediction;
  const uid = user!.uid;

  if (state === "ST_LI") {
    if (!currentPrediction) {
      return <p>Bir tahmin göndermediniz.</p>;
    }
    return (
      <div>
        <h1>Tahmininiz</h1>
        <ol>
          {rankingNames(currentPrediction.ranking).map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ol>
      </div>
    );
  }

  // state === "NST_LI" from here down

  if (!currentPrediction && uiStep === "idle") {
    return (
      <SurveyForm
        onComplete={(response) => {
          setPendingSurvey(response);
          setUiStep("rank");
        }}
      />
    );
  }

  if (uiStep === "rank") {
    const initialOrder = currentPrediction ? currentPrediction.ranking : TEAMS.map((t) => t.id);
    return (
      <TeamRanker
        teams={TEAMS}
        initialOrder={initialOrder}
        onSubmit={(order) => {
          if (currentPrediction) {
            setPendingOrder(order);
            setUiStep("confirm-overwrite");
          } else {
            void (async () => {
              await saveSurveyResponse(uid, pendingSurvey!);
              const result = await savePrediction(uid, order);
              setSaved(result);
              setUiStep("idle");
            })();
          }
        }}
      />
    );
  }

  if (uiStep === "confirm-overwrite" && pendingOrder) {
    return (
      <div role="dialog">
        <p>Bu tahmini üzerine yazmak istediğinize emin misiniz?</p>
        <button
          onClick={async () => {
            const result = await savePrediction(uid, pendingOrder);
            setSaved(result);
            setPendingOrder(null);
            setUiStep("idle");
          }}
        >
          Evet, kaydet
        </button>
        <button
          onClick={() => {
            setPendingOrder(null);
            setUiStep("idle");
          }}
        >
          Vazgeç
        </button>
      </div>
    );
  }

  // uiStep === "idle" && currentPrediction exists: read/edit view
  return (
    <div>
      <h1>Tahmininiz</h1>
      <ol>
        {rankingNames(currentPrediction!.ranking).map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ol>
      <button onClick={() => setUiStep("rank")}>Düzenle</button>
      <SubmissionCounter />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PredictionsPage.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Run the full test suite and `tsc` to make sure nothing else broke**

Run: `npm test && npx tsc -b --noEmit`
Expected: all tests pass across the whole repo; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PredictionsPage.tsx src/pages/PredictionsPage.test.tsx
git commit -m "Build the round-1 prediction submission flow into PredictionsPage"
```

---

## Final Check

After Task 10, do a full-branch sanity pass before wrapping up: `npm test` (all green), `npx tsc -b --noEmit` (clean), and confirm `PAGE_ACCESS`/`NAV_LINKS` from unit 1 still correctly gate `/predictions` (no change needed there — this plan only fills in what was already gated). Manual verification in a real browser (Firebase writes, and actual drag gestures per Task 7's note) needs Mert, same as unit 1's Task 11.
