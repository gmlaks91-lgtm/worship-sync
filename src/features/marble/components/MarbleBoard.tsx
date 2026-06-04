"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flag, UserRound } from "lucide-react";

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
import { cn } from "@/lib/utils";

type TokenLayout = {
  team: BlueMarbleRow;
  color: string;
  left: number; // 보드 대비 %
  top: number; // 보드 대비 %
  offsetX: number; // 같은 칸 내 분산 (px)
  offsetY: number;
};

export function MarbleBoard({ teams }: { teams: BlueMarbleRow[] }) {
  // 같은 칸을 공유하는 목장들이 겹치지 않도록 분산 오프셋을 계산
  const tokens = useMemo<TokenLayout[]>(() => {
    const byCell = new Map<number, BlueMarbleRow[]>();
    teams.forEach((team) => {
      const pos = normalizePosition(team.position);
      const list = byCell.get(pos) ?? [];
      list.push(team);
      byCell.set(pos, list);
    });

    // 색상은 팀 순서로 고정 (점수 변동에 흔들리지 않도록 id 기준 정렬 인덱스 사용)
    const colorOrder = [...teams]
      .sort((a, b) => a.id.localeCompare(b.id))
      .reduce<Record<string, number>>((acc, team, i) => {
        acc[team.id] = i;
        return acc;
      }, {});

    const result: TokenLayout[] = [];
    byCell.forEach((cellTeams, pos) => {
      const { left, top } = cellCenterPercent(pos);
      const count = cellTeams.length;
      cellTeams.forEach((team, k) => {
        // 한 칸 안에서 2열로 배치
        const colIdx = k % 2;
        const rowIdx = Math.floor(k / 2);
        const rows = Math.ceil(count / 2);
        const offsetX = count > 1 ? (colIdx - 0.5) * 18 : 0;
        const offsetY = rows > 1 ? (rowIdx - (rows - 1) / 2) * 18 : 0;
        result.push({
          team,
          color: tokenColorForIndex(colorOrder[team.id] ?? 0),
          left,
          top,
          offsetX,
          offsetY,
        });
      });
    });
    return result;
  }, [teams]);

  const cells = useMemo(() => buildCells(), []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none">
      {/* 보드 둘레(테두리) 칸 */}
      <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          if (!cell.perimeter) {
            return <div key={cell.key} aria-hidden className="rounded-md" />;
          }
          return (
            <div
              key={cell.key}
              className={cn(
                "relative flex items-start justify-end rounded-lg border bg-white p-1 text-[10px] font-semibold shadow-sm",
                cell.index === 0
                  ? "border-rose-300 bg-rose-50 text-rose-500"
                  : "border-slate-200 text-slate-300",
              )}
            >
              {cell.index === 0 ? (
                <Flag className="absolute left-1 top-1 h-3 w-3 text-rose-400" />
              ) : null}
              <span>{cell.index}</span>
            </div>
          );
        })}
      </div>

      {/* 가운데 빈 공간 패널 */}
      <div
        className="pointer-events-none absolute flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50/80 to-rose-50/70 text-center"
        style={{ inset: `${100 / MARBLE_GRID_SIDE}%` }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400">Blue Marble</p>
        <p className="mt-1 text-lg font-bold text-slate-700">목장 대항전</p>
        <p className="mt-1 px-4 text-[11px] leading-relaxed text-slate-400">
          점수를 모아 한 바퀴를 완주하세요!
        </p>
      </div>

      {/* 목자 얼굴 토큰 (position 변경 시 left/top이 애니메이션으로 이동) */}
      {tokens.map((token) => (
        <motion.div
          key={token.team.id}
          className="absolute z-10"
          initial={false}
          animate={{ left: `${token.left}%`, top: `${token.top}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.8 }}
        >
          {/* 칸 중심 정렬(-50%) + 같은 칸 내 분산 오프셋은 정적 transform으로 처리해
              framer-motion의 left/top 애니메이션과 transform 충돌을 피한다 */}
          <div
            style={{
              transform: `translate(calc(-50% + ${token.offsetX}px), calc(-50% + ${token.offsetY}px))`,
            }}
          >
            <MarbleToken color={token.color} team={token.team} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MarbleToken({ color, team }: { color: string; team: BlueMarbleRow }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-2 ring-white shadow-md sm:h-9 sm:w-9"
        style={{ backgroundColor: color }}
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
          <UserRound className="h-4 w-4 text-white/90" />
        )}
      </span>
      <span className="max-w-[60px] truncate rounded-full bg-white/90 px-1.5 text-[9px] font-medium text-slate-600 shadow-sm">
        {team.team_name.replace(/목장$/, "")}
      </span>
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
