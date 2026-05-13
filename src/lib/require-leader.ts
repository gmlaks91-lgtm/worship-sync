import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type TypedSupabase = SupabaseClient<Database>;

export type RequireLeaderResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/** 송리스트·곡·셋리스트 연동 변경에 필요한 리더 권한 확인 */
export async function requireLeader(supabase: TypedSupabase): Promise<RequireLeaderResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
    return {
      ok: false,
      message: "송리스트 관리 권한이 없습니다. 리더/관리자만 이용할 수 있습니다.",
    };
  }

  return { ok: true, userId: user.id };
}
