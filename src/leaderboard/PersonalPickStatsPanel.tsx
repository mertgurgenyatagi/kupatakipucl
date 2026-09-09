import { type ReactNode } from "react";
import { Flame, Users, Swords, Crown, ShieldCheck, ShieldAlert, ScrollText } from "lucide-react";
import { TEAM_BY_ID } from "../predictions/teams";
import { TeamCrest } from "./TeamCrest";
import { PersonalPickStats, AccuracySplit, ContrarianStats, SelfContradictionStats, TeamPickRecord } from "./personalPickStats";
import { PickOutcome } from "./personalPicks";
import { cn } from "@/lib/utils";

/**
 * The Matches page's Mert-only side panels — everything personalPickStats.ts
 * computes, laid out as densely as it'll fit. Deliberately not held to the
 * rest of the app's "golden rule of non-busyness": Mert's own ask ("as ugly
 * and busy as you want, I just want to see all types of shit") for a widget
 * only he ever sees.
 */

type Accent = "gold" | "green" | "remove" | "accent";

const ACCENT_TEXT: Record<Accent, string> = {
  gold: "text-color_gold",
  green: "text-color_green",
  remove: "text-color_remove",
  accent: "text-color_accent",
};

function Tile({
  icon,
  label,
  value,
  accent = "accent",
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  accent?: Accent;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-color_border1/50 bg-color_secondary/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[0.58rem] tracking-[0.12em] text-color_textsecondary uppercase">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl leading-none font-bold tnum", ACCENT_TEXT[accent])}>{value}</div>
      {sub && <div className="mt-1 font-mono text-[0.62rem] text-color_textsecondary">{sub}</div>}
    </div>
  );
}

function TeamTile({ label, record, accent, icon }: { label: string; record: TeamPickRecord | null; accent: Accent; icon: ReactNode }) {
  if (!record) return null;
  const team = TEAM_BY_ID[record.teamId];
  const rate = record.decided > 0 ? Math.round((record.correct / record.decided) * 100) : null;

  return (
    <div className="rounded-lg border border-color_border1/50 bg-color_secondary/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[0.58rem] tracking-[0.12em] text-color_textsecondary uppercase">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <TeamCrest teamId={record.teamId} className="size-6 shrink-0" />
        <span className="truncate font-display text-sm font-semibold text-color_text">{team?.name ?? record.teamId}</span>
      </div>
      <div className={cn("mt-1 font-mono text-[0.62rem]", ACCENT_TEXT[accent])}>
        {record.total}x bağladın{rate !== null ? ` · %${rate} isabet` : ""}
      </div>
    </div>
  );
}

const OUTCOME_LABEL: Record<PickOutcome, string> = { home: "EV", away: "DEP.", draw: "BERB." };

function OutcomeSplitRow({ byOutcome }: { byOutcome: PersonalPickStats["byOutcome"] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["home", "draw", "away"] as const).map((k) => {
        const split = byOutcome[k];
        const rate = split.decided > 0 ? Math.round((split.correct / split.decided) * 100) : null;
        return (
          <div key={k} className="rounded-lg border border-color_border1/50 bg-color_secondary/70 px-1.5 py-2 text-center">
            <div className="font-mono text-[0.55rem] tracking-[0.1em] text-color_textsecondary uppercase">
              {OUTCOME_LABEL[k]}
            </div>
            <div className="mt-1 font-mono text-base font-bold tnum text-color_text">{rate !== null ? `%${rate}` : "—"}</div>
            <div className="font-mono text-[0.55rem] text-color_textsecondary">{split.total}x</div>
          </div>
        );
      })}
    </div>
  );
}

function GrainTile({ label, accent, split, icon }: { label: string; accent: Accent; split: AccuracySplit; icon: ReactNode }) {
  return (
    <Tile
      icon={icon}
      label={label}
      value={split.accuracyPct !== null ? `%${split.accuracyPct}` : "—"}
      accent={accent}
      sub={`${split.decided} maç · ${split.correct} doğru`}
    />
  );
}

export function PersonalPickStatsPanel({
  side,
  stats,
  community,
  contrarian,
  selfContradiction,
  className,
}: {
  side: "left" | "right";
  stats: PersonalPickStats;
  community: AccuracySplit;
  contrarian: ContrarianStats;
  selfContradiction: SelfContradictionStats;
  className?: string;
}) {
  return (
    <div className={cn("flex w-64 shrink-0 flex-col gap-2.5", className)}>
      {side === "left" ? (
        <>
          <Tile
            icon={<Crown className="size-3" />}
            label="İsabet"
            value={stats.accuracyPct !== null ? `%${stats.accuracyPct}` : "—"}
            accent="gold"
            sub={`${stats.correct} doğru · ${stats.incorrect} yanlış · ${stats.pending} bekliyor`}
          />
          <Tile
            icon={<Flame className="size-3" />}
            label="Güncel Seri"
            value={stats.currentStreak ? stats.currentStreak.length : "—"}
            accent={stats.currentStreak?.kind === "correct" ? "green" : stats.currentStreak?.kind === "incorrect" ? "remove" : "accent"}
            sub={
              stats.currentStreak
                ? stats.currentStreak.kind === "correct"
                  ? "üst üste doğru"
                  : "üst üste yanlış"
                : "henüz maç bitmedi"
            }
          />
          <Tile icon={<Flame className="size-3" />} label="En İyi Seri" value={stats.bestCorrectStreak} accent="green" sub="üst üste doğru rekoru" />
          <OutcomeSplitRow byOutcome={stats.byOutcome} />
          <TeamTile
            label="En Çok Güvendiğin"
            record={stats.favoriteTeam}
            accent="gold"
            icon={<Crown className="size-3" />}
          />
          <TeamTile
            label="Hiç Yanıltmayan"
            record={stats.mostReliableTeam}
            accent="green"
            icon={<ShieldCheck className="size-3" />}
          />
          <TeamTile
            label="Seni Yanıltan"
            record={stats.leastReliableTeam}
            accent="remove"
            icon={<ShieldAlert className="size-3" />}
          />
        </>
      ) : (
        <>
          <Tile
            icon={<Users className="size-3" />}
            label="Kalabalık (aynı maçlar)"
            value={community.accuracyPct !== null ? `%${community.accuracyPct}` : "—"}
            sub="sıralamalardan çıkan ortalama isabet"
          />
          <GrainTile
            label="Kalabalıkla Aynı"
            accent="accent"
            icon={<Users className="size-3" />}
            split={contrarian.withGrain}
          />
          <GrainTile
            label="Kalabalığa Karşı"
            accent="gold"
            icon={<Swords className="size-3" />}
            split={contrarian.againstGrain}
          />
          <Tile
            icon={<ScrollText className="size-3" />}
            label="Kendi Sıralamana Ters"
            value={selfContradiction.total}
            accent="remove"
            sub={
              selfContradiction.total === 0
                ? "düşük sıraladığın takımı hiç seçmemişsin"
                : `düşük sıraladığın takımı seçtiğin maç${
                    selfContradiction.decided > 0 ? ` · %${selfContradiction.accuracyPct} isabet` : ""
                  }`
            }
          />
        </>
      )}
    </div>
  );
}
