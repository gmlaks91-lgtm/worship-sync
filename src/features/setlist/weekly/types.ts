import type { PrepSetlistRow } from "@/features/setlist/queries/getSetlists";

/** KST 주간 송리스트 기준: 해당 주를 나타내는 일요일 `YYYY-MM-DD`. */
export type WeekSundayYmd = string;

import type { PrepSetlistWithSheets } from "@/features/setlist/types";

export type WeeklyPrepSetlistLoad = {
  setlist: PrepSetlistWithSheets | null;
  error: string | null;
};
