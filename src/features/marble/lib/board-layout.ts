import { MARBLE_BOARD_SIZE, normalizePosition } from "@/features/marble/types";

/** 7x7 그리드 한 변의 칸 수 */
export const MARBLE_GRID_SIDE = 7;

export type Cell = { row: number; col: number };

/**
 * 둘레 인덱스(0~23)를 7x7 그리드의 (row, col)로 변환한다. (시계 방향)
 *  - 0~6  : 윗변 (row 0, col 0→6)
 *  - 7~12 : 오른쪽 변 (col 6, row 1→6)
 *  - 13~18: 아랫변 (row 6, col 5→0)
 *  - 19~23: 왼쪽 변 (col 0, row 5→1)
 */
export function cellForIndex(index: number): Cell {
  const n = normalizePosition(index);
  const last = MARBLE_GRID_SIDE - 1; // 6

  if (n <= last) return { row: 0, col: n }; // 0~6
  if (n <= last * 2) return { row: n - last, col: last }; // 7~12
  if (n <= last * 3) return { row: last, col: last - (n - last * 2) }; // 13~18
  return { row: last - (n - last * 3), col: 0 }; // 19~23
}

/** 그리드 좌표가 보드 둘레(테두리)에 속하는지 */
export function isPerimeter(row: number, col: number): boolean {
  const last = MARBLE_GRID_SIDE - 1;
  return row === 0 || row === last || col === 0 || col === last;
}

/** (row, col) → 둘레 인덱스(0~23). 둘레가 아니면 -1 */
export function indexForCell(row: number, col: number): number {
  for (let i = 0; i < MARBLE_BOARD_SIZE; i += 1) {
    const cell = cellForIndex(i);
    if (cell.row === row && cell.col === col) return i;
  }
  return -1;
}

/** 칸 중심의 보드 대비 백분율 좌표 (translate(-50%,-50%) 기준) */
export function cellCenterPercent(index: number): { left: number; top: number } {
  const { row, col } = cellForIndex(index);
  const unit = 100 / MARBLE_GRID_SIDE;
  return {
    left: (col + 0.5) * unit,
    top: (row + 0.5) * unit,
  };
}
