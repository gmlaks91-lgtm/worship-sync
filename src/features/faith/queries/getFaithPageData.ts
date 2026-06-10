import "server-only";

import type { FaithCheckType } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type FaithPageData = {
  userId: string | null;
  points: number;
  checksByDate: Record<string, FaithCheckType[]>;
  error: string | null;
};

export async function getFaithPageData(): Promise<FaithPageData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, points: 0, checksByDate: {}, error: null };

    const [profileRes, checksRes] = await Promise.all([
      supabase.from("profiles").select("points").eq("id", user.id).maybeSingle(),
      supabase
        .from("faith_checks")
        .select("check_date, check_type")
        .eq("user_id", user.id)
        .order("check_date", { ascending: false })
        .limit(200),
    ]);

    if (profileRes.error) return { userId: user.id, points: 0, checksByDate: {}, error: profileRes.error.message };
    if (checksRes.error) return { userId: user.id, points: profileRes.data?.points ?? 0, checksByDate: {}, error: checksRes.error.message };

    const checksByDate: Record<string, FaithCheckType[]> = {};
    for (const row of checksRes.data ?? []) {
      const list = checksByDate[row.check_date] ?? [];
      list.push(row.check_type as FaithCheckType);
      checksByDate[row.check_date] = list;
    }

    return {
      userId: user.id,
      points: profileRes.data?.points ?? 0,
      checksByDate,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { userId: null, points: 0, checksByDate: {}, error: message };
  }
}
