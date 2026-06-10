"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };

export async function updateAuthCodeAction(raw: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      code: z.string().trim().min(4, "인증 코드는 4자 이상이어야 합니다.").max(64),
    })
    .safeParse(raw);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase
      .from("auth_codes")
      .update({
        code: parsed.data.code,
        updated_at: new Date().toISOString(),
        updated_by: leader.userId,
      })
      .eq("id", 1);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/auth-code");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

export async function getAuthCodeForAdmin(): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient();
  const leader = await requireLeader(supabase);
  if (!leader.ok) return { code: null, error: leader.message };

  const { data, error } = await supabase.from("auth_codes").select("code").eq("id", 1).maybeSingle();
  if (error) return { code: null, error: error.message };
  return { code: data?.code ?? null, error: null };
}
