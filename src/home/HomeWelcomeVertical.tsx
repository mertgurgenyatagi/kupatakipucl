import { Frame, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "../profile/deletedAccount";
import type { Player } from "../profile/usePlayers";

interface HomeWelcomeVerticalProps {
  me: Player;
  rank: number | string;
  points: number | string;
  onOpenCreateDialog?: () => void;
}

export function HomeWelcomeVertical({ me, rank, points, onOpenCreateDialog }: HomeWelcomeVerticalProps) {
  return (
    <Frame className="relative h-full animate-cotton-rise overflow-hidden border-color_border1/35">
      {me.photoURL && (
        <img
          src={me.photoURL}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 size-full scale-[5] object-cover blur-2xl brightness-50"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-background/65" />

      <FrameBody className="flex h-full flex-col items-center justify-between px-4 py-6 text-center">
        {/* Top: Avatar & Greeting */}
        <div className="flex flex-col items-center gap-3">
          <Avatar className="size-20 border-2 border-color_border1/50 shadow-lg sm:size-24">
            <AvatarImage src={me.photoURL} alt="" />
            <AvatarFallback className="font-mono text-lg text-color_textsecondary">
              {initials(me)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-1 flex flex-col items-center">
            <span className="font-display text-sm font-medium text-color_textsecondary">Hoş geldin,</span>
            <span className="font-display text-2xl font-extrabold tracking-tight text-color_text sm:text-3xl">{me.firstName}</span>
          </div>
        </div>

        {/* Create Lobby Button */}
        {onOpenCreateDialog && (
          <button
            type="button"
            onClick={onOpenCreateDialog}
            className="cursor-pointer inline-flex w-full shrink-0 items-center justify-center rounded-full bg-color_text px-5 py-3 text-xs sm:text-sm font-bold text-background transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-color_accent shadow-md"
          >
            Özel lobi oluştur
          </button>
        )}

        {/* Middle: Subtle Divider */}
        <div className="my-3 h-px w-12 bg-color_border1/40" />

        {/* Bottom: Rank & Points */}
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col items-center rounded-xl bg-background/40 p-2.5 backdrop-blur-xs border border-color_border1/30">
            <span className="font-mono text-[0.65rem] tracking-[0.12em] text-color_textsecondary uppercase">Sıra</span>
            <span className="font-display text-2xl font-bold text-color_text tnum">
              {typeof rank === "number" ? `#${rank}` : rank}
            </span>
          </div>

          <div className="flex flex-col items-center rounded-xl bg-background/40 p-2.5 backdrop-blur-xs border border-color_border1/30">
            <span className="font-mono text-[0.65rem] tracking-[0.12em] text-color_textsecondary uppercase">Puan</span>
            <span className="font-display text-2xl font-bold text-color_gold tnum">
              {points}
            </span>
          </div>
        </div>
      </FrameBody>
    </Frame>
  );
}
