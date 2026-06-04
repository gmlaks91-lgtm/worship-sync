"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Star, UserRound } from "lucide-react";

import {
  MARBLE_GRID_SIDE,
  cellCenterPercent,
  indexForCell,
} from "@/features/marble/lib/board-layout";
import {
  isStarTile,
  medalEmojiForRank,
  missionForStarTile,
  positionFromScore,
  STAR_TILES,
  tokenColorForIndex,
  type BlueMarbleRow,
} from "@/features/marble/types";
import { RemoteImage } from "@/components/ui/remote-image";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type TokenLayout = {
  team: BlueMarbleRow;
  color: string;
  left: number;
  top: number;
  offsetX: number;
  offsetY: number;
  floatDelay: number;
};

type StarArrival = {
  team: BlueMarbleRow;
  tileIndex: number;
  mission: string;
};

/** 보드 길 타일 테마 */
const TILE_THEMES = [
  { face: "from-emerald-200 to-emerald-50", edge: "border-emerald-400/70", text: "text-emerald-600" },
  { face: "from-sky-200 to-sky-50", edge: "border-sky-400/70", text: "text-sky-600" },
  { face: "from-amber-200 to-amber-50", edge: "border-amber-400/70", text: "text-amber-600" },
  { face: "from-rose-200 to-rose-50", edge: "border-rose-400/70", text: "text-rose-600" },
  { face: "from-violet-200 to-violet-50", edge: "border-violet-400/70", text: "text-violet-600" },
] as const;

const CORNER_INDICES = new Set([0, 6, 12, 18]);

export function MarbleBoard({ teams }: { teams: BlueMarbleRow[] }) {
  const [liveTeams, setLiveTeams] = useState<BlueMarbleRow[]>(teams);

  useEffect(() => {
    setLiveTeams(teams);
  }, [teams]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("blue_marble_board")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "blue_marble" },
        (payload) => {
          const updated = payload.new as BlueMarbleRow;
          if (!updated?.id) return;
          setLiveTeams((current) =>
            current.map((team) => (team.id === updated.id ? { ...team, ...updated } : team)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blue_marble" },
        (payload) => {
          const inserted = payload.new as BlueMarbleRow;
          if (!inserted?.id) return;
          setLiveTeams((current) =>
            current.some((team) => team.id === inserted.id) ? current : [...current, inserted],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const colorOrder = useMemo(
    () =>
      [...liveTeams]
        .sort((a, b) => a.id.localeCompare(b.id))
        .reduce<Record<string, number>>((acc, team, i) => {
          acc[team.id] = i;
          return acc;
        }, {}),
    [liveTeams],
  );

  const tokens = useMemo<TokenLayout[]>(() => {
    const byCell = new Map<number, BlueMarbleRow[]>();
    liveTeams.forEach((team) => {
      const pos = positionFromScore(team.score);
      const list = byCell.get(pos) ?? [];
      list.push(team);
      byCell.set(pos, list);
    });

    const result: TokenLayout[] = [];
    let order = 0;
    byCell.forEach((cellTeams, pos) => {
      const { left, top } = cellCenterPercent(pos);
      const count = cellTeams.length;
      cellTeams.forEach((team, k) => {
        const colIdx = k % 2;
        const rowIdx = Math.floor(k / 2);
        const rows = Math.ceil(count / 2);
        const offsetX = count > 1 ? (colIdx - 0.5) * 20 : 0;
        const offsetY = rows > 1 ? (rowIdx - (rows - 1) / 2) * 20 : 0;
        result.push({
          team,
          color: tokenColorForIndex(colorOrder[team.id] ?? 0),
          left,
          top,
          offsetX,
          offsetY,
          floatDelay: (order % 6) * 0.18,
        });
        order += 1;
      });
    });
    return result;
  }, [liveTeams, colorOrder]);

  const ranking = useMemo(
    () =>
      [...liveTeams]
        .sort((a, b) => b.score - a.score || a.team_name.localeCompare(b.team_name))
        .slice(0, 3),
    [liveTeams],
  );

  const starArrivals = useMemo<StarArrival[]>(() => {
    const arrivals: StarArrival[] = [];
    liveTeams.forEach((team) => {
      const tileIndex = positionFromScore(team.score);
      if (!isStarTile(tileIndex)) return;
      arrivals.push({
        team,
        tileIndex,
        mission: missionForStarTile(tileIndex),
      });
    });
    return arrivals;
  }, [liveTeams]);

  const cells = useMemo(() => buildCells(), []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px] select-none">
      <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          if (!cell.perimeter) {
            return <div key={cell.key} aria-hidden />;
          }
          return <BoardTile key={cell.key} index={cell.index} />;
        })}
      </div>

      {/* 중앙 캔버스: 미션 알림판(상) + 명예의 전당(하) */}
      <div
        className="pointer-events-none absolute flex flex-col justify-between overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-rose-50 via-amber-50 to-orange-100 px-3 py-3 shadow-[inset_0_2px_16px_rgba(255,255,255,0.6),0_8px_24px_rgba(251,146,60,0.25)]"
        style={{ inset: `${100 / MARBLE_GRID_SIDE}%` }}
      >
        <CenterMissionPanel arrivals={starArrivals} />
        <CenterHallOfFame ranking={ranking} />
      </div>

      {tokens.map((token) => (
        <motion.div
          key={token.team.id}
          className="absolute z-10"
          initial={false}
          animate={{ left: `${token.left}%`, top: `${token.top}%` }}
          transition={{ type: "spring", stiffness: 280, damping: 13, mass: 0.7 }}
        >
          <div
            style={{
              transform: `translate(calc(-50% + ${token.offsetX}px), calc(-50% + ${token.offsetY}px))`,
            }}
          >
            <MarbleToken color={token.color} team={token.team} floatDelay={token.floatDelay} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CenterMissionPanel({ arrivals }: { arrivals: StarArrival[] }) {
  if (arrivals.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white/70 px-3 py-2.5 text-center shadow-sm backdrop-blur-sm">
        <p className="text-[11px] font-bold text-amber-800">⭐ 미션 알림판</p>
        <p className="mt-1 text-[10px] leading-relaxed text-amber-700/90">
          다음 미션 칸을 향해 달려보세요!
        </p>
        <p className="mt-1 text-[9px] text-amber-600/70">
          별 칸: {STAR_TILES.join(" · ")}번
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-h-[46%] flex-col gap-1.5 overflow-y-auto">
      {arrivals.map(({ team, tileIndex, mission }) => (
        <div
          key={team.id}
          className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-50 px-3 py-2 shadow-sm"
        >
          <p className="text-[10px] font-bold leading-snug text-amber-900">
            🎉 [{team.team_name}] 별 칸({tileIndex}번) 도착!
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-amber-800">
            미션: {mission}
          </p>
        </div>
      ))}
    </div>
  );
}

function CenterHallOfFame({ ranking }: { ranking: BlueMarbleRow[] }) {
  if (ranking.length === 0) {
    return (
      <p className="text-center text-[10px] text-slate-500">아직 순위가 없어요</p>
    );
  }

  return (
    <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2 shadow-sm backdrop-blur-sm">
      <p className="mb-1.5 text-center text-[10px] font-bold text-slate-600">🏆 실시간 명예의 전당</p>
      <ol className="flex flex-col gap-1">
        {ranking.map((team, rank) => (
          <li
            key={team.id}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1 text-[11px] font-semibold",
              rank === 0 ? "bg-amber-100/90 text-amber-900" : "bg-slate-50/90 text-slate-700",
            )}
          >
            <span className="w-5 shrink-0 text-center text-sm">{medalEmojiForRank(rank)}</span>
            <span className="min-w-0 flex-1 truncate">{team.team_name}</span>
            <span className="shrink-0 tabular-nums text-sky-600">
              {team.score.toLocaleString()}점
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BoardTile({ index }: { index: number }) {
  const isStart = index === 0;
  const isCorner = CORNER_INDICES.has(index);
  const isMission = isStarTile(index);

  if (isStart) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-xl border-b-4 border-rose-500/80 bg-gradient-to-b from-rose-300 to-rose-100 shadow-[0_4px_0_0_rgba(0,0,0,0.12)]">
        <Flag className="h-4 w-4 text-rose-600" fill="currentColor" />
        <span className="text-[8px] font-black text-rose-700">출발</span>
      </div>
    );
  }

  if (isMission) {
    return (
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl border-b-4 border-amber-500/90 bg-gradient-to-b from-yellow-200 via-amber-100 to-amber-50 shadow-[0_4px_0_0_rgba(180,83,9,0.25),0_0_12px_rgba(251,191,36,0.45)]">
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-amber-300/40 to-transparent"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        >
          <Star className="h-5 w-5 text-amber-500 drop-shadow" fill="currentColor" />
        </motion.div>
        <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-amber-700/80">
          {index}
        </span>
      </div>
    );
  }

  const theme = TILE_THEMES[index % TILE_THEMES.length];

  return (
    <div
      className={cn(
        "relative flex items-start justify-end rounded-xl border-b-4 bg-gradient-to-b p-1 shadow-[0_4px_0_0_rgba(0,0,0,0.08)]",
        theme.face,
        theme.edge,
        isCorner && "ring-2 ring-white/70",
      )}
    >
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 shadow-inner" />
      <span className={cn("relative z-10 text-[9px] font-bold", theme.text)}>{index}</span>
    </div>
  );
}

function MarbleToken({
  color,
  team,
  floatDelay,
}: {
  color: string;
  team: BlueMarbleRow;
  floatDelay: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="flex flex-col items-center gap-1"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: floatDelay }}
      >
        <span
          className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] sm:h-11 sm:w-11"
          style={{ border: `3px solid ${color}` }}
          title={`${team.team_name} · ${team.score}점 · ${positionFromScore(team.score)}칸`}
        >
          {team.image_url ? (
            <RemoteImage
              src={team.image_url}
              alt={`${team.team_name} 목자`}
              fill
              variant="overlay"
              className="object-cover"
            />
          ) : (
            <UserRound className="h-5 w-5" style={{ color }} />
          )}
        </span>

        <span
          className="max-w-[72px] truncate rounded-full bg-white px-2 py-0.5 text-[9px] font-bold shadow-md sm:text-[10px]"
          style={{ color, border: `1.5px solid ${color}` }}
        >
          {team.team_name}
        </span>
      </motion.div>
    </div>
  );
}

type CellInfo = { key: string; perimeter: boolean; index: number };

function buildCells(): CellInfo[] {
  const cells: CellInfo[] = [];
  for (let row = 0; row < MARBLE_GRID_SIDE; row += 1) {
    for (let col = 0; col < MARBLE_GRID_SIDE; col += 1) {
      const index = indexForCell(row, col);
      cells.push({ key: `${row}-${col}`, perimeter: index >= 0, index });
    }
  }
  return cells;
}
