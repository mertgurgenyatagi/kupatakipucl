import { ReactNode } from "react";

interface IntroBeatProps {
  text: string;
  /** Exact substrings of `text` to render bold — e.g. the two numbers that
   *  actually matter in the scoring-rule sentence. */
  boldTerms?: string[];
  /** An optional illustration shown between the text and the continue
   *  button (the scoring-example diagram, on the middle beat). */
  visual?: ReactNode;
  onContinue: () => void;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderWithBold(text: string, boldTerms: string[]): ReactNode {
  if (boldTerms.length === 0) return text;
  const pattern = new RegExp(`(${boldTerms.map(escapeRegExp).join("|")})`, "g");
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part, i) => (boldTerms.includes(part) ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>));
}

/** One beat of the pre-ranking explanation — user-advanced, not timed
 *  (predictions-page-round-02 Q4): there's real information to read here,
 *  unlike signup's one-line welcome message. Same "Devam et" pill as
 *  UclTeamStep's own continue button. */
export function IntroBeat({ text, boldTerms = [], visual, onContinue }: IntroBeatProps) {
  return (
    <div className="flex flex-col items-center gap-8 px-6">
      <p className="max-w-lg text-balance text-center font-display text-2xl font-light text-ink sm:text-3xl">
        {renderWithBold(text, boldTerms)}
      </p>
      {visual}
      <button
        type="button"
        onClick={onContinue}
        className="cursor-pointer rounded-full bg-ink px-8 py-3.5 text-base font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Devam et
      </button>
    </div>
  );
}
