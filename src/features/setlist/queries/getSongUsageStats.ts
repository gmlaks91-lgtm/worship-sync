import "server-only";

import { createClient } from "@/utils/supabase/server";

export type SongUsageStat = {
  song_id: string;
  yearly_count: number;
  last_played_at: string | null;
};

export async function getSongUsageStats(songIds: string[]) {
  if (songIds.length === 0) return {} as Record<string, SongUsageStat>;
  const supabase = await createClient();
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const { data, error } = await supabase
    .from("setlist_songs")
    .select("song_id, setlists!inner(event_date)")
    .in("song_id", songIds);

  if (error || !data) return {} as Record<string, SongUsageStat>;

  const map: Record<string, SongUsageStat> = {};
  for (const row of data as Array<{ song_id: string; setlists: { event_date: string } | null }>) {
    const d = row.setlists?.event_date ?? null;
    const current = map[row.song_id] ?? { song_id: row.song_id, yearly_count: 0, last_played_at: null };
    if (d && d >= yearStart) current.yearly_count += 1;
    if (d && (!current.last_played_at || d > current.last_played_at)) current.last_played_at = d;
    map[row.song_id] = current;
  }
  return map;
}

export async function getRecentSongWarningByVideoId() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("setlist_songs")
    .select("songs!inner(youtube_url), setlists!inner(event_date)")
    .order("setlists(event_date)", { ascending: false })
    .limit(300);
  if (error || !data) return {} as Record<string, number>;

  const now = new Date();
  const map: Record<string, number> = {};
  for (const row of data as Array<{ songs: { youtube_url: string | null } | null; setlists: { event_date: string } | null }>) {
    const url = row.songs?.youtube_url;
    const date = row.setlists?.event_date;
    if (!url || !date) continue;
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) ?? url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    const vid = m?.[1];
    if (!vid) continue;
    const diffDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.max(0, Math.floor(diffDays / 7));
    if (weeks <= 3 && (map[vid] === undefined || weeks < map[vid])) map[vid] = weeks;
  }
  return map;
}
