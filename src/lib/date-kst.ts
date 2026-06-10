/** 한국 날짜 기준 `YYYY-MM-DD` (송리스트 event_date 비교용). */
export function todayYmdKst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmdKst(s: string | undefined | null): s is string {
  return typeof s === "string" && YMD.test(s);
}

/** KST 달력의 해당 날짜·정오 시각(비교·연산용). */
export function parseKstYmdAtNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+09:00`);
}

export function toYmdKst(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function addDaysYmdKst(ymd: string, deltaDays: number): string {
  const t = parseKstYmdAtNoon(ymd).getTime() + deltaDays * 86400000;
  return toYmdKst(new Date(t));
}

/** 0 = 일요일 … 6 = 토요일 (KST 기준). */
export function kstWeekdaySun0(ymd: string): number {
  const d = parseKstYmdAtNoon(ymd);
  const short = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Seoul" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 0;
}

/** `fromYmd`가 속한 주의 일요일(당일이 일요일이면 그대로, 그 외에는 그 주의 일요일). */
export function sundayOfKstWeekContaining(fromYmd: string): string {
  const w = kstWeekdaySun0(fromYmd);
  return addDaysYmdKst(fromYmd, -w);
}

/** 오늘(KST)을 포함해 앞으로 가장 가까운 일요일 (오늘이 일요일이면 오늘). */
export function nextOrSameSundayYmdKst(fromYmd: string): string {
  const w = kstWeekdaySun0(fromYmd);
  const add = (7 - w) % 7;
  return addDaysYmdKst(fromYmd, add);
}

/** 일요일~토요일 주간의 토요일 날짜. */
export function saturdayOfWeekFromSundayYmd(sundayYmd: string): string {
  return addDaysYmdKst(sundayYmd, 6);
}
