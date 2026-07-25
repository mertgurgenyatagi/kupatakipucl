import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FrameBody } from "@/components/ui/frame";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChatRoom } from "../chat/ChatRoom";
import { RecentPostsPreview, ForumPreviewFooter } from "../forum/RecentPostsPreview";
import { ParticipantStatusList } from "./ParticipantStatusList";
import { HomeHero } from "./HomeHero";
import { useCountdown } from "./useCountdown";
import { TOURNAMENT_START_ISO } from "./deadlines";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import type { RankedEntry } from "../leaderboard/ranking";
import type { Player } from "../profile/usePlayers";
import type { MessageWithId } from "../chat/useMessages";
import type { PostWithId } from "../forum/postTypes";

interface HomeLandingLoggedInProps {
  me: Player;
  players: Player[];
  submitterUids: Set<string>;
  messages: MessageWithId[];
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreOlderMessages: boolean;
  onlineCount: number;
  typingUids: string[];
  posts: PostWithId[];
  likesByPost: Map<string, Set<string>>;
  onToggleLike: (postId: string) => void;
  likeError: string | null;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function MiniCountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-2xl leading-none font-semibold text-ink tnum sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase">{label}</span>
    </span>
  );
}

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
// Hero sits at 60% of an equal quarter-share (9fr of a 17/17/17 baseline —
// i.e. 15% of the row) with the other three equally splitting what's left
// (85% / 3 ≈ 28.3% each), per Mert's explicit ratio call rather than a
// plain 4-way equal split.
const CELL_ROW =
  "grid min-w-0 flex-1 gap-4 sm:gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[17fr_17fr_9fr_17fr] [&>*]:min-h-0 [&>*]:min-w-0";
const CELL = "h-[26rem] lg:h-full animate-cotton-rise";

/**
 * Home, logged-in + not-started (PAGEMAP_SPEC §3's "Logged-in Home" +
 * PAGE_BRIEFING.txt's dedicated "HOME - logged in, not started" section).
 * Every other logged-in page/state already speaks the Frame/bento idiom
 * (StatsPage, LeaderboardPage) — this one joins it rather than borrowing
 * HomeLandingLoggedOut's stacked full-bleed bands, which are explicitly that
 * page's own one-off exception (§0b again: composed cells, not one dense
 * sheet).
 *
 * Navy shows up as each cell's header band, not a full-width strip under
 * AppShell's own navy top bar — stacking two full-bleed navy bars is the
 * exact "corporate masthead" silhouette §0b already got rejected once for.
 */
export function HomeLandingLoggedIn({
  me,
  players,
  submitterUids,
  messages,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreOlderMessages,
  onlineCount,
  typingUids,
  posts,
  likesByPost,
  onToggleLike,
  likeError,
}: HomeLandingLoggedInProps) {
  const countdown = useCountdown(TOURNAMENT_START_ISO);

  // Participant popup, notstarted-logged-in edition (round-04): Home's
  // Katılımcılar list is the only place this state can ever open it from, so
  // there's no real leaderboard yet to look a rank/points up in — everyone's
  // tied at 0 pre-start anyway, so that's exactly what's shown. The popup's
  // own widgets (predictions, quiz, rank-over-time) don't touch this data;
  // they show their own "not viewable yet" placeholder via `tournamentStarted`.
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string | null>(null);
  const selectedPlayer = players.find((p) => p.uid === selectedPlayerUid) ?? null;
  const selectedRanked: RankedEntry | null = selectedPlayer
    ? {
        entry: {
          uid: selectedPlayer.uid,
          firstName: selectedPlayer.firstName,
          lastName: selectedPlayer.lastName,
          photoURL: selectedPlayer.photoURL,
          points: 0,
          ranking: [],
        },
        rank: 1,
      }
    : null;

  return (
    <div className={PAGE_SHELL}>
      {/* Personal welcome + primary action + countdown — one frame, no
          title band (ParticipantPopup's "no widget carries a label" rule
          applies here too: a greeting doesn't need to identify itself). */}
      <Frame className="shrink-0 animate-cotton-rise">
        <FrameBody className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar className="size-14 shrink-0">
              <AvatarImage src={me.photoURL} alt="" />
              <AvatarFallback className="font-mono text-sm text-muted-foreground">
                {initials(me.firstName, me.lastName)}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 truncate font-display text-xl text-ink sm:text-2xl">
              Hoş geldin, <span className="font-bold">{me.firstName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            {/* /predictions is a one-time door (predictions-page-round-02
                §E) — once submitted, there's nothing left to do there, so
                the button that leads to it just stops existing. */}
            {!submitterUids.has(me.uid) && (
              <Link
                to="/predictions"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-background outline-none transition-all duration-150 ease-[var(--ease-cotton)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
              >
                Tahminini Yap
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}

            {!countdown.done && (
              <div className="flex items-baseline gap-4 whitespace-nowrap">
                <span className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Tahminlerin Kapanmasına
                </span>
                <div className="flex items-baseline gap-3.5">
                  <MiniCountdownDigit value={countdown.days} label="Gün" />
                  <MiniCountdownDigit value={countdown.hours} label="Saat" />
                  <MiniCountdownDigit value={countdown.minutes} label="Dk" />
                  <MiniCountdownDigit value={countdown.seconds} label="Sn" />
                </div>
              </div>
            )}
          </div>
        </FrameBody>
      </Frame>

      <div className={CELL_ROW}>
        <Frame className={CELL} style={{ animationDelay: "60ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-base text-navy-ink sm:text-lg">Katılımcılar</FrameTitle>
          </FrameHeader>
          <FrameBody>
            <ParticipantStatusList
              players={players}
              submitterUids={submitterUids}
              onSelectPlayer={setSelectedPlayerUid}
            />
          </FrameBody>
        </Frame>

        <Frame className={CELL} style={{ animationDelay: "120ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-base text-navy-ink sm:text-lg">Forum</FrameTitle>
          </FrameHeader>
          <FrameBody>
            <RecentPostsPreview
              posts={posts}
              players={players}
              uid={me.uid}
              likesByPost={likesByPost}
              onToggleLike={onToggleLike}
            />
            {likeError && (
              <p role="alert" className="shrink-0 px-5 pb-2 text-[0.72rem] text-destructive sm:px-6">
                {likeError}
              </p>
            )}
            <ForumPreviewFooter />
          </FrameBody>
        </Frame>

        <HomeHero className={CELL} style={{ animationDelay: "180ms" }} />

        <Frame className={CELL} style={{ animationDelay: "240ms" }}>
          <FrameHeader tone="navy">
            <FrameTitle className="text-base text-navy-ink sm:text-lg">Sohbet</FrameTitle>
            <span className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.1em] text-navy-ink/70 uppercase tnum">
              <span className="size-1.5 rounded-full bg-brass" aria-hidden />
              {onlineCount} çevrimiçi
            </span>
          </FrameHeader>
          <FrameBody>
            <ChatRoom
              uid={me.uid}
              players={players}
              messages={messages}
              onLoadOlder={onLoadOlderMessages}
              loadingOlder={loadingOlderMessages}
              hasMoreOlder={hasMoreOlderMessages}
              typingUids={typingUids}
            />
          </FrameBody>
        </Frame>
      </div>

      <ParticipantPopup
        ranked={selectedRanked}
        entries={[]}
        results={{}}
        onOpenChange={(open) => {
          if (!open) setSelectedPlayerUid(null);
        }}
        onSelectTeam={() => {}}
        tournamentStarted={false}
      />
    </div>
  );
}
