import type { Database } from "@/types/database";

export type BlueMarbleRow = Database["public"]["Tables"]["blue_marble"]["Row"];
export type BlueMarbleMissionRow = Database["public"]["Tables"]["blue_marble_missions"]["Row"];

/** 보드판 한 바퀴 칸 수 (모노폴리 스타일 7x7 그리드 둘레 = 24칸) */
export const MARBLE_BOARD_SIZE = 24;

/** 50점마다 1칸 이동 */
export const MARBLE_POINTS_PER_TILE = 50;

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

/** DB 미션 목록 → tile_index 빠른 조회용 Map */
export function missionsByTile(missions: BlueMarbleMissionRow[]): Map<number, string> {
  return new Map(missions.map((m) => [m.tile_index, m.mission_text]));
}

export function isMissionTile(tileIndex: number, missions: BlueMarbleMissionRow[]): boolean {
  return missions.some((m) => m.tile_index === tileIndex);
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
