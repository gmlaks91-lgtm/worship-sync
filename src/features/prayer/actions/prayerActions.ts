"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const createPrayerSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  isAnonymous: z.boolean().optional(),
});

const reactSchema = z.object({
  requestId: z.string().uuid(),
});

const updatePrayerSchema = z.object({
  id: z.string().uuid(),
  content: z.string().trim().min(1).max(1000),
});

const deletePrayerSchema = z.object({
  id: z.string().uuid(),
});

type ActionResult = { ok: true } | { ok: false; message: string };

/** 현재 사용자가 리더 또는 관리자인지 확인한다. */
async function isLeaderOrAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return profile?.role === "leader" || profile?.role === "admin";
}

export async function createPrayerRequest(raw: z.infer<typeof createPrayerSchema>): Promise<ActionResult> {
  const parsed = createPrayerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값을 확인해 주세요." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { error } = await supabase.from("prayer_requests").insert({
      content: parsed.data.content,
      user_id: user.id,
      is_anonymous: parsed.data.isAnonymous ?? false,
    });
    if (error) return { ok: false, message: error.message };
    revalidatePath("/prayer");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

/** 본인 글 또는 리더/관리자만 기도제목을 수정할 수 있다. */
export async function updatePrayerRequest(raw: z.infer<typeof updatePrayerSchema>): Promise<ActionResult> {
  const parsed = updatePrayerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값을 확인해 주세요." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: existing, error: findErr } = await supabase
      .from("prayer_requests")
      .select("user_id")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (findErr) return { ok: false, message: findErr.message };
    if (!existing) return { ok: false, message: "기도제목을 찾을 수 없습니다." };

    const isLeader = await isLeaderOrAdmin(supabase, user.id);
    if (existing.user_id !== user.id && !isLeader) {
      return { ok: false, message: "본인 글 또는 리더/관리자만 수정할 수 있습니다." };
    }

    const { error } = await supabase
      .from("prayer_requests")
      .update({ content: parsed.data.content })
      .eq("id", parsed.data.id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/prayer");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

/** 본인 글 또는 리더/관리자만 기도제목을 삭제할 수 있다. */
export async function deletePrayerRequest(raw: z.infer<typeof deletePrayerSchema>): Promise<ActionResult> {
  const parsed = deletePrayerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "잘못된 요청입니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: existing, error: findErr } = await supabase
      .from("prayer_requests")
      .select("user_id")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (findErr) return { ok: false, message: findErr.message };
    if (!existing) return { ok: false, message: "기도제목을 찾을 수 없습니다." };

    const isLeader = await isLeaderOrAdmin(supabase, user.id);
    if (existing.user_id !== user.id && !isLeader) {
      return { ok: false, message: "본인 글 또는 리더/관리자만 삭제할 수 있습니다." };
    }

    const { error } = await supabase.from("prayer_requests").delete().eq("id", parsed.data.id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/prayer");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function togglePrayerReaction(raw: z.infer<typeof reactSchema>): Promise<ActionResult> {
  const parsed = reactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값을 확인해 주세요." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: existing, error: findErr } = await supabase
      .from("prayer_reactions")
      .select("request_id")
      .eq("request_id", parsed.data.requestId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (findErr) return { ok: false, message: findErr.message };

    if (existing) {
      const { error } = await supabase
        .from("prayer_reactions")
        .delete()
        .eq("request_id", parsed.data.requestId)
        .eq("user_id", user.id);
      if (error) return { ok: false, message: error.message };
    } else {
      const { error } = await supabase.from("prayer_reactions").insert({
        request_id: parsed.data.requestId,
        user_id: user.id,
      });
      if (error) return { ok: false, message: error.message };
    }

    revalidatePath("/prayer");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
