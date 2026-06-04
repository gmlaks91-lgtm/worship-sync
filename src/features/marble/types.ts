import type { Database } from "@/types/database";

export type BlueMarbleRow = Database["public"]["Tables"]["blue_marble"]["Row"];

/** 보드판 한 바퀴 칸 수 (모노폴리 스타일 7x7 그리드 둘레 = 24칸) */
export const MARBLE_BOARD_SIZE = 24;

/** 50점마다 1칸 이동 */
export const MARBLE_POINTS_PER_TILE = 50;

/** 모서리(0,6,12,18)를 제외한 미션(별) 타일 칸 번호 */
export const STAR_TILES = [4, 10, 16, 22] as const;

/** 별 칸 도착 시 표시할 미션 문구 (STAR_TILES 순서와 1:1 매칭) */
export const MARBLE_MISSIONS = [
  "다 함께 모여 단체 셀카 찍기!",
  "옆 목장과 하이파이브 퀸즈 교환하기!",
  "오늘의 QT 한 구절을 크게 외치기!",
  "목장원 전원 일어나 30초 치어리더 하기!",
] as const;

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"] as const;

export function medalEmojiForRank(rank: number): string {
  return MEDAL_EMOJIS[rank] ?? `${rank + 1}위`;
}

/** 누적 총점 → 보드 칸 위치 (0~23) */
export function positionFromScore(score: number): number {
  const safe = Math.max(0, Math.floor(score));
  return Math.floor(safe / MARBLE_POINTS_PER_TILE) % MARBLE_BOARD_SIZE;
}

/** 이번 주 추가 점수 → 예상 추가 이동 칸 수 */
export function pendingMoveFromScore(pendingScore: number): number {
  if (!Number.isFinite(pendingScore)) return 0;
  return Math.floor(pendingScore / MARBLE_POINTS_PER_TILE);
}

export function isStarTile(index: number): boolean {
  return (STAR_TILES as readonly number[]).includes(index);
}

export function missionForStarTile(tileIndex: number): string {
  const idx = (STAR_TILES as readonly number[]).indexOf(tileIndex);
  if (idx < 0) return MARBLE_MISSIONS[0];
  return MARBLE_MISSIONS[idx] ?? MARBLE_MISSIONS[0];
}

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
