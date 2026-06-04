import type { Database } from "@/types/database";

export type BlueMarbleRow = Database["public"]["Tables"]["blue_marble"]["Row"];

/** 보드판 한 바퀴 칸 수 (모노폴리 스타일 7x7 그리드 둘레 = 24칸) */
export const MARBLE_BOARD_SIZE = 24;

/** 이미지가 없는 목장에 사용할 기본 토큰 색상(목장 순서대로) */
export const MARBLE_TOKEN_COLORS = [
  "#f97316", // orange
  "#0ea5e9", // sky
  "#22c55e", // green
  "#ec4899", // pink
  "#a855f7", // purple
  "#eab308", // yellow
  "#ef4444", // red
] as const;

export function tokenColorForIndex(index: number): string {
  return MARBLE_TOKEN_COLORS[index % MARBLE_TOKEN_COLORS.length];
}

/** position 값을 0..23 범위로 정규화 */
export function normalizePosition(position: number): number {
  const size = MARBLE_BOARD_SIZE;
  return ((Math.round(position) % size) + size) % size;
}
