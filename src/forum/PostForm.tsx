// src/forum/PostForm.tsx
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Quote, X } from "lucide-react";
import { createPost, QuoteRef } from "./createPost";
import { resolveMentionedUids, findActiveMentionQuery, matchMentionCandidates, insertMention, MentionQuery } from "../chat/chatMentions";
import { Player } from "../profile/usePlayers";
import { cn } from "@/lib/utils";

interface PostFormProps {
  uid: string;
  parentId: string | null;
  onPosted: () => void;
  /** Needed for the "@" autocomplete and to resolve mentioned uids at
   *  submit time — same convention as ChatComposer.tsx (chatMentions.ts is
   *  generic, reused as-is here). Omit it if no player list is in scope
   *  yet; mentions just won't autocomplete. */
  players?: Player[];
  placeholder?: string;
  autoFocus?: boolean;
  /** A reply staged via ReplyRow's quote button (forum-round-01/02) — shown
   *  as a dismissible chip above the textarea. Only ever passed for a reply
   *  composer, never the new-thread box. */
  quote?: QuoteRef | null;
  onClearQuote?: () => void;
}

export function PostForm({
  uid,
  parentId,
  onPosted,
  players = [],
  placeholder = "Bir şeyler yaz…",
  autoFocus = false,
  quote = null,
  onClearQuote,
}: PostFormProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mentionCandidates = players.filter((p) => p.uid !== uid);
  const candidates = mention ? matchMentionCandidates(mentionCandidates, mention.query) : [];
  const showDropdown = mention !== null && candidates.length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function handleChange(value: string) {
    setText(value);
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
    if (!text.trim() && !imageFile) return;
    try {
      await createPost(uid, text, imageFile, parentId, resolveMentionedUids(text, players), quote);
      setText("");
      setImageFile(null);
      setError(null);
      onClearQuote?.();
      onPosted();
    } catch (err) {
      console.error("Failed to create post", err);
      setError("Gönderi paylaşılamadı, tekrar deneyin.");
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

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
      {quote && (
        <div className="flex items-start gap-2 rounded-md border-l-2 border-brass/50 bg-brass/[0.06] py-1.5 pr-2 pl-2.5 text-xs text-ink/80">
          <Quote className="mt-0.5 size-3 shrink-0 text-brass" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{quote.text}</span>
          <button
            type="button"
            onClick={onClearQuote}
            aria-label="Alıntıyı kaldır"
            className="shrink-0 cursor-pointer text-muted-foreground hover:text-ink"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      )}

      {showDropdown && (
        <ul className="absolute bottom-full left-0 z-10 mb-1.5 max-h-40 w-48 overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-frame">
          {candidates.map((player, i) => (
            <li key={player.uid}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickMention(player)}
                className={cn(
                  "block w-full cursor-pointer truncate px-3 py-1.5 text-left text-sm",
                  i === activeSuggestion ? "bg-brass/[0.12] text-brass" : "text-ink hover:bg-muted"
                )}
              >
                {player.firstName} {player.lastName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          className="no-scrollbar max-h-40 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-border/70 bg-background px-4 py-2 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-brass"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="sr-only"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Resim ekle"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          <ImagePlus className="size-4" aria-hidden />
        </button>
        <button
          type="submit"
          className="shrink-0 cursor-pointer rounded-lg bg-ink px-4 py-2 text-sm font-medium text-background outline-none transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Paylaş
        </button>
      </div>

      {imagePreviewUrl && (
        <div className="relative w-fit">
          <img
            src={imagePreviewUrl}
            alt="Seçilen resim önizlemesi"
            className="max-h-28 rounded-lg border border-border/60 object-cover"
          />
          <button
            type="button"
            onClick={() => setImageFile(null)}
            aria-label="Resmi kaldır"
            className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
