"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMissingReminderColumnsError } from "@/features/profile/queries/profileSelect";
import { toDbReminderTime } from "@/lib/push/kst-time";
import { createClient } from "@/utils/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.string().url("구독 endpoint가 올바르지 않습니다."),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh 키가 필요합니다."),
    auth: z.string().min(1, "auth 키가 필요합니다."),
  }),
  userAgent: z.string().max(512).optional(),
});

const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "올바른 시간 형식이 아닙니다. (HH:mm)");

const dailyReminderSchema = z.object({
  wantsDailyReminder: z.boolean(),
  dailyReminderTime: reminderTimeSchema.optional(),
});

export type PushActionResult = { ok: true } | { ok: false; message: string };

export async function savePushSubscription(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}): Promise<PushActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "구독 정보를 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth_key: parsed.data.keys.auth,
        user_agent: parsed.data.userAgent ?? null,
      },
      { onConflict: "user_id,endpoint" },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "구독 저장에 실패했습니다.",
    };
  }
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const parsed = z.string().url().safeParse(endpoint);
  if (!parsed.success) {
    return { ok: false, message: "구독 endpoint가 올바르지 않습니다." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", parsed.data);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "구독 해제에 실패했습니다.",
    };
  }
}

export async function updateDailyReminderSettings(input: {
  wantsDailyReminder: boolean;
  dailyReminderTime?: string;
}): Promise<PushActionResult> {
  const parsed = dailyReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  if (parsed.data.wantsDailyReminder && !parsed.data.dailyReminderTime) {
    return { ok: false, message: "알림 시간을 선택해 주세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        wants_daily_reminder: parsed.data.wantsDailyReminder,
        daily_reminder_time: parsed.data.wantsDailyReminder
          ? toDbReminderTime(parsed.data.dailyReminderTime!)
          : null,
      })
      .eq("id", user.id);

    if (error) {
      if (isMissingReminderColumnsError(error.message)) {
        return {
          ok: false,
          message: "알림 설정 컬럼이 DB에 없습니다. Supabase에 최신 마이그레이션을 적용해 주세요.",
        };
      }
      return { ok: false, message: error.message };
    }

    revalidatePath("/more");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "알림 설정 저장에 실패했습니다.",
    };
  }
}

export async function createAnnouncementPost(input: {
  title: string;
  content: string;
}): Promise<PushActionResult> {
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(80),
      content: z.string().trim().min(1).max(8000),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "공지 제목과 내용을 입력하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      return { ok: false, message: "공지 작성 권한이 없습니다." };
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      category: "prayer",
      title: parsed.data.title,
      topic: "notice",
      content: parsed.data.content,
      mentioned_user_ids: [],
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/announcements");
    revalidatePath("/prayer");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "공지 저장에 실패했습니다.",
    };
  }
}
