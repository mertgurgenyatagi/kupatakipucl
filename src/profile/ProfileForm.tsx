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
