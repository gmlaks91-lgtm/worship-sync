import "server-only";

import { saturdayOfWeekFromSundayYmd } from "@/lib/date-kst";
import { PREP_SETLIST_NESTED_SELECT } from "@/features/setlist/queries/setlist-select";
import {
  mapSetlistQueryRows,
  type SetlistQueryRow,
} from "@/features/setlist/queries/getSetlists";
import { getLatestSheetsBySongIds } from "@/features/sheets/queries/getSheets";
import { createClient } from "@/utils/supabase/server";

import type { PrepSetlistWithSheets } from "@/features/setlist/types";
import type { WeeklyPrepSetlistLoad, WeekSundayYmd } from "./types";

/**
 * KST 기준 `weekSundayYmd`(일)~토 사이 `event_date`의 송리스트 1건.
 * 같은 주에 여러 건이면 가장 이른 event_date.
 */
export async function fetchWeeklyPrepSetlist(weekSundayYmd: WeekSundayYmd): Promise<WeeklyPrepSetlistLoad> {
  try {
    const supabase = await createClient();
    const weekEnd = saturdayOfWeekFromSundayYmd(weekSundayYmd);

    const { data: setlistsRaw, error: setlistError } = await supabase
      .from("setlists")
      .select(PREP_SETLIST_NESTED_SELECT)
      .eq("status", "prep")
      .gte("event_date", weekSundayYmd)
      .lte("event_date", weekEnd)
      .order("event_date", { ascending: true })
      .limit(1);

    if (setlistError) {
      return { setlist: null, error: setlistError.message };
    }

    const rows = (setlistsRaw ?? []) as SetlistQueryRow[];
    const setlist = mapSetlistQueryRows(rows)[0] ?? null;

    if (!setlist) {
      return { setlist: null, error: null };
    }

    const sheetMap = await getLatestSheetsBySongIds(
      setlist.songs.map((song) => song.id),
    );

    const setlistWithSheets: PrepSetlistWithSheets = {
      ...setlist,
      songs: setlist.songs.map((song) => ({
        ...song,
        sheet: sheetMap[song.id] ?? null,
      })),
    };

    return { setlist: setlistWithSheets, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { setlist: null, error: message };
  }
}
