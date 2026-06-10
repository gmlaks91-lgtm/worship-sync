"use server";

import { unstable_noStore } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export type CurrentUserPointsResult =
  | { ok: true; points: number }
  | { ok: false; message: string };

/** 클라이언트에서 최신 잔액을 다시 불러올 때 사용 (캐시 없음) */
export async function getCurrentUserPoints(): Promise<CurrentUserPointsResult> {
  unstable_noStore();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase.from("profiles").select("points").eq("id", user.id).maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, points: data?.points ?? 0 };
}
