import { addDaysYmdKst, kstWeekdaySun0, parseKstYmdAtNoon } from "@/lib/date-kst";

/** 해당 달에서 일요일 시작 주차 (1-based). `weekSundayYmd`는 반드시 일요일. */
export function weekOfMonthSundayStartKst(weekSundayYmd: string): number {
  const [y, mo] = weekSundayYmd.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const firstOfMonth = `${y}-${pad(mo)}-01`;
  const w0 = kstWeekdaySun0(firstOfMonth);
  const firstSundayInMonth = addDaysYmdKst(firstOfMonth, (7 - w0) % 7);
  const tSun = parseKstYmdAtNoon(weekSundayYmd).getTime();
  const tFirst = parseKstYmdAtNoon(firstSundayInMonth).getTime();
  const diffDays = Math.round((tSun - tFirst) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

/** 예: `5월 2주차 송리스트` */
export function weekSetlistHeadingKst(weekSundayYmd: string): string {
  const d = parseKstYmdAtNoon(weekSundayYmd);
  const monthLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long" }).format(d);
  const wm = weekOfMonthSundayStartKst(weekSundayYmd);
  return `${monthLabel} ${wm}주차 송리스트`;
}

/** 보조 문구: 해당 주 일~토 (KST). */
export function weekRangeLineKst(weekSundayYmd: string): string {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const start = parseKstYmdAtNoon(weekSundayYmd);
  const end = parseKstYmdAtNoon(addDaysYmdKst(weekSundayYmd, 6));
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}
