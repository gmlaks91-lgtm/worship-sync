import "server-only";

import {
  addDaysToYmd,
  formatWeekRangeLabel,
  getKstWeekStartDate,
  normalizeDailyRecords,
  type WeeklyChecklistDailyRecord,
} from "@/features/dashboard/lib/weekly-checklist";
import { createAdminClient } from "@/utils/supabase/admin";

const MAX_DIARY_SNIPPETS = 40;
const MAX_PRAYER_SNIPPETS = 30;
const MAX_SNIPPET_LENGTH = 280;

export type AnonymousWeeklyAggregate = {
  weekStartDate: string;
  weekEndDate: string;
  weekRangeLabel: string;
  participation: {
    totalGeneralMembers: number;
    membersWithChecklist: number;
    submittedCount: number;
    diaryEntryCount: number;
    prayerRequestCount: number;
  };
  habits: {
    qtDoneDays: number;
    prayerDoneDays: number;
    totalBibleChapters: number;
  };
  diarySnippets: string[];
  prayerTopics: string[];
};

function truncate(text: string, max = MAX_SNIPPET_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function collectDiarySnippets(records: WeeklyChecklistDailyRecord[]): string[] {
  const snippets: string[] = [];
  for (const record of records) {
    const diary = record.diary.trim();
    if (!diary) continue;
    snippets.push(truncate(diary));
    if (snippets.length >= MAX_DIARY_SNIPPETS) break;
  }
  return snippets;
}

export async function aggregateAnonymousWeeklyData(
  weekStartDate = getKstWeekStartDate(),
): Promise<AnonymousWeeklyAggregate> {
  const admin = createAdminClient();
  const weekEndDate = addDaysToYmd(weekStartDate, 6);
  const weekRangeLabel = formatWeekRangeLabel(weekStartDate);

  const { data: generalProfiles } = await admin.from("profiles").select("id").eq("role", "general");
  const generalIds = (generalProfiles ?? []).map((p) => p.id);

  if (generalIds.length === 0) {
    return {
      weekStartDate,
      weekEndDate,
      weekRangeLabel,
      participation: {
        totalGeneralMembers: 0,
        membersWithChecklist: 0,
        submittedCount: 0,
        diaryEntryCount: 0,
        prayerRequestCount: 0,
      },
      habits: { qtDoneDays: 0, prayerDoneDays: 0, totalBibleChapters: 0 },
      diarySnippets: [],
      prayerTopics: [],
    };
  }

  const periodStart = `${weekStartDate}T00:00:00+09:00`;
  const periodEnd = `${addDaysToYmd(weekEndDate, 1)}T00:00:00+09:00`;

  const [{ data: checklists }, { data: prayers }] = await Promise.all([
    admin
      .from("weekly_checklists")
      .select("user_id, daily_records, is_submitted")
      .eq("week_start_date", weekStartDate)
      .in("user_id", generalIds),
    admin
      .from("prayer_requests")
      .select("content")
      .in("user_id", generalIds)
      .gte("created_at", periodStart)
      .lt("created_at", periodEnd)
      .order("created_at", { ascending: false })
      .limit(MAX_PRAYER_SNIPPETS),
  ]);

  const diarySnippets: string[] = [];
  let qtDoneDays = 0;
  let prayerDoneDays = 0;
  let totalBibleChapters = 0;
  let diaryEntryCount = 0;
  let submittedCount = 0;

  for (const row of checklists ?? []) {
    if (row.is_submitted) submittedCount += 1;
    const daily = normalizeDailyRecords(row.daily_records, weekStartDate);
    for (const record of daily) {
      if (record.qtDone) qtDoneDays += 1;
      if (record.prayerDone) prayerDoneDays += 1;
      totalBibleChapters += record.bibleChapters;
      if (record.diary.trim()) diaryEntryCount += 1;
    }
    const fromRow = collectDiarySnippets(daily);
    for (const snippet of fromRow) {
      if (diarySnippets.length >= MAX_DIARY_SNIPPETS) break;
      diarySnippets.push(snippet);
    }
  }

  const prayerTopics = (prayers ?? [])
    .map((p) => truncate(p.content))
    .filter((content) => content.length > 0);

  return {
    weekStartDate,
    weekEndDate,
    weekRangeLabel,
    participation: {
      totalGeneralMembers: generalIds.length,
      membersWithChecklist: checklists?.length ?? 0,
      submittedCount,
      diaryEntryCount,
      prayerRequestCount: prayerTopics.length,
    },
    habits: {
      qtDoneDays,
      prayerDoneDays,
      totalBibleChapters,
    },
    diarySnippets,
    prayerTopics,
  };
}
