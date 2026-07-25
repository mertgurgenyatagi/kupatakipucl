import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoiceStepProps {
  question: string;
  options: ChoiceOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

/**
 * The one reusable "wide oblong box" multiple-choice list. Select-then-
 * confirm, same as UclTeamStep — tap a box to mark it (tap another to
 * change your mind), then confirm with the button below. Hairline ink
 * border, ink text, background matches the page; hover/selected fully
 * inverts (white background, dark text).
 */
export function ChoiceStep({ question, options, onSelect, disabled }: ChoiceStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="max-w-lg text-balance text-center font-display text-2xl font-light text-ink">{question}</p>
      <div className="flex w-full max-w-lg flex-col gap-2.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => setSelected(option.value)}
            className={cn(
              "cursor-pointer rounded-full border border-ink/45 bg-background px-5 py-3.5 text-center text-sm font-light text-ink transition-colors duration-150 ease-[var(--ease-cotton)] hover:bg-ink hover:text-background disabled:pointer-events-none disabled:opacity-60",
              selected === option.value && "bg-ink text-background ring-2 ring-brass"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={selected === null || disabled}
        onClick={() => selected && onSelect(selected)}
        className="cursor-pointer rounded-full bg-ink px-8 py-3.5 text-base font-semibold text-background transition-opacity disabled:cursor-default disabled:opacity-40"
      >
        Devam et
      </button>
    </div>
  );
}
