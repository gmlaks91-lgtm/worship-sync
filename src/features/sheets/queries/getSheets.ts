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

export async function getLatestSheetForSong(
  songId: string,
): Promise<SheetSummary | null> {
  const map = await getLatestSheetsBySongIds([songId]);
  return map[songId] ?? null;
}

export type RecentSheetForDashboard = {
  id: string;
  song_id: string;
  song_title: string;
  image_urls: string[];
  created_at: string;
};

type SheetWithSongTitle = {
  id: string;
  song_id: string;
  image_urls: string[];
  created_at: string;
  songs: { title: string } | null;
};

/** 홈 대시보드용 — 최근 업로드 악보(곡 제목 포함) */
export async function getRecentSheetsForDashboard(
  limit: number,
): Promise<RecentSheetForDashboard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sheets")
    .select(
      `
      id,
      song_id,
      image_urls,
      created_at,
      songs ( title )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as SheetWithSongTitle[]).map((row) => ({
    id: row.id,
    song_id: row.song_id,
    song_title: row.songs?.title ?? "알 수 없는 곡",
    image_urls: row.image_urls ?? [],
    created_at: row.created_at,
  }));
}
