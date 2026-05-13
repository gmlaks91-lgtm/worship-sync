import "server-only";

import type { ProfileRole, Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import {
  calculateWeeklyChecklistPoints,
  getKstWeekStartDate,
  normalizeDailyRecords,
  normalizeWorshipRecords,
  WEEKLY_CHECKLIST_DAY_DEFS,
} from "@/features/dashboard/lib/weekly-checklist";

type WeeklyChecklistRow = Tables<"weekly_checklists">;

type TeamProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: ProfileRole;
};

export type WeeklyChecklistJournalFeedEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: ProfileRole;
  updatedAt: string | null;
  submittedAt: string | null;
  totalPoints: number;
  isSubmitted: boolean;
  diaryEntries: Array<{
    dayKey: string;
    date: string;
    label: string;
    diary: string;
    qtDone: boolean;
    prayerDone: boolean;
  }>;
  qtCount: number;
  prayerCount: number;
  diaryCount: number;
};

export async function getWeeklyChecklistJournalData(): Promise<WeeklyChecklistJournalFeedEntry[]> {
  const supabase = await createClient();
  const weekStartDate = getKstWeekStartDate();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const [{ data: rows }, { data: profiles }] = await Promise.all([
    supabase
      .from("weekly_checklists")
      .select("user_id, daily_records, worship_records, total_points, is_submitted, submitted_at, updated_at")
      .eq("week_start_date", weekStartDate),
    supabase.from("profiles").select("id, username, avatar_url, role"),
  ]);

  const profileMap = new Map<string, TeamProfileRow>();
  (profiles ?? []).forEach((profile) => {
    if (profile?.id) {
      profileMap.set(profile.id, profile as TeamProfileRow);
    }
  });

  return (rows ?? [])
    .filter((row) => row?.user_id && row.user_id !== user.id)
    .map((row) => {
      const profile = profileMap.get(row.user_id);
      const normalizedDaily = normalizeDailyRecords(row?.daily_records, weekStartDate);
      const normalizedWorship = normalizeWorshipRecords(row?.worship_records);
      const score = calculateWeeklyChecklistPoints({
        dailyRecords: normalizedDaily,
        worshipRecords: normalizedWorship,
      });

      const diaryEntries = normalizedDaily.map((record) => ({
        dayKey: record.dayKey,
        date: record.date,
        label: WEEKLY_CHECKLIST_DAY_DEFS.find((item) => item.key === record.dayKey)?.label ?? record.dayKey,
        diary: record.diary,
        qtDone: record.qtDone,
        prayerDone: record.prayerDone,
      }));

      const diaryCount = diaryEntries.filter((entry) => entry.diary.trim().length > 0).length;
      const qtCount = diaryEntries.filter((entry) => entry.qtDone).length;
      const prayerCount = diaryEntries.filter((entry) => entry.prayerDone).length;

      return {
        userId: row.user_id,
        username: profile?.username ?? "알 수 없음",
        avatarUrl: profile?.avatar_url ?? null,
        role: profile?.role ?? "member",
        updatedAt: row.updated_at,
        submittedAt: row.submitted_at,
        totalPoints: score.totalPoints,
        isSubmitted: row.is_submitted ?? false,
        diaryEntries,
        qtCount,
        prayerCount,
        diaryCount,
      };
    })
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
}
