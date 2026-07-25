import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Player } from "../profile/usePlayers";
import { sendMessage } from "./sendMessage";
import { setTypingStatus } from "./useTypingStatus";
import { MESSAGE_MAX_LENGTH, MESSAGE_LENGTH_WARNING_AT } from "./messageTypes";
import {
  findActiveMentionQuery,
  matchMentionCandidates,
  insertMention,
  resolveMentionedUids,
  MentionQuery,
} from "./chatMentions";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  uid: string;
  players: Player[];
}

// Re-sending "still typing" more often than this would just be noise —
// useTypingStatus.ts's reader-side staleness window (6s) is what actually
// makes the indicator disappear if someone stops without this ever firing
// a "false".
const TYPING_RESEND_MS = 2000;
const MAX_TEXTAREA_HEIGHT_PX = 112;

export function ChatComposer({ uid, players }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSentRef = useRef(0);

  const mentionCandidates = players.filter((p) => p.uid !== uid);
  const candidates = mention ? matchMentionCandidates(mentionCandidates, mention.query) : [];
  const showDropdown = mention !== null && candidates.length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [text]);

  function reportTyping(hasText: boolean) {
    const now = Date.now();
    if (hasText) {
      if (now - lastTypingSentRef.current > TYPING_RESEND_MS) {
        lastTypingSentRef.current = now;
        setTypingStatus(uid, true).catch((err) => console.error("Failed to send typing status", err));
      }
    } else {
      lastTypingSentRef.current = 0;
      setTypingStatus(uid, false).catch((err) => console.error("Failed to clear typing status", err));
    }
  }

  function handleChange(value: string) {
    setText(value);
    reportTyping(value.trim().length > 0);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    setMention(findActiveMentionQuery(value, cursor));
    setActiveSuggestion(0);
  }

  function pickMention(player: Player) {
    if (!mention || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? text.length;
    const result = insertMention(text, mention, cursor, player);
    setText(result.text);
    setMention(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim()) return;
    const mentionedUids = resolveMentionedUids(text, players);
    try {
      await sendMessage(uid, text, mentionedUids);
      setText("");
      setMention(null);
      setError(null);
      reportTyping(false);
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Mesaj gönderilemedi, tekrar deneyin.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showDropdown) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestion((i) => (i + 1) % candidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestion((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pickMention(candidates[activeSuggestion]);
        return;
      }
      if (event.key === "Escape") {
        setMention(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  const length = text.length;
  const showCounter = length >= MESSAGE_LENGTH_WARNING_AT;

  return (
    <div className="relative shrink-0 border-t border-border/50">
      {showDropdown && (
        <ul className="absolute bottom-full left-3 z-10 mb-1.5 max-h-40 w-48 overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-frame">
          {candidates.map((player, i) => (
            <li key={player.uid}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickMention(player)}
                className={cn(
                  "block w-full truncate px-3 py-1.5 text-left text-sm",
                  i === activeSuggestion ? "bg-brass/[0.12] text-brass" : "text-ink hover:bg-muted"
                )}
              >
                {player.firstName} {player.lastName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 sm:px-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={1}
          placeholder="Bir şeyler yaz…"
          className="max-h-28 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-border/70 bg-background px-4 py-2 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-brass"
        />
        <button
          type="submit"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-background outline-none transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          <span className="sr-only">Gönder</span>
          <Send className="size-3.5" aria-hidden />
        </button>
      </form>

      {(error || showCounter) && (
        <div className="flex items-center justify-between px-3 pb-2 sm:px-4">
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : (
            <span />
          )}
          {showCounter && (
            <span
              className={cn(
                "font-mono text-[0.65rem] tnum",
                length >= MESSAGE_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {length} / {MESSAGE_MAX_LENGTH}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
