export const POINTS_UPDATED_EVENT = "worship-sync:points-updated";

export type PointsUpdatedDetail = { points: number };

/** 클라이언트 전역 포인트 표시 즉시 동기화 */
export function notifyPointsUpdated(points: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PointsUpdatedDetail>(POINTS_UPDATED_EVENT, { detail: { points } }),
  );
}
