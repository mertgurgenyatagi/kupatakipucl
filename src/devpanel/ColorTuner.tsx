import { useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { HomeLandingLoggedIn } from "../home/HomeLandingLoggedIn";
import { Player } from "../profile/usePlayers";
import { MessageWithId } from "../chat/useMessages";
import { PostWithId } from "../forum/postTypes";
import { LikesByPost } from "../forum/usePostLikes";

// Same synthetic-data approach as HomeLoggedInTuner.tsx (fixed counts here
// instead of sliders — this tuner's own controls are entirely about color,
// not content).
const FIRST_NAMES = ["Ada", "Kuzey", "Deniz", "Elif", "Kaan", "Mert", "Zeynep", "Cem", "Ece", "Barış"];
const LAST_NAMES = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik"];
const ME: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };

function generatePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `fake-player-${i}`,
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    lastName: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
    photoURL: "",
    createdAt: i,
  }));
}

function generateMessages(players: Player[]): MessageWithId[] {
  const pool = [ME, ...players];
  const lines = [
    "Kimin tahminleri en saçma acaba",
    "Bu sene şansımız yaver gidecek",
    "Tabloyu görebiliyor muyuz henüz?",
    "Hazırım, kayıt oldum bile",
    "@Mert bu konuda ne diyorsun?",
  ];
  const now = Date.now();
  return lines.map((text, i) => ({
    id: `fake-msg-${i}`,
    uid: pool[i % pool.length].uid,
    text,
    createdAt: now - (lines.length - i) * 180_000,
    ...(text.startsWith("@Mert") ? { mentionedUids: [ME.uid] } : {}),
  }));
}

function generatePosts(players: Player[]): PostWithId[] {
  const pool = players.length > 0 ? players : [ME];
  const lines = ["Bu sene kimse benim tahminimi geçemez.", "36 takımı sıralamak sandığımdan zor çıktı."];
  const posts: PostWithId[] = [];
  lines.forEach((text, i) => {
    const id = `fake-post-${i}`;
    posts.push({
      id,
      uid: pool[i % pool.length].uid,
      text,
      imageURL: null,
      parentId: null,
      createdAt: Date.now() - (lines.length - i) * 3_600_000,
      editedAt: null,
      mentionedUids: [],
      quotedPostId: null,
      quotedAuthorUid: null,
      quotedText: null,
    });
    if (i === 0) {
      posts.push({
        id: `${id}-reply-0`,
        uid: pool[(i + 1) % pool.length].uid,
        text: "Haklısın bence.",
        imageURL: null,
        parentId: id,
        createdAt: Date.now() - 3_000_000,
        editedAt: null,
        mentionedUids: [],
        quotedPostId: null,
        quotedAuthorUid: null,
        quotedText: null,
      });
    }
  });
  return posts;
}

// --- Color controls ------------------------------------------------------

interface SolidField {
  key: string;
  label: string;
  kind: "solid";
  defaultValue: string;
}
interface DerivedField {
  key: string;
  label: string;
  kind: "derived";
  defaultPct: number;
}
type Field = SolidField | DerivedField;

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Ana renkler",
    fields: [
      { key: "color_main", label: "Arka plan", kind: "solid", defaultValue: "#14120b" },
      { key: "color_secondary", label: "Panel yüzeyi", kind: "solid", defaultValue: "#1b1913" },
      { key: "color_text", label: "Metin", kind: "solid", defaultValue: "#edecec" },
      { key: "color_accent", label: "Vurgu (hover/focus)", kind: "solid", defaultValue: "#1f8a65" },
      { key: "color_green", label: "\"Doğru tahmin\" vurgusu", kind: "solid", defaultValue: "#1f8a65" },
      { key: "color_remove", label: "Sil / hata", kind: "solid", defaultValue: "#cf2d56" },
    ],
  },
  {
    title: "Türetilmiş (metin renginin belli bir yüzdesi)",
    fields: [
      { key: "color_textsecondary", label: "İkincil metin", kind: "derived", defaultPct: 55 },
      { key: "color_border1", label: "İnce çizgiler", kind: "derived", defaultPct: 20 },
      { key: "color_border2", label: "Focus halkası", kind: "derived", defaultPct: 60 },
      { key: "color_hoverfill", label: "Hover dolgusu", kind: "derived", defaultPct: 8 },
    ],
  },
  {
    title: "Diğer",
    fields: [
      { key: "color_gold", label: "Altın (rütbe/onay)", kind: "solid", defaultValue: "#fbbf24" },
      { key: "color_qualification", label: "Play-off rozeti", kind: "solid", defaultValue: "#f59e0b" },
      { key: "color_idk", label: "Karartma (lightbox/dialog)", kind: "solid", defaultValue: "#000000" },
      { key: "color_hover", label: "Beyaz hover dolgusu", kind: "solid", defaultValue: "#ffffff" },
    ],
  },
];

const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

function applySolid(key: string, hex: string) {
  document.documentElement.style.setProperty(`--${key}`, hex);
}
function applyDerived(key: string, pct: number) {
  document.documentElement.style.setProperty(
    `--${key}`,
    `color-mix(in oklch, var(--color_text) ${pct}%, transparent)`
  );
}

export function ColorTuner() {
  const players = useMemo(() => generatePlayers(24), []);
  const messages = useMemo(() => generateMessages(players), [players]);
  const posts = useMemo(() => generatePosts(players), [players]);
  const submitterUids = useMemo(() => new Set(players.slice(0, 10).map((p) => p.uid)), [players]);
  const [likesByPost, setLikesByPost] = useState<LikesByPost>(new Map());
  useEffect(() => {
    const map: LikesByPost = new Map();
    posts.filter((p) => p.parentId === null).forEach((p, i) => map.set(p.id, new Set(i === 0 ? [ME.uid] : [])));
    setLikesByPost(map);
  }, [posts]);

  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    ALL_FIELDS.forEach((f) => {
      initial[f.key] = f.kind === "solid" ? f.defaultValue : f.defaultPct;
    });
    return initial;
  });

  function handleSolidChange(key: string, hex: string) {
    setValues((prev) => ({ ...prev, [key]: hex }));
    applySolid(key, hex);
  }
  function handleDerivedChange(key: string, pct: number) {
    setValues((prev) => ({ ...prev, [key]: pct }));
    applyDerived(key, pct);
  }

  function resetAll() {
    ALL_FIELDS.forEach((f) => {
      if (f.kind === "solid") {
        applySolid(f.key, f.defaultValue);
      } else {
        applyDerived(f.key, f.defaultPct);
      }
      document.documentElement.style.removeProperty(`--${f.key}`);
    });
    const initial: Record<string, string | number> = {};
    ALL_FIELDS.forEach((f) => {
      initial[f.key] = f.kind === "solid" ? f.defaultValue : f.defaultPct;
    });
    setValues(initial);
  }

  function copyAsCss() {
    const lines = [":root {"];
    ALL_FIELDS.forEach((f) => {
      const v =
        f.kind === "solid"
          ? (values[f.key] as string)
          : `color-mix(in oklch, var(--color_text) ${values[f.key]}%, transparent)`;
      lines.push(`  --${f.key}: ${v};`);
    });
    lines.push("}");
    navigator.clipboard.writeText(lines.join("\n"));
  }

  // Cleanup on unmount — leaving inline overrides on <html> would bleed
  // into every other page/tuner visited afterward in the same session.
  useEffect(() => {
    return () => {
      ALL_FIELDS.forEach((f) => document.documentElement.style.removeProperty(`--${f.key}`));
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 bg-background text-color_text">
      <div className="no-scrollbar hidden w-[300px] shrink-0 overflow-y-auto border-r border-color_border1 bg-card p-4 md:block">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-base font-bold text-color_text">Renk Tuner</h1>
            <p className="mt-1 text-xs text-color_textsecondary">
              Ana Sayfa'nın (giriş yapılmış, başlamadı) kendisi — kopyası değil. Değişiklikler anında
              uygulanır, sadece bu tarayıcı sekmesinde.
            </p>
          </div>
        </div>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={copyAsCss}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-color_border1 bg-background px-2 py-1.5 text-xs text-color_text hover:border-color_accent"
          >
            <Copy className="size-3" aria-hidden />
            CSS kopyala
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-color_border1 bg-background px-2 py-1.5 text-xs text-color_text hover:border-color_accent"
          >
            <RotateCcw className="size-3" aria-hidden />
            Sıfırla
          </button>
        </div>

        {GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <h2 className="mb-2 font-mono text-[0.62rem] tracking-wide text-color_textsecondary uppercase">
              {group.title}
            </h2>
            {group.fields.map((f) => (
              <div key={f.key} className="mb-3">
                <label className="mb-1 flex items-baseline justify-between text-xs">
                  <span>{f.label}</span>
                  <span className="font-mono text-[0.64rem] text-color_textsecondary tnum">
                    {f.kind === "solid" ? String(values[f.key]).toUpperCase() : `${values[f.key]}%`}
                  </span>
                </label>
                {f.kind === "solid" ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={values[f.key] as string}
                      onChange={(e) => handleSolidChange(f.key, e.target.value)}
                      className="size-7 shrink-0 cursor-pointer rounded border border-color_border1 bg-transparent p-0"
                      aria-label={f.label}
                    />
                    <input
                      type="text"
                      value={values[f.key] as string}
                      onChange={(e) => handleSolidChange(f.key, e.target.value)}
                      className="min-w-0 flex-1 rounded border border-color_border1 bg-background px-1.5 py-1 font-mono text-[0.68rem] text-color_text"
                    />
                  </div>
                ) : (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values[f.key] as number}
                    onChange={(e) => handleDerivedChange(f.key, Number(e.target.value))}
                    className="w-full accent-color_accent"
                    aria-label={f.label}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <HomeLandingLoggedIn
          me={ME}
          players={players}
          submitterUids={submitterUids}
          messages={messages}
          onLoadOlderMessages={() => {}}
          loadingOlderMessages={false}
          hasMoreOlderMessages={false}
          onlineCount={5}
          typingUids={[]}
          posts={posts}
          likesByPost={likesByPost}
          onToggleLike={(postId) => {
            setLikesByPost((prev) => {
              const next = new Map(prev);
              const uids = new Set(next.get(postId) ?? []);
              if (uids.has(ME.uid)) uids.delete(ME.uid);
              else uids.add(ME.uid);
              next.set(postId, uids);
              return next;
            });
          }}
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
