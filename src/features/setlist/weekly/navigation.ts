import {
  addDaysYmdKst,
  isYmdKst,
  nextOrSameSundayYmdKst,
  sundayOfKstWeekContaining,
  todayYmdKst,
} from "@/lib/date-kst";

import type { WeekSundayYmd } from "./types";

export const WEEKLY_PREP_SEARCH_PARAM = "sunday" as const;

export function resolveDashboardWeekSunday(rawSunday: string | undefined): WeekSundayYmd {
  const today = todayYmdKst();
  const defaultSunday = nextOrSameSundayYmdKst(today);
  const candidate = isYmdKst(rawSunday) ? rawSunday : defaultSunday;
  return sundayOfKstWeekContaining(candidate);
}

export function weeklyDashboardHref(weekSundayYmd: WeekSundayYmd): string {
  return `/?${WEEKLY_PREP_SEARCH_PARAM}=${weekSundayYmd}`;
}

export function shiftWeekSundayYmd(weekSundayYmd: WeekSundayYmd, deltaWeeks: number): WeekSundayYmd {
  return addDaysYmdKst(weekSundayYmd, deltaWeeks * 7);
}
