import "server-only";

import type { ProfileRole, Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import {
  calculateWeeklyChecklistPoints,
  createDefaultDailyRecords,
  createDefaultWorshipRecords,
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

function buildFeedEntry(
  profile: TeamProfileRow,
  row: WeeklyChecklistRow | null,
  weekStartDate: string,
): WeeklyChecklistJournalFeedEntry {
  const normalizedDaily = row
    ? normalizeDailyRecords(row.daily_records, weekStartDate)
    : createDefaultDailyRecords(weekStartDate);
  const normalizedWorship = row
    ? normalizeWorshipRecords(row.worship_records)
    : createDefaultWorshipRecords();
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
    userId: profile.id,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    updatedAt: row?.updated_at ?? null,
    submittedAt: row?.submitted_at ?? null,
    totalPoints: score.totalPoints,
    isSubmitted: row?.is_submitted ?? false,
    diaryEntries,
    qtCount,
    prayerCount,
    diaryCount,
  };
}

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
    supabase.from("profiles").select("id, username, avatar_url, role").order("username", { ascending: true }),
  ]);

  const checklistByUser = new Map<string, WeeklyChecklistRow>();
  (rows ?? []).forEach((row) => {
    if (row?.user_id) {
      checklistByUser.set(row.user_id, row as WeeklyChecklistRow);
    }
  });

  return (profiles ?? [])
    .filter((profile): profile is TeamProfileRow => Boolean(profile?.id && profile.id !== user.id))
    .map((profile) => buildFeedEntry(profile, checklistByUser.get(profile.id) ?? null, weekStartDate))
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.username.localeCompare(b.username, "ko");
    });
}
