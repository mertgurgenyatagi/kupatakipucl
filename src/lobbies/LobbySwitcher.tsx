import { ChevronRight } from "lucide-react";
import { MyLobby } from "./useMyLobbies";

/** What a cell's title should read for the currently selected scope. Exported
 *  separately from the switcher itself: the label now lives in the cell's
 *  FrameTitle, not on the switcher button, so callers need this without
 *  rendering the button.
 *
 *  `defaultLabel` is the cell's own name ("Sohbet", "Katılımcılar", …). Until
 *  the viewer actually belongs to a special lobby there is nothing to switch
 *  between, so the cell keeps its normal title instead of being renamed to
 *  "Genel" — "Genel" only means something once there's a non-general scope to
 *  contrast it against. */
export function getLobbySwitcherLabel(
  options: MyLobby[],
  current: string | null,
  defaultLabel: string
): string {
  if (options.length === 0) return defaultLabel;
  if (current === null) return "Genel";
  return options.find((o) => o.id === current)?.name ?? defaultLabel;
}

interface LobbySwitcherProps {
  options: MyLobby[];
  current: string | null;
  onChange: (lobbyId: string | null) => void;
}

/** A blind cycle button, nothing else — no label, no dropdown. Clicking steps
 *  through [Genel, ...my lobbies, Genel, ...] in order; the current scope's
 *  name is shown by the cell's own title, not here. */
export function LobbySwitcher({ options, current, onChange }: LobbySwitcherProps) {
  if (options.length === 0) return null;

  const sequence: (string | null)[] = [null, ...options.map((o) => o.id)];

  function handleClick() {
    const currentIndex = sequence.indexOf(current);
    const nextIndex = (currentIndex + 1) % sequence.length;
    onChange(sequence[nextIndex]);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Görünümü değiştir"
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-color_text text-background outline-none transition-opacity duration-150 ease-[var(--ease-cotton)] hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent"
    >
      <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
