import "server-only";

import { createClient } from "@/utils/supabase/server";

export type PointLogRow = {
  id: string;
  event_type: string;
  points: number;
  occurred_on: string;
  created_at: string;
};

export async function getPointLogsPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isLoggedIn: false,
      points: 0,
      logs: [] as PointLogRow[],
      error: null as string | null,
    };
  }

  const [profileRes, logsRes] = await Promise.all([
    supabase.from("profiles").select("points").eq("id", user.id).maybeSingle(),
    supabase
      .from("point_logs")
      .select("id,event_type,points,occurred_on,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (profileRes.error) {
    return { isLoggedIn: true, points: 0, logs: [] as PointLogRow[], error: profileRes.error.message };
  }
  if (logsRes.error) {
    return {
      isLoggedIn: true,
      points: profileRes.data?.points ?? 0,
      logs: [] as PointLogRow[],
      error: logsRes.error.message,
    };
  }

  return {
    isLoggedIn: true,
    points: profileRes.data?.points ?? 0,
    logs: (logsRes.data ?? []) as PointLogRow[],
    error: null as string | null,
  };
}
