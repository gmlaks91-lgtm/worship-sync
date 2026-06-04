"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flag, Star, UserRound } from "lucide-react";

import {
  MARBLE_GRID_SIDE,
  cellCenterPercent,
  indexForCell,
} from "@/features/marble/lib/board-layout";
import {
  normalizePosition,
  tokenColorForIndex,
  type BlueMarbleRow,
} from "@/features/marble/types";
import { RemoteImage } from "@/components/ui/remote-image";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type TokenLayout = {
  team: BlueMarbleRow;
  color: string;
  left: number; // 보드 대비 %
  top: number; // 보드 대비 %
  offsetX: number; // 같은 칸 내 분산 (px)
  offsetY: number;
  floatDelay: number; // idle 애니메이션 시작 지연
};

/** 보드 길 타일 테마 (보드게임 느낌의 알록달록 순환 색) */
const TILE_THEMES = [
  { face: "from-emerald-200 to-emerald-50", edge: "border-emerald-400/70", text: "text-emerald-600" },
  { face: "from-sky-200 to-sky-50", edge: "border-sky-400/70", text: "text-sky-600" },
  { face: "from-amber-200 to-amber-50", edge: "border-amber-400/70", text: "text-amber-600" },
  { face: "from-rose-200 to-rose-50", edge: "border-rose-400/70", text: "text-rose-600" },
  { face: "from-violet-200 to-violet-50", edge: "border-violet-400/70", text: "text-violet-600" },
] as const;

const CORNER_INDICES = new Set([0, 6, 12, 18]);

export function MarbleBoard({ teams }: { teams: BlueMarbleRow[] }) {
  // 서버에서 받은 초기 데이터를 상태로 보관하고, Realtime UPDATE로 갱신한다.
  const [liveTeams, setLiveTeams] = useState<BlueMarbleRow[]>(teams);

  // 서버 재검증 등으로 props가 바뀌면 동기화
  useEffect(() => {
    setLiveTeams(teams);
  }, [teams]);

  // Supabase Realtime: blue_marble UPDATE/INSERT 이벤트를 구독 → 상태 갱신 →
  // position 변경이 framer-motion 애니메이션을 자동 트리거한다.
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

  // 색상은 점수 변동에 흔들리지 않도록 id 기준 정렬 인덱스로 고정
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

  // 같은 칸을 공유하는 목장들이 겹치지 않도록 분산 오프셋을 계산
  const tokens = useMemo<TokenLayout[]>(() => {
    const byCell = new Map<number, BlueMarbleRow[]>();
    liveTeams.forEach((team) => {
      const pos = normalizePosition(team.position);
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

  // 중앙 미니 리더보드: 점수 내림차순 상위 3
  const ranking = useMemo(
    () =>
      [...liveTeams]
        .sort((a, b) => b.score - a.score || a.team_name.localeCompare(b.team_name))
        .slice(0, 3),
    [liveTeams],
  );

  const cells = useMemo(() => buildCells(), []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px] select-none">
      {/* 보드 둘레(테두리) 3D 타일 */}
      <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          if (!cell.perimeter) {
            return <div key={cell.key} aria-hidden />;
          }
          return <BoardTile key={cell.key} index={cell.index} />;
        })}
      </div>

      {/* 가운데 빈 공간: 화려한 타이틀 + 미니 리더보드 */}
      <div
        className="pointer-events-none absolute flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/60 bg-gradient-to-br from-indigo-500/95 via-violet-500/95 to-fuchsia-500/95 px-3 text-center shadow-[inset_0_2px_12px_rgba(255,255,255,0.25),0_10px_30px_rgba(76,29,149,0.35)]"
        style={{ inset: `${100 / MARBLE_GRID_SIDE}%` }}
      >
        {/* 반짝이는 데코 */}
        <Star className="absolute left-3 top-3 h-4 w-4 text-amber-300/80" fill="currentColor" />
        <Star className="absolute bottom-4 right-4 h-3 w-3 text-amber-200/70" fill="currentColor" />

        <div className="leading-none">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-300 drop-shadow"
          >
            Worship Sync
          </p>
          <p
            className="bg-gradient-to-b from-white via-amber-100 to-amber-300 bg-clip-text text-2xl font-black tracking-tight text-transparent drop-shadow-[0_3px_0_rgba(91,33,182,0.6)] sm:text-3xl"
          >
            BLUE MARBLE
          </p>
        </div>

        {ranking.length > 0 ? (
          <div className="flex w-full max-w-[180px] flex-col gap-1">
            {ranking.map((team, i) => (
              <div
                key={team.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold backdrop-blur",
                  i === 0
                    ? "bg-amber-300/95 text-amber-900 shadow"
                    : "bg-white/15 text-white",
                )}
              >
                {i === 0 ? (
                  <Crown className="h-3.5 w-3.5 shrink-0 text-amber-700" fill="currentColor" />
                ) : (
                  <span className="w-3.5 shrink-0 text-center text-[10px] opacity-80">{i + 1}</span>
                )}
                <span className="min-w-0 flex-1 truncate text-left">{team.team_name}</span>
                <span className="shrink-0 tabular-nums">{team.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 목자 얼굴 토큰 (외부: 이동 / 내부: idle 둥둥) */}
      {tokens.map((token) => (
        <motion.div
          key={token.team.id}
          className="absolute z-10"
          initial={false}
          animate={{ left: `${token.left}%`, top: `${token.top}%` }}
          // 쫀득한 스프링: 탄성↑(stiffness), 저항↓(damping)으로 통통 튀는 이동감
          transition={{ type: "spring", stiffness: 280, damping: 13, mass: 0.7 }}
        >
          {/* 칸 중심 정렬(-50%) + 같은 칸 분산 오프셋 (정적 transform → left/top 애니메이션과 분리) */}
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

function BoardTile({ index }: { index: number }) {
  const theme = TILE_THEMES[index % TILE_THEMES.length];
  const isStart = index === 0;
  const isCorner = CORNER_INDICES.has(index);

  if (isStart) {
    return (
      <div className="relative flex flex-col items-center justify-center rounded-xl border-b-4 border-rose-500/80 bg-gradient-to-b from-rose-300 to-rose-100 shadow-[0_4px_0_0_rgba(0,0,0,0.12)]">
        <Flag className="h-4 w-4 text-rose-600" fill="currentColor" />
        <span className="text-[8px] font-black uppercase tracking-wider text-rose-700">Start</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-start justify-end rounded-xl border-b-4 bg-gradient-to-b p-1 shadow-[0_4px_0_0_rgba(0,0,0,0.08)]",
        theme.face,
        theme.edge,
        isCorner && "ring-2 ring-white/70",
      )}
    >
      {/* 길 패턴: 희미한 발자국 점 */}
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 shadow-inner" />
      {isCorner ? (
        <Star
          className="absolute left-1 top-1 h-2.5 w-2.5 text-white"
          fill="currentColor"
        />
      ) : null}
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
      {/* idle: 위아래로 둥둥 떠다니는 숨쉬기 애니메이션 */}
      <motion.div
        className="flex flex-col items-center gap-1"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: floatDelay }}
      >
        <span
          className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] sm:h-11 sm:w-11"
          style={{ border: `3px solid ${color}` }}
          title={`${team.team_name} · ${team.score}점`}
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

        {/* 목장 이름 배지 (고유 색 테두리) */}
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
