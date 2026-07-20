// src/forum/PostForm.tsx
import { FormEvent, useState } from "react";
import { createPost } from "./createPost";

interface PostFormProps {
  uid: string;
  parentId: string | null;
  onPosted: () => void;
}

export function PostForm({ uid, parentId, onPosted }: PostFormProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !imageFile) return;
    try {
      await createPost(uid, text, imageFile, parentId);
      setText("");
      setImageFile(null);
      setError(null);
      onPosted();
    } catch (err) {
      console.error("Failed to create post", err);
      setError("Gönderi paylaşılamadı, tekrar deneyin.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
      />
      <button type="submit">Paylaş</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
