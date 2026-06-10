import "server-only";

import { formatWeekRangeLabel, getKstWeekStartDate } from "@/features/dashboard/lib/weekly-checklist";
import type { Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type WeeklyAiReportView = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  weekRangeLabel: string;
  summary: string;
  keywords: string[];
  updatedAt: string;
};

export async function getLatestAiReportForCurrentWeek(): Promise<WeeklyAiReportView | null> {
  const supabase = await createClient();
  const weekStartDate = getKstWeekStartDate();

  const { data, error } = await supabase
    .from("ai_reports")
    .select("id, week_start_date, week_end_date, summary, keywords, updated_at")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as Tables<"ai_reports">;

  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    weekRangeLabel: formatWeekRangeLabel(row.week_start_date),
    summary: row.summary,
    keywords: row.keywords ?? [],
    updatedAt: row.updated_at,
  };
}

export async function getAiReportAdminPreview(): Promise<{
  currentWeekLabel: string;
  latestReport: WeeklyAiReportView | null;
}> {
  const weekStartDate = getKstWeekStartDate();
  const latestReport = await getLatestAiReportForCurrentWeek();

  return {
    currentWeekLabel: formatWeekRangeLabel(weekStartDate),
    latestReport,
  };
}

export async function getGeneralUserRole(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "general";
}
