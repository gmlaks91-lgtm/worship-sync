import "server-only";

import type { BlueMarbleRow } from "@/features/marble/types";
import { createClient } from "@/utils/supabase/server";

export type GetBlueMarbleTeamsResult = {
  teams: BlueMarbleRow[];
  error: string | null;
};

/**
 * 7개 목장 현황을 점수 내림차순으로 조회한다.
 * blue_marble RLS: select using (true) → 누구나 조회 가능.
 */
export async function getBlueMarbleTeams(): Promise<GetBlueMarbleTeamsResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blue_marble")
      .select("id,team_name,score,position,image_url,created_at,updated_at")
      .order("score", { ascending: false })
      .order("team_name", { ascending: true });

    if (error) {
      return { teams: [], error: error.message };
    }

    return { teams: (data ?? []) as BlueMarbleRow[], error: null };
  } catch (e) {
    return {
      teams: [],
      error: e instanceof Error ? e.message : "목장 정보를 불러오지 못했습니다.",
    };
  }
}
