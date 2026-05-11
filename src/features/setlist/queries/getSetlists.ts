import "server-only";

import { saturdayOfWeekFromSundayYmd, todayYmdKst } from "@/lib/date-kst";
import type { TeamRoleCode } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

import { PREP_SETLIST_NESTED_SELECT } from "@/features/setlist/queries/setlist-select";

export type SetlistSongRow = {
  id: string;
  title: string;
  youtube_url: string | null;
  description: string | null;
  order_index: number;
};

export type SetlistLineupRow = {
  role_code: TeamRoleCode;
  member_id: string;
  member_name: string;
};

export type PrepSetlistRow = {
  id: string;
  title: string;
  event_date: string;
  status: "prep" | "confirmed";
  staff_notes: string | null;
  songs: SetlistSongRow[];
  lineup: SetlistLineupRow[];
};

export type GetSetlistsResult = {
  setlists: PrepSetlistRow[];
  error: string | null;
};

type SetlistQueryRow = {
  id: string;
  title: string;
  event_date: string;
  status: string;
  staff_notes: string | null;
  setlist_songs:
    | {
        order_index: number;
        songs: {
          id: string;
          title: string;
          youtube_url: string | null;
          description: string | null;
        } | null;
      }[]
    | null;
  setlist_lineups:
    | {
        role_code: TeamRoleCode;
        member_id: string;
        profiles: { username: string } | null;
      }[]
    | null;
};

export function mapSetlistQueryRows(rows: SetlistQueryRow[]): PrepSetlistRow[] {
  return rows.map((row) => {
    const links = row.setlist_songs ?? [];
    const songs: SetlistSongRow[] = links
      .filter((l) => l.songs)
      .map((l) => ({
        id: l.songs!.id,
        title: l.songs!.title,
        youtube_url: l.songs!.youtube_url,
        description: l.songs!.description,
        order_index: l.order_index,
      }))
      .sort((a, b) => a.order_index - b.order_index);

    const lineup = (row.setlist_lineups ?? [])
      .map((line) => ({
        role_code: line.role_code,
        member_id: line.member_id,
        member_name: line.profiles?.username ?? "알 수 없음",
      }))
      .sort((a, b) => a.role_code.localeCompare(b.role_code));

    return {
      id: row.id,
      title: row.title,
      event_date: row.event_date,
      status: row.status as PrepSetlistRow["status"],
      staff_notes: row.staff_notes ?? null,
      songs,
      lineup,
    };
  });
}

/** 가장 가까운 예정 prep 콘티 1건 (한국 날짜 기준 event_date ≥ 오늘, 가장 빠른 일정). */
export async function getNextPrepSetlist(): Promise<{
  setlist: PrepSetlistRow | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const today = todayYmdKst();

    const { data: setlistsRaw, error: setlistError } = await supabase
      .from("setlists")
      .select(PREP_SETLIST_NESTED_SELECT)
      .eq("status", "prep")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(1);

    if (setlistError) {
      return { setlist: null, error: setlistError.message };
    }

    const rows = (setlistsRaw ?? []) as SetlistQueryRow[];
    const mapped = mapSetlistQueryRows(rows);
    return { setlist: mapped[0] ?? null, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { setlist: null, error: message };
  }
}

/**
 * KST 기준 `weekSundayYmd`(일요일)~토요일 안에 `event_date`가 들어가는 prep 콘티 1건.
 * (해당 주에 여러 개면 가장 이른 event_date)
 */
export async function getPrepSetlistForWeekSunday(weekSundayYmd: string): Promise<{
  setlist: PrepSetlistRow | null;
  error: string | null;
}> {
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
    const mapped = mapSetlistQueryRows(rows);
    return { setlist: mapped[0] ?? null, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { setlist: null, error: message };
  }
}

export async function getSetlists(options?: { limit?: number }): Promise<GetSetlistsResult> {
  const limit = options?.limit ?? 10;
  try {
    const supabase = await createClient();

    const { data: setlistsRaw, error: setlistError } = await supabase
      .from("setlists")
      .select(PREP_SETLIST_NESTED_SELECT)
      .eq("status", "prep")
      .order("event_date", { ascending: false })
      .limit(limit);

    if (setlistError) {
      return { setlists: [], error: setlistError.message };
    }

    const rows = (setlistsRaw ?? []) as SetlistQueryRow[];
    return { setlists: mapSetlistQueryRows(rows), error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { setlists: [], error: message };
  }
}
