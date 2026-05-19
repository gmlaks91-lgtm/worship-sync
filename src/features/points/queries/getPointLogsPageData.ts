import "server-only";

import { unstable_noStore } from "next/cache";

import { getFreshUserPoints } from "@/features/points/queries/getFreshUserPoints";
import { createClient } from "@/utils/supabase/server";

export type PointLogRow = {
  id: string;
  event_type: string;
  points: number;
  occurred_on: string;
  created_at: string;
};

function getKstMonthStartIsoDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function getPointLogsPageData() {
  unstable_noStore();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isLoggedIn: false,
      points: 0,
      currentPoints: 0,
      monthlyEarned: 0,
      logs: [] as PointLogRow[],
      error: null as string | null,
    };
  }

  const monthStart = getKstMonthStartIsoDate();

  const [freshPoints, logsRes] = await Promise.all([
    getFreshUserPoints(user.id),
    supabase
      .from("point_logs")
      .select("id,event_type,points,occurred_on,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (freshPoints.error) {
    return {
      isLoggedIn: true,
      points: 0,
      currentPoints: 0,
      monthlyEarned: 0,
      logs: [] as PointLogRow[],
      error: freshPoints.error,
    };
  }

  const logs = (logsRes.data ?? []) as PointLogRow[];
  const monthlyEarned = logs
    .filter((log) => log.points > 0 && log.occurred_on >= monthStart)
    .reduce((sum, log) => sum + log.points, 0);

  if (logsRes.error) {
    return {
      isLoggedIn: true,
      points: freshPoints.points,
      currentPoints: freshPoints.points,
      monthlyEarned,
      logs: [] as PointLogRow[],
      error: logsRes.error.message,
    };
  }

  return {
    isLoggedIn: true,
    points: freshPoints.points,
    currentPoints: freshPoints.points,
    monthlyEarned,
    logs,
    error: null as string | null,
  };
}
