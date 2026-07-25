import { useState, type FormEvent } from "react";

interface NameStepProps {
  onSubmit: (firstName: string, lastName: string) => void;
  disabled?: boolean;
}

export function NameStep({ onSubmit, disabled }: NameStepProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onSubmit(firstName.trim(), lastName.trim());
  }

  // Text inputs keep the native I-beam — the "no I-beam anywhere" rule
  // turned out not to apply to actual text entry, just clickable controls.
  const inputClass =
    "w-72 rounded-full border border-ink/45 bg-background px-6 py-4 text-center text-base font-light text-ink placeholder:text-ink/40 outline-none transition-colors duration-150 ease-[var(--ease-cotton)] focus:border-brass";

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
        className="mt-2 cursor-pointer rounded-full bg-ink px-8 py-4 text-base font-semibold text-background transition-opacity disabled:cursor-default disabled:opacity-60"
      >
        {disabled ? "Kaydediliyor…" : "Devam et"}
      </button>
    </form>
  );
}
