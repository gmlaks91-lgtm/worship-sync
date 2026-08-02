"use server";

import { revalidatePointsRoutes } from "@/features/points/lib/revalidate-points";
import { createClient } from "@/utils/supabase/server";

export type PointAwardResult = {
  awardedPoints: number;
  totalPoints: number | null;
  message: string;
};

export async function awardPointsForEvent(params: {
  eventType: "daily_login" | "sheet_view" | "schedule_check" | "board_post";
  points: number;
  oncePerDay?: boolean;
}): Promise<PointAwardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { awardedPoints: 0, totalPoints: null, message: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("award_points", {
    p_user_id: user.id,
    p_event_type: params.eventType,
    p_points: params.points,
    p_once_per_day: params.oncePerDay ?? false,
    p_daily_activity_cap: 50,
  });

  if (error) {
    return { awardedPoints: 0, totalPoints: null, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;
  const awardedPoints = Number(row?.granted_points ?? 0);

  if (awardedPoints > 0) {
    revalidatePointsRoutes();
  }

  // RPC returns (granted_points, message) only — total is refreshed via revalidate
  return {
    awardedPoints,
    totalPoints: null,
    message: String(row?.message ?? "처리되었습니다."),
  };
}
