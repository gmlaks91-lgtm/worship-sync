import "server-only";

import type { BlueMarbleMissionRow } from "@/features/marble/types";
import { createClient } from "@/utils/supabase/server";

export type GetBlueMarbleMissionsResult = {
  missions: BlueMarbleMissionRow[];
  error: string | null;
};

export async function getBlueMarbleMissions(): Promise<GetBlueMarbleMissionsResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blue_marble_missions")
      .select("tile_index,mission_text,created_at,updated_at")
      .order("tile_index", { ascending: true });

    if (error) {
      return { missions: [], error: error.message };
    }

    return { missions: (data ?? []) as BlueMarbleMissionRow[], error: null };
  } catch (e) {
    return {
      missions: [],
      error: e instanceof Error ? e.message : "미션 정보를 불러오지 못했습니다.",
    };
  }
}
