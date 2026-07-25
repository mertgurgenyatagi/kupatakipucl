import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { MessageWithId } from "./useMessages";
import { Player } from "../profile/usePlayers";
import { deleteMessage } from "./deleteMessage";
import { searchMessages } from "./searchMessages";
import { buildChatItems, formatMessageTime, ChatItem } from "./chatGrouping";
import { splitMentionSegments } from "./chatMentions";
import { ChatComposer } from "./ChatComposer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatRoomProps {
  uid: string;
  players: Player[];
  messages: MessageWithId[];
  onLoadOlder: () => void;
  loadingOlder: boolean;
  hasMoreOlder: boolean;
  typingUids: string[];
}

const SEARCH_DEBOUNCE_MS = 300;

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function typingLineText(typingUids: string[], players: Player[]): string | null {
  if (typingUids.length === 0) return null;
  const names = typingUids
    .map((id) => players.find((p) => p.uid === id)?.firstName)
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} yazıyor…`;
  if (names.length === 2) return `${names[0]} ve ${names[1]} yazıyor…`;
  return `${names.length} kişi yazıyor…`;
}

function MessageText({ text, players }: { text: string; players: Player[] }) {
  const segments = splitMentionSegments(text, players);
  return (
    <p className="text-sm break-words whitespace-pre-wrap text-navy-muted">
      {segments.map((segment, i) =>
        segment.isMention ? (
          <span key={i} className="font-semibold text-brass">
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </p>
  );
}

function MessageRow({
  message,
  showHeader,
  isOwn,
  mentionsMe,
  author,
  players,
  onDelete,
}: {
  message: MessageWithId;
  showHeader: boolean;
  isOwn: boolean;
  mentionsMe: boolean;
  author: Player | undefined;
  players: Player[];
  onDelete: (id: string) => void;
}) {
  return (
    <li className={cn("group flex items-start gap-2.5", showHeader ? "pt-2.5" : "pt-0.5")}>
      {showHeader ? (
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={author?.photoURL} alt="" />
          <AvatarFallback className="font-mono text-[0.55rem] text-muted-foreground">
            {author ? initials(author.firstName, author.lastName) : "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-7 shrink-0" />
      )}

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl px-3 py-1.5",
          isOwn ? "bg-brass/[0.1]" : mentionsMe ? "bg-amber-400/[0.1]" : "bg-transparent"
        )}
      >
        {showHeader && (
          <div className="mb-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-xs font-semibold text-ink">
              {author ? `${author.firstName} ${author.lastName}` : message.uid}
            </span>
            <span className="font-mono text-[0.6rem] text-muted-foreground tnum">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}
        {message.deleted ? (
          <p className="text-sm text-muted-foreground italic">Bu mesaj silindi.</p>
        ) : (
          <MessageText text={message.text} players={players} />
        )}
      </div>

      {isOwn && !message.deleted && (
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          aria-label="Mesajı sil"
          className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 outline-none transition-opacity duration-150 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass group-hover:opacity-100"
        >
          <Trash2 className="size-3" aria-hidden />
        </button>
      )}
    </li>
  );
}

/**
 * The chat/forum are DESIGN.md's designated outlet for warmth and banter —
 * genuinely loose, not just microscopically different from the rest of the
 * site (§6's Do list). Own messages get a faint brass-tinted background;
 * a message that @mentions the current user gets a faint amber tint instead
 * (chat-widget-round-01 Q14) — everyone else's stay plain.
 *
 * `messages` arrives pre-capped and chronological (useMessages.ts caps the
 * live window and exposes onLoadOlder for history beyond it — Q2).
 */
export function ChatRoom({ uid, players, messages, onLoadOlder, loadingOlder, hasMoreOlder, typingUids }: ChatRoomProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageWithId[]>([]);
  const [searching, setSearching] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef(0);

  const playersByUid = useMemo(() => new Map(players.map((p) => [p.uid, p])), [players]);
  const items: ChatItem[] = useMemo(() => buildChatItems(messages), [messages]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const firstId = messages[0]?.id ?? null;

    if (prevFirstIdRef.current !== null && messages.length > 0 && firstId !== prevFirstIdRef.current) {
      // Older messages were just prepended (onLoadOlder) — keep whatever was
      // on screen anchored in place instead of jumping.
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
    } else {
      el.scrollTop = el.scrollHeight;
    }

    prevFirstIdRef.current = firstId;
    prevScrollHeightRef.current = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      searchMessages(trimmed)
        .then(setSearchResults)
        .catch((err) => console.error("Failed to search messages", err))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchQuery, searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function handleDelete(messageId: string) {
    setDeleteError(null);
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error("Failed to delete message", err);
      setDeleteError("Mesaj silinemedi, tekrar deneyin.");
    }
  }

  const typingText = typingLineText(typingUids, players);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {searchOpen ? (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border/50 px-3 py-1.5 sm:px-4">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sohbette ara…"
            className="min-w-0 flex-1 rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-ink outline-none placeholder:text-muted-foreground focus:border-brass"
          />
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Aramayı kapat"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Sohbette ara"
          className="absolute top-1.5 right-3 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass sm:right-4"
        >
          <Search className="size-3.5" aria-hidden />
        </button>
      )}

      {searchOpen ? (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
          {searching && <p className="text-center text-xs text-muted-foreground">Aranıyor…</p>}
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">Sonuç bulunamadı.</p>
          )}
          <ul className="flex flex-col gap-3">
            {searchResults.map((message) => {
              const author = playersByUid.get(message.uid);
              return (
                <li key={message.id} className="rounded-lg border border-border/50 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xs font-semibold text-ink">
                      {author ? `${author.firstName} ${author.lastName}` : message.uid}
                    </span>
                    <span className="shrink-0 font-mono text-[0.6rem] text-muted-foreground tnum">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-navy-muted">{message.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
          <p className="text-center font-display text-sm text-muted-foreground italic">Henüz mesaj yok.</p>
        </div>
      ) : (
        <ul ref={listRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-6">
          {hasMoreOlder && (
            <li className="flex justify-center pb-2">
              <button
                type="button"
                onClick={onLoadOlder}
                disabled={loadingOlder}
                className="cursor-pointer rounded-full border border-border/70 px-3 py-1 font-mono text-[0.62rem] text-muted-foreground uppercase outline-none transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brass disabled:cursor-default disabled:opacity-60"
              >
                {loadingOlder ? "Yükleniyor…" : "Daha eski mesajları yükle"}
              </button>
            </li>
          )}
          {items.map((item) =>
            item.type === "divider" ? (
              <li key={item.key} className="flex justify-center py-2.5">
                <span className="rounded-full bg-muted px-3 py-1 font-mono text-[0.62rem] tracking-wide text-muted-foreground uppercase">
                  {item.label}
                </span>
              </li>
            ) : (
              <MessageRow
                key={item.key}
                message={item.message}
                showHeader={item.showHeader}
                isOwn={item.message.uid === uid}
                mentionsMe={item.message.mentionedUids?.includes(uid) ?? false}
                author={playersByUid.get(item.message.uid)}
                players={players}
                onDelete={handleDelete}
              />
            )
          )}
        </ul>
      )}

      <div className="h-5 shrink-0 px-5 sm:px-6" aria-live="polite">
        {typingText && <p className="text-xs text-muted-foreground italic">{typingText}</p>}
      </div>

      <ChatComposer uid={uid} players={players} />
      {deleteError && (
        <p role="alert" className="px-3 pb-2 text-xs text-destructive sm:px-4">
          {deleteError}
        </p>
      )}
    </div>
  );
}
