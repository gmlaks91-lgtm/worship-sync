"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { revalidatePointsRoutes } from "@/features/points/lib/revalidate-points";
import { createClient } from "@/utils/supabase/server";

const faithTypeSchema = z.enum(["qt", "prayer", "bible"]);
const toggleSchema = z.object({
  checkType: faithTypeSchema,
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const POINTS_PER_CHECK = 10;

export type FaithActionResult = { ok: true; points: number } | { ok: false; message: string };

export async function toggleFaithCheck(raw: z.infer<typeof toggleSchema>): Promise<FaithActionResult> {
  const parsed = toggleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값을 확인해 주세요." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { checkType, checkDate } = parsed.data;
    const { data: existing, error: findErr } = await supabase
      .from("faith_checks")
      .select("id")
      .eq("user_id", user.id)
      .eq("check_type", checkType)
      .eq("check_date", checkDate)
      .maybeSingle();

    if (findErr) return { ok: false, message: findErr.message };

    if (existing) {
      const { error: delErr } = await supabase.from("faith_checks").delete().eq("id", existing.id);
      if (delErr) return { ok: false, message: delErr.message };
      const { error: profileErr } = await supabase.rpc("decrement_profile_points", {
        p_user_id: user.id,
        p_points: POINTS_PER_CHECK,
      });
      if (profileErr) return { ok: false, message: profileErr.message };
    } else {
      const { error: insErr } = await supabase.from("faith_checks").insert({
        user_id: user.id,
        check_type: checkType,
        check_date: checkDate,
        points_earned: POINTS_PER_CHECK,
      });
      if (insErr) return { ok: false, message: insErr.message };
      const { error: profileErr } = await supabase.rpc("increment_profile_points", {
        p_user_id: user.id,
        p_points: POINTS_PER_CHECK,
      });
      if (profileErr) return { ok: false, message: profileErr.message };
    }

    const { data: profile, error: profileReadErr } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadErr) {
      return { ok: false, message: profileReadErr.message };
    }

    revalidatePointsRoutes();
    revalidatePath("/faith");

    return { ok: true, points: profile?.points ?? 0 };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
