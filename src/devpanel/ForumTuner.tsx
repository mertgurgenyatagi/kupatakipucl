import { useMemo, useState } from "react";
import { Forum } from "../forum/Forum";
import { Player } from "../profile/usePlayers";
import { PostWithId } from "../forum/postTypes";
import { LikesByPost } from "../forum/usePostLikes";

const FIRST_NAMES = ["Ada", "Kuzey", "Deniz", "Elif", "Kaan", "Zeynep", "Cem", "Ece"];
const LAST_NAMES = ["Yılmaz", "Kaya", "Demir", "Şahin"];

function generatePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `fake-player-${i}`,
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    lastName: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
    photoURL: "",
    createdAt: i,
  }));
}

const ME: Player = { uid: "me", firstName: "Mert", lastName: "G", photoURL: "", createdAt: 0 };

function fakeThumbnail(seed: number): string {
  const hue = (seed * 47) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='140'><rect width='200' height='140' fill='hsl(${hue} 40% 45%)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const LONG_TEXT =
  "Bu sezon başlamadan önce herkesin tahminini görmek isterim. Geçen sene son haftaya kadar kafası karışık gitmiştik ama bu sefer daha erken netleşecek gibi duruyor. Fikstür açıklandığında biraz şaşırdım açıkçası, üst sıralardaki takımların çoğu birbirine denk düşmüş.";

/** A rich, varied fixture set — deliberately messier than
 *  HomeLoggedInTuner.tsx's own generatePosts (that one only needs to prove
 *  the small Home preview card works): threads with 0, 2, and 6+ replies
 *  (to actually show the "+N önceki yanıt" banner), a quoted reply, an
 *  edited post, a long clamped root post, and a couple of MY OWN posts (so
 *  the edit/delete buttons have something to attach to while tuning). */
function generatePosts(players: Player[]): PostWithId[] {
  const pool = [ME, ...players];
  const posts: PostWithId[] = [];
  const now = Date.now();

  function root(id: string, uid: string, text: string, opts: Partial<PostWithId> = {}): PostWithId {
    return {
      id,
      uid,
      text,
      imageURL: null,
      parentId: null,
      createdAt: now - 1000,
      editedAt: null,
      mentionedUids: [],
      quotedPostId: null,
      quotedAuthorUid: null,
      quotedText: null,
      ...opts,
    };
  }
  function reply(id: string, uid: string, parentId: string, text: string, createdAt: number, opts: Partial<PostWithId> = {}): PostWithId {
    return {
      id,
      uid,
      text,
      imageURL: null,
      parentId,
      createdAt,
      editedAt: null,
      mentionedUids: [],
      quotedPostId: null,
      quotedAuthorUid: null,
      quotedText: null,
      ...opts,
    };
  }

  posts.push(root("t1", ME.uid, "Bu sene kimse benim tahminimi geçemez.", { createdAt: now - 3_600_000 }));
  posts.push(reply("t1-r1", pool[1].uid, "t1", "Hadi ordan, geçen sene son sıradaydın.", now - 3_500_000));

  posts.push(root("t2", pool[1].uid, LONG_TEXT, { createdAt: now - 7_200_000, imageURL: fakeThumbnail(2) }));

  posts.push(root("t3", pool[2].uid, "Kimin tahmini en saçma bakalım?", { createdAt: now - 10_800_000 }));
  for (let i = 0; i < 6; i++) {
    posts.push(
      reply(`t3-r${i}`, pool[(i + 1) % pool.length].uid, "t3", `Cevap numara ${i + 1}.`, now - 10_000_000 + i * 300_000)
    );
  }
  posts.push(
    reply("t3-r6", ME.uid, "t3", "Bu konuda kesinlikle haklısın.", now - 8_000_000, {
      quotedPostId: "t3-r2",
      quotedAuthorUid: pool[3 % pool.length].uid,
      quotedText: "Cevap numara 3.",
    })
  );
  posts.push(
    reply("t3-r-gone", pool[1].uid, "t3", "Az önce söylediğin gibi.", now - 7_500_000, {
      quotedPostId: "does-not-exist",
      quotedAuthorUid: pool[2].uid,
      quotedText: "silinmiş bir yanıttan alıntı",
    })
  );

  posts.push(
    root("t4", ME.uid, "Bu gönderiyi düzenledim, düzenlendi etiketi görünmeli.", {
      createdAt: now - 14_400_000,
      editedAt: now - 1_000_000,
    })
  );

  posts.push(root("t5", pool[2].uid, "Boş bir konu, hiç yanıtı yok.", { createdAt: now - 18_000_000 }));

  return posts;
}

function generateLikes(posts: PostWithId[], players: Player[]): LikesByPost {
  const pool = [ME, ...players];
  const map: LikesByPost = new Map();
  posts.forEach((post, i) => {
    const likeCount = (i * 3) % 5;
    const uids = new Set<string>();
    for (let k = 0; k < likeCount; k++) uids.add(pool[(i + k) % pool.length].uid);
    map.set(post.id, uids);
  });
  return map;
}

/**
 * Dev-only preview for the real /forum page — renders Forum.tsx itself
 * (not a lookalike), same reasoning as HomeLoggedInTuner.tsx: exercising a
 * signed-in session's forum data normally needs a real Google sign-in and
 * real seeded threads, which this sidesteps. The fixture set is deliberately
 * messier than the Home widget's own preview needs — it exists specifically
 * to show every state at once: a >3-reply thread (the omitted banner), a
 * live quote, an orphaned/deleted quote (gray), a long clamped post, an
 * edited post, and a couple of posts owned by "me" so edit/delete have
 * something to attach to.
 *
 * Gated behind import.meta.env.DEV in App.tsx, same as /dev itself.
 */
export function ForumTuner() {
  const [count, setCount] = useState(8);
  const [likeError, setLikeError] = useState<string | null>(null);

  const players = useMemo(() => generatePlayers(count), [count]);
  const initialPosts = useMemo(() => generatePosts(players), [players]);
  const [posts, setPosts] = useState<PostWithId[]>(initialPosts);
  const [likesByPost, setLikesByPost] = useState<LikesByPost>(() => generateLikes(initialPosts, players));

  function resetFixtures() {
    const fresh = generatePosts(players);
    setPosts(fresh);
    setLikesByPost(generateLikes(fresh, players));
    setLikeError(null);
  }

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

  function handleDeletePost(postId: string) {
    const replyIds = posts.filter((p) => p.parentId === postId).map((p) => p.id);
    const toRemove = new Set([postId, ...replyIds]);
    setPosts((prev) => prev.filter((p) => !toRemove.has(p.id)));
  }

  function handleSaveEdit(postId: string, text: string) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, text, editedAt: Date.now() } : p)));
  }

  return (
    <div className="flex h-full min-h-0 bg-background text-ink">
      <div className="no-scrollbar hidden w-[280px] shrink-0 overflow-y-auto border-r border-border bg-card p-4 md:block">
        <h1 className="font-display text-base font-bold text-ink">Forum Tuner</h1>
        <p className="mt-1 mb-5 text-xs text-muted-foreground">
          Bu, Forum.tsx'in kendisi — kopyası değil. "me" olarak giriş yapılmış varsayılır.
        </p>
        <div className="mb-4">
          <label className="mb-1 flex items-baseline justify-between text-xs">
            <span>Katılımcı sayısı</span>
            <span className="font-mono text-[0.68rem] text-brass tnum">{count}</span>
          </label>
          <input
            type="range"
            min={1}
            max={40}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-brass"
          />
        </div>
        <button
          type="button"
          onClick={resetFixtures}
          className="cursor-pointer text-xs text-muted-foreground underline hover:text-ink"
        >
          Kurguyu sıfırla
        </button>
        <p className="mt-4 text-[0.68rem] text-muted-foreground">
          Kalıcı değil: beğeni/silme/düzenleme yerel state üzerinde çalışır, Firestore'a hiçbir şey yazılmaz.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <Forum
          uid={ME.uid}
          posts={posts}
          players={[ME, ...players]}
          likesByPost={likesByPost}
          onToggleLike={handleToggleLike}
          onSelectParticipant={() => {}}
          onDeletePost={handleDeletePost}
          onSaveEdit={handleSaveEdit}
          onRefetch={() => {}}
          actionError={likeError}
        />
      </div>
    </div>
  );
}
