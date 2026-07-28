import { useState, type FormEvent } from "react";

interface NameStepProps {
  onSubmit: (firstName: string, lastName: string) => void;
  disabled?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
}

export function NameStep({ onSubmit, disabled, initialFirstName, initialLastName }: NameStepProps) {
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onSubmit(firstName.trim(), lastName.trim());
  }

  // Text inputs keep the native I-beam — the "no I-beam anywhere" rule
  // turned out not to apply to actual text entry, just clickable controls.
  const inputClass =
    "w-72 rounded-full border border-color_text/45 bg-background px-6 py-4 text-center text-base font-light text-color_text placeholder:text-color_text/40 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus:border-color_accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
      <input
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="İsim"
        aria-label="İsim"
        required
        disabled={disabled}
        className={inputClass}
      />
      <input
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Soyisim"
        aria-label="Soyisim"
        required
        disabled={disabled}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={disabled}
        className="mt-2 cursor-pointer rounded-full bg-color_text px-8 py-4 text-base font-semibold text-background transition-opacity disabled:cursor-default disabled:opacity-60"
      >
        {disabled ? "Kaydediliyor…" : "Devam et"}
      </button>
    </form>
  );
}
