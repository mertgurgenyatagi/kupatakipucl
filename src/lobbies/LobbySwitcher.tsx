import { MyLobby } from "./useMyLobbies";

interface LobbySwitcherProps {
  options: MyLobby[];
  current: string | null;
  onChange: (lobbyId: string | null) => void;
}

export function LobbySwitcher({ options, current, onChange }: LobbySwitcherProps) {
  if (options.length === 0) return null;

  const sequence: (string | null)[] = [null, ...options.map((o) => o.id)];
  const currentLabel = current === null ? "Genel" : (options.find((o) => o.id === current)?.name ?? "Genel");

  function handleClick() {
    const currentIndex = sequence.indexOf(current);
    const nextIndex = (currentIndex + 1) % sequence.length;
    onChange(sequence[nextIndex]);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex shrink-0 cursor-pointer items-center gap-1 font-mono text-[0.62rem] tracking-[0.1em] text-color_textsecondary uppercase outline-none transition-colors hover:text-color_accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-color_accent"
    >
      {currentLabel}
      <span aria-hidden>›</span>
    </button>
  );
}
