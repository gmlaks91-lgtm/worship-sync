import "server-only";

import { createClient } from "@/utils/supabase/server";

export type SheetLibrarySongRow = {
  id: string;
  title: string;
  yearly_count?: number;
  last_played_at?: string | null;
};

export async function getSongsForSheetLibrary(): Promise<{
  songs: SheetLibrarySongRow[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("songs")
      .select("id, title")
      .order("title", { ascending: true });

    if (error) {
      return { songs: [], error: error.message };
    }

    return { songs: (data ?? []) as SheetLibrarySongRow[], error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { songs: [], error: message };
  }
}
