import { useEffect, useMemo, useState } from "react";
import { HomeLandingLoggedIn } from "../home/HomeLandingLoggedIn";
import { Player } from "../profile/usePlayers";
import { MessageWithId } from "../chat/useMessages";
import { PostWithId } from "../forum/postTypes";
import { LikesByPost } from "../forum/usePostLikes";

const FIRST_NAMES = [
  "Ada", "Kuzey", "Deniz", "Elif", "Kaan", "Mert", "Zeynep", "Cem",
  "Ece", "Barış", "Selin", "Onur", "Aslı", "Emre", "Buse", "Tolga",
];
const LAST_NAMES = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Arslan", "Doğan", "Aydın"];

function generatePlayers(count: number): Player[] {
  // Last name only advances once every full cycle of first names (16 x 8 =
  // 128 distinct combos before any repeat) — stepping both per-player would
  // make the pair's combined cycle length just 16 (lcm of 16 and any
  // divisor of 8), producing obvious duplicate full names well before a
  // realistic participant count.
  return Array.from({ length: count }, (_, i) => ({
    uid: `fake-player-${i}`,
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    lastName: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
    photoURL: "",
    createdAt: i,
  }));
}

const ME: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };

// Staggered on purpose, not evenly spaced: every 6th gap jumps ~20h back so
// date dividers (chat-widget-round-01 Q3) actually show up while tuning at
// a realistic message count, and short runs of the same sender (1-3 in a
// row) exercise the consecutive-message grouping instead of every message
// starting a fresh header.
function generateMessages(count: number, players: Player[]): MessageWithId[] {
  const pool = [ME, ...players];
  const lines = [
    "Kimin tahminleri en saçma acaba",
    "Bu sene şansımız yaver gidecek",
    "Tabloyu görebiliyor muyuz henüz?",
    "Hazırım, kayıt oldum bile",
    "Kim kiminle aynı fikirde bakalım",
    "Geri sayım bitmeden gönderin şunu",
  ];

  const times: number[] = new Array(count);
  let cursor = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    times[i] = cursor;
    cursor -= (i % 6 === 0 ? 20 * 60 : 3) * 60_000;
  }

  const messages: MessageWithId[] = [];
  let senderIdx = 0;
  let runLeft = 0;
  for (let i = 0; i < count; i++) {
    if (runLeft === 0) {
      senderIdx = (senderIdx + 1 + (i % 3)) % pool.length;
      runLeft = 1 + (i % 3);
    }
    runLeft--;

    const isMention = pool.length > 1 && i % 7 === 3;
    const isDeleted = i % 11 === 5 && i !== count - 1;
    messages.push({
      id: `fake-msg-${i}`,
      uid: pool[senderIdx].uid,
      text: isMention ? `@${ME.firstName} bu konuda ne diyorsun?` : lines[i % lines.length],
      createdAt: times[i],
      ...(isMention ? { mentionedUids: [ME.uid] } : {}),
      ...(isDeleted ? { deleted: true } : {}),
    });
  }
  return messages;
}

function generateOlderBatch(before: number, batchIndex: number, players: Player[]): MessageWithId[] {
  const pool = players.length > 0 ? players : [ME];
  return Array.from({ length: 10 }, (_, i) => ({
    id: `fake-older-${batchIndex}-${i}`,
    uid: pool[(i + batchIndex) % pool.length].uid,
    text: "Geçmişten bir mesaj.",
    createdAt: before - (10 - i) * 3_600_000 - batchIndex * 36_000_000,
  }));
}

// A flat-colored square, not a real photo — purely so the widget's image
// thumbnail has *something* to render while tuning; varied hue per index so
// adjacent posts with photos are visually distinguishable in a screenshot.
function fakeThumbnail(seed: number): string {
  const hue = (seed * 47) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='hsl(${hue} 35% 45%)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Half the top-level posts get 0-2 replies, staggered later in time, so the
// bump-to-top / reply-count behavior (forum-widget-round-01 Q1/Q6/Q2) is
// actually visible while tuning, not just theoretical.
function generatePosts(threadCount: number, players: Player[]): PostWithId[] {
  const lines = [
    "Bu sene kimse benim tahminimi geçemez.",
    "36 takımı sıralamak sandığımdan zor çıktı.",
    "Geçen seneki kupayı kim aldı hatırlayan var mı?",
    "Yeni sezon fikstürü çok sert görünüyor.",
  ];
  const replyLines = ["Aynen öyle.", "Hiç katılmıyorum.", "Haklısın bence.", "Emin değilim açıkçası."];
  const pool = players.length > 0 ? players : [ME];
  const posts: PostWithId[] = [];

  for (let i = 0; i < threadCount; i++) {
    const id = `fake-post-${i}`;
    const baseCreatedAt = Date.now() - (threadCount - i) * 3_600_000;
    posts.push({
      id,
      uid: pool[i % pool.length].uid,
      text: lines[i % lines.length],
      imageURL: i % 4 === 1 ? fakeThumbnail(i) : null,
      parentId: null,
      createdAt: baseCreatedAt,
      editedAt: null,
      mentionedUids: [],
      quotedPostId: null,
      quotedAuthorUid: null,
      quotedText: null,
    });

    if (i % 2 === 0) {
      const replyCount = 1 + (i % 2);
      for (let r = 0; r < replyCount; r++) {
        posts.push({
          id: `${id}-reply-${r}`,
          uid: pool[(i + r + 1) % pool.length].uid,
          text: replyLines[(i + r) % replyLines.length],
          imageURL: null,
          parentId: id,
          createdAt: baseCreatedAt + (r + 1) * 600_000,
          editedAt: null,
          mentionedUids: [],
          quotedPostId: null,
          quotedAuthorUid: null,
          quotedText: null,
        });
      }
    }
  }
  return posts;
}

function generateLikes(posts: PostWithId[], players: Player[]): LikesByPost {
  const pool = [ME, ...players];
  const map: LikesByPost = new Map();
  posts
    .filter((post) => post.parentId === null)
    .forEach((post, i) => {
      const likeCount = (i * 3) % 6;
      const uids = new Set<string>();
      for (let k = 0; k < likeCount; k++) {
        uids.add(pool[(i + k) % pool.length].uid);
      }
      map.set(post.id, uids);
    });
  return map;
}

const MAX_OLDER_LOADS = 3;

/**
 * Dev-only preview for HomeLandingLoggedIn — renders the *actual* component
 * with synthetic data, same reasoning as StatsPageTuner.tsx: this page's
 * real data (a signed-in session with real profile/prediction/chat/forum
 * docs) isn't reachable without a real Google sign-in, so this sidesteps
 * that entirely and exercises every state on demand instead (0 participants,
 * nobody's submitted yet, an active chat, an empty forum, etc).
 *
 * The like toggle and "load older messages" are both real (local state, not
 * Firestore) — same interaction as production, just not persisted anywhere.
 * Online count and who's-typing are sliders rather than a live presence/
 * typing feed, for the same reason.
 *
 * Gated behind import.meta.env.DEV in App.tsx, same as /dev itself.
 */
export function HomeLoggedInTuner() {
  const [count, setCount] = useState(24);
  const [submittedPct, setSubmittedPct] = useState(40);
  const [messageCount, setMessageCount] = useState(14);
  const [postCount, setPostCount] = useState(4);
  const [onlineCount, setOnlineCount] = useState(5);
  const [typingCount, setTypingCount] = useState(1);

  const players = useMemo(() => generatePlayers(count), [count]);
  const baseMessages = useMemo(() => generateMessages(messageCount, players), [messageCount, players]);
  const posts = useMemo(() => generatePosts(postCount, players), [postCount, players]);

  const [olderMessages, setOlderMessages] = useState<MessageWithId[]>([]);
  useEffect(() => {
    setOlderMessages([]);
  }, [baseMessages]);

  const messages = [...olderMessages, ...baseMessages];
  const hasMoreOlder = olderMessages.length / 10 < MAX_OLDER_LOADS;

  function handleLoadOlder() {
    const earliest = messages[0]?.createdAt ?? Date.now();
    const batchIndex = olderMessages.length / 10;
    setOlderMessages((prev) => [...generateOlderBatch(earliest, batchIndex, players), ...prev]);
  }

  const typingUids = players.slice(0, typingCount).map((p) => p.uid);

  const submitterUids = useMemo(() => {
    const submittedCount = Math.round((submittedPct / 100) * players.length);
    return new Set(players.slice(0, submittedCount).map((p) => p.uid));
  }, [players, submittedPct]);

  const [likesByPost, setLikesByPost] = useState<LikesByPost>(new Map());
  useEffect(() => {
    setLikesByPost(generateLikes(posts, players));
  }, [posts, players]);

  function handleToggleLike(postId: string) {
    setLikesByPost((prev) => {
      const next = new Map(prev);
      const uids = new Set(next.get(postId) ?? []);
      if (uids.has(ME.uid)) uids.delete(ME.uid);
      else uids.add(ME.uid);
      next.set(postId, uids);
      return next;
    });
  }

  const slider = (
    label: string,
    value: number,
    max: number,
    onChange: (v: number) => void,
    min = 0
  ) => (
    <div className="mb-4">
      <label className="mb-1 flex items-baseline justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-[0.68rem] text-color_accent tnum">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-color_accent"
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 bg-background text-color_text">
      {/* Hidden below md: the fixed 280px control rail eats into Tailwind's
          viewport-relative sm:/md: breakpoints for whatever renders beside
          it, so a narrow-viewport check with the rail still showing doesn't
          match how the real page (no rail competing for width) behaves at
          that same width. Below md, the preview alone gets the full
          viewport — controls trade off for an accurate mobile check. */}
      <div className="no-scrollbar hidden w-[280px] shrink-0 overflow-y-auto border-r border-color_border1 bg-card p-4 md:block">
        <h1 className="font-display text-base font-bold text-color_text">Home (Logged-in) Tuner</h1>
        <p className="mt-1 mb-5 text-xs text-color_textsecondary">
          Bu, HomeLandingLoggedIn.tsx'in kendisi — kopyası değil.
        </p>
        {slider("Katılımcı sayısı", count, 80, setCount)}
        {slider("Tahmin gönderen yüzdesi", submittedPct, 100, setSubmittedPct)}
        {slider("Mesaj sayısı", messageCount, 40, setMessageCount)}
        {slider("Çevrimiçi sayısı", onlineCount, Math.max(count, 1), setOnlineCount)}
        {slider("Yazan kişi sayısı", typingCount, 3, setTypingCount)}
        {slider("Forum konu sayısı", postCount, 20, setPostCount)}
        <p className="mt-1 text-[0.68rem] text-color_textsecondary">
          Konuların yaklaşık yarısına otomatik yanıt ve bazılarına fotoğraf eklenir. Kalpler ve "daha eski
          mesajları yükle" tıklanabilir (yerel, kalıcı değil). Mesajların bir kısmı seni etiketler, bir kısmı
          silinmiş olarak gösterilir.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <HomeLandingLoggedIn
          me={ME}
          players={players}
          submitterUids={submitterUids}
          messages={messages}
          onLoadOlderMessages={handleLoadOlder}
          loadingOlderMessages={false}
          hasMoreOlderMessages={hasMoreOlder}
          onlineCount={onlineCount}
          typingUids={typingUids}
          posts={posts}
          likesByPost={likesByPost}
          onToggleLike={handleToggleLike}
          likeError={null}
          onDeletePost={() => {}}
          onSaveEdit={() => {}}
          onRefetchPosts={() => {}}
          forumActionError={null}
        />
      </div>
    </div>
  );
}
