"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireLeader } from "@/lib/require-leader";
import { awardPointsForEvent } from "@/features/points/server/awardPoints";
import { createClient } from "@/utils/supabase/server";

const scheduleKindSchema = z.enum(["practice", "worship", "social"]);
const scheduleAttendanceStatusSchema = z.enum(["attending", "absent"]);

const setAttendanceSchema = z.object({
  scheduleId: z.string().uuid(),
  status: scheduleAttendanceStatusSchema,
  reason: z.string().trim().max(500).optional(),
});

const createScheduleSchema = z.object({
  title: z.string().min(1).max(200),
  kind: scheduleKindSchema,
  startsAt: z.string().min(1),
});

const deleteScheduleSchema = z.object({
  scheduleId: z.string().uuid(),
});

export type ActionResult = { ok: true; awardedPoints?: number } | { ok: false; message: string };

export async function setScheduleAttendance(
  raw: z.infer<typeof setAttendanceSchema>,
): Promise<ActionResult> {
  const parsed = setAttendanceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 확인하세요." };
  }

  const { scheduleId, status, reason } = parsed.data;
  if (status === "absent" && !reason?.trim()) {
    return { ok: false, message: "불참 사유를 입력해 주세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase.from("attendances").upsert(
      {
        schedule_id: scheduleId,
        user_id: user.id,
        status,
        reason: status === "absent" ? reason?.trim() ?? null : null,
      },
      { onConflict: "schedule_id,user_id" },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    const reward = await awardPointsForEvent({
      eventType: "schedule_check",
      points: 10,
    });

    revalidatePath("/schedule");
    revalidatePath("/");
    return { ok: true, awardedPoints: reward.awardedPoints };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function createSchedule(raw: z.infer<typeof createScheduleSchema>): Promise<ActionResult> {
  const parsed = createScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "일정 정보를 확인하세요." };
  }

  const { title, kind, startsAt } = parsed.data;
  const t = Date.parse(startsAt);
  if (Number.isNaN(t)) {
    return { ok: false, message: "날짜·시간 형식이 올바르지 않습니다." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: "리더만 일정을 추가할 수 있습니다." };
    }

    const { error } = await supabase.from("schedules").insert({
      title: title.trim(),
      kind,
      starts_at: new Date(t).toISOString(),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/schedule");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function deleteSchedule(raw: z.infer<typeof deleteScheduleSchema>): Promise<ActionResult> {
  const parsed = deleteScheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "일정을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: "리더만 일정을 삭제할 수 있습니다." };
    }

    const { data: target, error: readError } = await supabase
      .from("schedules")
      .select("id")
      .eq("id", parsed.data.scheduleId)
      .maybeSingle();
    if (readError) {
      return { ok: false, message: readError.message };
    }
    if (!target) {
      return { ok: false, message: "이미 삭제된 일정입니다." };
    }

    const { error } = await supabase.from("schedules").delete().eq("id", parsed.data.scheduleId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/schedule");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}
