"use server";

import { revalidatePath } from "next/cache";

import type { JournalTeamFilter } from "@/features/teams/types";
import { revalidatePointsRoutes } from "@/features/points/lib/revalidate-points";
import { createClient } from "@/utils/supabase/server";

import {
  calculateWeeklyChecklistPoints,
  getKstWeekStartDate,
  normalizeDailyRecords,
  normalizeWorshipRecords,
  weeklyChecklistDraftSchema,
  type WeeklyChecklistDraftInput,
} from "@/features/dashboard/lib/weekly-checklist";

type WeeklyChecklistActionResult =
  | {
      ok: true;
      message: string;
      totalPoints: number;
      awardedPoints?: number;
      isSubmitted?: boolean;
    }
  | {
      ok: false;
      message: string;
    };

function revalidateWeeklyChecklistRoutes() {
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePointsRoutes();
}

export async function fetchWeeklyChecklistJournalFeed(teamFilter: JournalTeamFilter = "all") {
  const { getWeeklyChecklistJournalData } = await import(
    "@/features/dashboard/queries/getWeeklyChecklistJournalData"
  );
  return getWeeklyChecklistJournalData(teamFilter);
}

async function saveWeeklyChecklistDraftInternal(
  userId: string,
  raw: WeeklyChecklistDraftInput,
): Promise<WeeklyChecklistActionResult> {
  const parsed = weeklyChecklistDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 다시 확인해 주세요." };
  }

  if (parsed.data.weekStartDate !== getKstWeekStartDate()) {
    return { ok: false, message: "이번 주 체크리스트만 저장할 수 있습니다." };
  }

  const supabase = await createClient();
  const dailyRecords = normalizeDailyRecords(parsed.data.dailyRecords, parsed.data.weekStartDate);
  const worshipRecords = normalizeWorshipRecords(parsed.data.worshipRecords);
  const score = calculateWeeklyChecklistPoints({ dailyRecords, worshipRecords });

  const { data: existing, error: existingError } = await supabase
    .from("weekly_checklists")
    .select("id, is_submitted")
    .eq("user_id", userId)
    .eq("week_start_date", parsed.data.weekStartDate)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: existingError.message };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("weekly_checklists")
      .update({
        daily_records: dailyRecords,
        worship_records: worshipRecords,
        total_points: score.totalPoints,
      })
      .eq("id", existing.id);

    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("weekly_checklists").insert({
      user_id: userId,
      week_start_date: parsed.data.weekStartDate,
      daily_records: dailyRecords,
      worship_records: worshipRecords,
      total_points: score.totalPoints,
    });

    if (error) {
      return { ok: false, message: error.message };
    }
  }

  return {
    ok: true,
    message: "이번 주 체크리스트가 임시 저장되었습니다.",
    totalPoints: score.totalPoints,
    isSubmitted: false,
  };
}

export async function upsertWeeklyChecklistDraft(raw: WeeklyChecklistDraftInput): Promise<WeeklyChecklistActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const result = await saveWeeklyChecklistDraftInternal(user.id, raw);
  if (result.ok) {
    // 자동 저장 시 /journal 을 revalidate 하면 편집 중 UI가 서버 데이터로 되돌아갈 수 있음
    revalidatePath("/");
    revalidatePointsRoutes();
  }
  return result;
}

export async function submitWeeklyChecklist(raw: WeeklyChecklistDraftInput): Promise<WeeklyChecklistActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const saved = await saveWeeklyChecklistDraftInternal(user.id, raw);
  if (!saved.ok) {
    return saved;
  }

  const { data, error } = await supabase.rpc("submit_weekly_checklist", {
    p_week_start_date: raw.weekStartDate,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;

  revalidateWeeklyChecklistRoutes();

  return {
    ok: true,
    message: row?.message ?? "이번 주 체크리스트가 제출되었습니다.",
    totalPoints: Number(row?.total_points ?? saved.totalPoints),
    awardedPoints: Number(row?.awarded_points ?? saved.totalPoints),
    isSubmitted: true,
  };
}
