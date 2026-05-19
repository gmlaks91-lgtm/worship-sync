import "server-only";

import { unstable_noStore } from "next/cache";

import { createClient } from "@/utils/supabase/server";

/** Next.js·fetch 캐시 없이 Supabase에서 최신 profiles.points 조회 */
export async function getFreshUserPoints(userId: string): Promise<{
  points: number;
  error: string | null;
}> {
  unstable_noStore();

  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("points").eq("id", userId).maybeSingle();

  if (error) {
    return { points: 0, error: error.message };
  }

  return { points: data?.points ?? 0, error: null };
}
