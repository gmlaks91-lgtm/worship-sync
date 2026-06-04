"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flag, UserRound } from "lucide-react";

import {
  MARBLE_GRID_SIDE,
  cellCenterPercent,
  indexForCell,
} from "@/features/marble/lib/board-layout";
import {
  isMissionTile,
  medalEmojiForRank,
  missionsByTile,
  positionFromScore,
  tokenColorForIndex,
  type BlueMarbleMissionRow,
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

const TILE_THEMES = [
  { face: "from-emerald-200 to-emerald-50", edge: "border-emerald-400/70", text: "text-emerald-600" },
  { face: "from-sky-200 to-sky-50", edge: "border-sky-400/70", text: "text-sky-600" },
  { face: "from-amber-200 to-amber-50", edge: "border-amber-400/70", text: "text-amber-600" },
  { face: "from-rose-200 to-rose-50", edge: "border-rose-400/70", text: "text-rose-600" },
  { face: "from-violet-200 to-violet-50", edge: "border-violet-400/70", text: "text-violet-600" },
] as const;

const CORNER_INDICES = new Set([0, 6, 12, 18]);

export function MarbleBoard({
  teams,
  missions: initialMissions,
}: {
  teams: BlueMarbleRow[];
  missions: BlueMarbleMissionRow[];
}) {
  const [liveTeams, setLiveTeams] = useState<BlueMarbleRow[]>(teams);
  const [liveMissions, setLiveMissions] = useState<BlueMarbleMissionRow[]>(initialMissions);

  useEffect(() => {
    setLiveTeams(teams);
  }, [teams]);

  useEffect(() => {
    setLiveMissions(initialMissions);
  }, [initialMissions]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blue_marble_missions" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { tile_index?: number };
            if (old.tile_index === undefined) return;
            setLiveMissions((current) => current.filter((m) => m.tile_index !== old.tile_index));
            return;
          }
          const row = payload.new as BlueMarbleMissionRow;
          if (!row?.tile_index) return;
          setLiveMissions((current) => {
            const rest = current.filter((m) => m.tile_index !== row.tile_index);
            return [...rest, row].sort((a, b) => a.tile_index - b.tile_index);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const missionMap = useMemo(() => missionsByTile(liveMissions), [liveMissions]);

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
      const mission = missionMap.get(tileIndex);
      if (!mission) return;
      arrivals.push({ team, tileIndex, mission });
    });
    return arrivals;
  }, [liveTeams, missionMap]);

  const cells = useMemo(() => buildCells(), []);

  const hasStarArrival = starArrivals.length > 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px] select-none">
      <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          if (!cell.perimeter) {
            return <div key={cell.key} aria-hidden />;
          }
          return (
            <BoardTile
              key={cell.key}
              index={cell.index}
              isMission={isMissionTile(cell.index, liveMissions)}
            />
          );
        })}
      </div>

      {/* 중앙 전광판: 별 칸 도착 시 미션만 / 없으면 명예의 전당만 */}
      <div
        className={cn(
          "pointer-events-none absolute flex flex-col overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-rose-50 via-amber-50 to-orange-100 px-3 py-3 shadow-[inset_0_2px_16px_rgba(255,255,255,0.6),0_8px_24px_rgba(251,146,60,0.25)]",
          hasStarArrival ? "justify-start gap-2" : "justify-center",
        )}
        style={{ inset: `${100 / MARBLE_GRID_SIDE}%` }}
      >
        {hasStarArrival ? (
          <CenterMissionAlert arrivals={starArrivals} />
        ) : (
          <CenterHallOfFame ranking={ranking} expanded />
        )}
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

function CenterMissionAlert({ arrivals }: { arrivals: StarArrival[] }) {
  return (
    <div className="flex max-h-full flex-col gap-2 overflow-y-auto">
      {arrivals.map(({ team, mission }) => (
        <div
          key={team.id}
          className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-yellow-50 px-3 py-3 shadow-md"
        >
          <p className="text-[11px] font-black leading-snug text-amber-900 sm:text-xs">
            🎉 [{team.team_name}] 미션 도착!
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-amber-800 sm:text-xs">
            : {mission}
          </p>
        </div>
      ))}
    </div>
  );
}

function CenterHallOfFame({
  ranking,
  expanded = false,
}: {
  ranking: BlueMarbleRow[];
  expanded?: boolean;
}) {
  if (ranking.length === 0) {
    return (
      <p className="text-center text-[11px] text-slate-500">아직 순위가 없어요</p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/80 bg-white/80 shadow-sm backdrop-blur-sm",
        expanded ? "w-full px-4 py-4" : "px-3 py-2",
      )}
    >
      <p className={cn("mb-2 text-center font-bold text-slate-600", expanded ? "text-sm" : "text-[10px]")}>
        🏆 실시간 명예의 전당
      </p>
      <ol className="flex flex-col gap-1.5">
        {ranking.map((team, rank) => (
          <li
            key={team.id}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 font-semibold",
              expanded ? "text-sm" : "text-[11px]",
              rank === 0 ? "bg-amber-100/90 text-amber-900" : "bg-slate-50/90 text-slate-700",
            )}
          >
            <span className="w-6 shrink-0 text-center text-base">{medalEmojiForRank(rank)}</span>
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

function BoardTile({ index, isMission }: { index: number; isMission: boolean }) {
  const isStart = index === 0;
  const isCorner = CORNER_INDICES.has(index);

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
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl border-b-4 border-amber-500/90 bg-gradient-to-b from-yellow-200 via-amber-100 to-amber-50 shadow-[0_4px_0_0_rgba(180,83,9,0.25),0_0_14px_rgba(251,191,36,0.55)]">
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-amber-300/50 to-transparent"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        />
        <motion.span
          className="text-xl drop-shadow-md"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          ⭐
        </motion.span>
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
