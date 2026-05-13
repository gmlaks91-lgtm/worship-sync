import "server-only";

import type { ProfileRole, Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

import {
  calculateWeeklyChecklistPoints,
  createDefaultDailyRecords,
  createDefaultWorshipRecords,
  formatWeekRangeLabel,
  getKstWeekStartDate,
  normalizeDailyRecords,
  normalizeWorshipRecords,
} from "@/features/dashboard/lib/weekly-checklist";

type WeeklyChecklistRow = Tables<"weekly_checklists">;

type TeamProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: ProfileRole;
};

export type WeeklyChecklistTeamOverviewRow = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: ProfileRole;
  hasStarted: boolean;
  totalPoints: number;
  awardedPoints: number;
  isSubmitted: boolean;
  updatedAt: string | null;
  submittedAt: string | null;
};

export type WeeklyChecklistBoardData = {
  weekStartDate: string;
  weekRangeLabel: string;
  canManageOverview: boolean;
  error: string | null;
  checklist: {
    id: string | null;
    weekStartDate: string;
    dailyRecords: ReturnType<typeof createDefaultDailyRecords>;
    worshipRecords: ReturnType<typeof createDefaultWorshipRecords>;
    totalPoints: number;
    awardedPoints: number;
    isSubmitted: boolean;
    submittedAt: string | null;
    updatedAt: string | null;
  };
  teamOverview: WeeklyChecklistTeamOverviewRow[];
};

export async function getWeeklyChecklistBoardData(): Promise<WeeklyChecklistBoardData> {
  const supabase = await createClient();
  const weekStartDate = getKstWeekStartDate();
  const defaultDailyRecords = createDefaultDailyRecords(weekStartDate);
  const defaultWorshipRecords = createDefaultWorshipRecords();
  const defaultScore = calculateWeeklyChecklistPoints({
    dailyRecords: defaultDailyRecords,
    worshipRecords: defaultWorshipRecords,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      weekStartDate,
      weekRangeLabel: formatWeekRangeLabel(weekStartDate),
      canManageOverview: false,
      error: null,
      checklist: {
        id: null,
        weekStartDate,
        dailyRecords: defaultDailyRecords,
        worshipRecords: defaultWorshipRecords,
        totalPoints: defaultScore.totalPoints,
        awardedPoints: 0,
        isSubmitted: false,
        submittedAt: null,
        updatedAt: null,
      },
      teamOverview: [],
    };
  }

  const [{ data: profile, error: profileError }, { data: checklistRow, error: checklistError }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase
        .from("weekly_checklists")
        .select("id, week_start_date, daily_records, worship_records, total_points, awarded_points, is_submitted, submitted_at, updated_at")
        .eq("user_id", user.id)
        .eq("week_start_date", weekStartDate)
        .maybeSingle(),
    ]);

  const canManageOverview = profile?.role === "leader" || profile?.role === "admin";
  const mergedError = [profileError?.message, checklistError?.message].filter(Boolean).join(" · ") || null;

  const normalizedDailyRecords = normalizeDailyRecords(
    (checklistRow as WeeklyChecklistRow | null)?.daily_records,
    weekStartDate,
  );
  const normalizedWorshipRecords = normalizeWorshipRecords(
    (checklistRow as WeeklyChecklistRow | null)?.worship_records,
  );
  const computedScore = calculateWeeklyChecklistPoints({
    dailyRecords: normalizedDailyRecords,
    worshipRecords: normalizedWorshipRecords,
  });

  let teamOverview: WeeklyChecklistTeamOverviewRow[] = [];

  if (canManageOverview) {
    const [{ data: profiles, error: membersError }, { data: rows, error: rowsError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_url, role")
        .order("username", { ascending: true }),
      supabase
        .from("weekly_checklists")
        .select("user_id, daily_records, worship_records, total_points, awarded_points, is_submitted, submitted_at, updated_at")
        .eq("week_start_date", weekStartDate),
    ]);

    const byUserId = new Map((rows ?? []).map((row) => [row.user_id, row]));
    teamOverview = ((profiles ?? []) as TeamProfileRow[]).map((member) => {
      const row = byUserId.get(member.id) as
        | Pick<
            WeeklyChecklistRow,
            "daily_records" | "worship_records" | "total_points" | "awarded_points" | "is_submitted" | "submitted_at" | "updated_at"
          >
        | undefined;
      const normalizedMemberDaily = normalizeDailyRecords(row?.daily_records, weekStartDate);
      const normalizedMemberWorship = normalizeWorshipRecords(row?.worship_records);
      const score = calculateWeeklyChecklistPoints({
        dailyRecords: normalizedMemberDaily,
        worshipRecords: normalizedMemberWorship,
      });
      return {
        userId: member.id,
        username: member.username,
        avatarUrl: member.avatar_url,
        role: member.role,
        hasStarted: Boolean(row),
        totalPoints: score.totalPoints,
        awardedPoints: row?.awarded_points ?? 0,
        isSubmitted: row?.is_submitted ?? false,
        updatedAt: row?.updated_at ?? null,
        submittedAt: row?.submitted_at ?? null,
      };
    });

    if (membersError || rowsError) {
      return {
        weekStartDate,
        weekRangeLabel: formatWeekRangeLabel(weekStartDate),
        canManageOverview,
        error: [mergedError, membersError?.message, rowsError?.message].filter(Boolean).join(" · "),
        checklist: {
          id: checklistRow?.id ?? null,
          weekStartDate,
          dailyRecords: normalizedDailyRecords,
          worshipRecords: normalizedWorshipRecords,
          totalPoints: computedScore.totalPoints,
          awardedPoints: checklistRow?.awarded_points ?? 0,
          isSubmitted: checklistRow?.is_submitted ?? false,
          submittedAt: checklistRow?.submitted_at ?? null,
          updatedAt: checklistRow?.updated_at ?? null,
        },
        teamOverview,
      };
    }
  }

  return {
    weekStartDate,
    weekRangeLabel: formatWeekRangeLabel(weekStartDate),
    canManageOverview,
    error: mergedError,
    checklist: {
      id: checklistRow?.id ?? null,
      weekStartDate,
      dailyRecords: normalizedDailyRecords,
      worshipRecords: normalizedWorshipRecords,
      totalPoints: computedScore.totalPoints,
      awardedPoints: checklistRow?.awarded_points ?? 0,
      isSubmitted: checklistRow?.is_submitted ?? false,
      submittedAt: checklistRow?.submitted_at ?? null,
      updatedAt: checklistRow?.updated_at ?? null,
    },
    teamOverview,
  };
}
