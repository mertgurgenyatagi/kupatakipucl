import { useRef, useState, type ChangeEvent } from "react";
import { Plus } from "lucide-react";

interface PhotoStepProps {
  onSelect: (file: File) => void;
}

export function PhotoStep({ onSelect }: PhotoStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-center font-display text-2xl font-light text-ink">Lütfen profil fotoğrafı seç.</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Profil fotoğrafı seç"
        className="group flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-muted transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-ink"
      >
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <Plus className="size-9 text-ink group-hover:text-background" strokeWidth={2} aria-hidden />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={!file}
        onClick={() => file && onSelect(file)}
        className="cursor-pointer rounded-full bg-ink px-8 py-3.5 text-base font-semibold text-background transition-opacity disabled:cursor-default disabled:opacity-40"
      >
        Devam et
      </button>
    </div>
  );
}
