import { addDaysYmdKst, kstWeekdaySun0, parseKstYmdAtNoon } from "@/lib/date-kst";

/** 해당 달에서 일요일 시작 주차 (1-based). `weekSundayYmd`는 반드시 일요일. (레거시·테스트용으로 유지) */
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

/** 해당 주의 주일(일요일) 한 줄 표기 (KST). 예: `5월 17일` */
export function weekSundayLabelKst(weekSundayYmd: string): string {
  const d = parseKstYmdAtNoon(weekSundayYmd);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** 주간 송리스트 상단에 표시하는 주일 한 줄 (KST). 예: `5월 17일` */
export function weekSetlistHeadingKst(weekSundayYmd: string): string {
  return weekSundayLabelKst(weekSundayYmd);
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
