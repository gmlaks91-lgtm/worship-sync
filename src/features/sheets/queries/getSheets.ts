import "server-only";

import type { SheetSummary } from "@/features/sheets/types";
import { createClient } from "@/utils/supabase/server";

/**
 * 곡별 최신 악보 1건(created_at 기준)을 맵으로 반환합니다.
 */
export async function getLatestSheetsBySongIds(
  songIds: string[],
): Promise<Record<string, SheetSummary>> {
  if (songIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sheets")
    .select("id, song_id, image_urls, memo, created_at")
    .in("song_id", songIds)
    .order("created_at", { ascending: false });

  if (error || !data) return {};

  const map: Record<string, SheetSummary> = {};
  for (const row of data) {
    if (map[row.song_id]) continue;
    map[row.song_id] = {
      id: row.id,
      song_id: row.song_id,
      image_urls: row.image_urls ?? [],
      memo: row.memo,
      created_at: row.created_at,
    };
  }
  return map;
}
