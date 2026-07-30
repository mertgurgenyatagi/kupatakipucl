import { MyLobby } from "./useMyLobbies";

/** What a cell's title should read for the currently selected scope — "Genel"
 *  for the site-wide view, otherwise that lobby's own name. Exported
 *  separately from the switcher itself: the label now lives in the cell's
 *  FrameTitle, not on the switcher button, so callers need this without
 *  rendering the button. */
export function getLobbySwitcherLabel(options: MyLobby[], current: string | null): string {
  if (current === null) return "Genel";
  return options.find((o) => o.id === current)?.name ?? "Genel";
}

interface LobbySwitcherProps {
  options: MyLobby[];
  current: string | null;
  onChange: (lobbyId: string | null) => void;
}

/** A blind cycle-arrow, nothing else — no label, no dropdown. Clicking steps
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
      className="flex shrink-0 cursor-pointer items-center text-color_textsecondary outline-none transition-colors hover:text-color_accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent"
    >
      <span aria-hidden>›</span>
    </button>
  );
}
