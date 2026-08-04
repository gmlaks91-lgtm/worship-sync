/** 2026 하계 수련회 시간표 노출 기간 (KST 달력일) */
export const RETREAT_SCHEDULE_START_YMD = "2026-08-06";
export const RETREAT_SCHEDULE_END_YMD = "2026-08-08";
export const RETREAT_SCHEDULE_IMAGE_SRC = "/retreat/summer-camp-schedule-2026.png";
export const RETREAT_SCHEDULE_SESSION_KEY = "ahava:retreat-schedule-dismissed-session";

export function isRetreatScheduleActive(ymd: string): boolean {
  return ymd >= RETREAT_SCHEDULE_START_YMD && ymd <= RETREAT_SCHEDULE_END_YMD;
}
