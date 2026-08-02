import "server-only";

import {
  formatWeekRangeLabel,
  getKstWeekStartDate,
  normalizeDailyRecords,
} from "@/features/dashboard/lib/weekly-checklist";
import { CHART_COLORS } from "@/features/admin-dashboard/lib/chart-colors";
import type { Json } from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";

export type TopSongStat = {
  songId: string;
  title: string;
  playCount: number;
};

export type JournalParticipationSlice = {
  name: string;
  value: number;
  color: string;
};

export type ShopSalesRankItem = {
  shopItemId: string;
  name: string;
  salesCount: number;
};

export type AdminDashboardStats = {
  weekRangeLabel: string;
  topSongs: TopSongStat[];
  journalParticipation: JournalParticipationSlice[];
  journalParticipationTotal: number;
  shopSalesRanking: ShopSalesRankItem[];
};

function hasJournalActivity(
  dailyRecords: unknown,
  weekStartDate: string,
  isSubmitted: boolean,
): boolean {
  if (isSubmitted) return true;
  const daily = normalizeDailyRecords(dailyRecords as Json, weekStartDate);
  return daily.some((record) => record.diary.trim().length > 0);
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const admin = createAdminClient();
  const weekStartDate = getKstWeekStartDate();
  const weekRangeLabel = formatWeekRangeLabel(weekStartDate);

  const [
    { data: setlistSongRows },
    { data: generalProfiles },
    { data: weeklyRows },
    { data: inventoryRows },
    { data: shopItems },
  ] = await Promise.all([
    admin.from("setlist_songs").select("song_id, songs(title)"),
    admin.from("profiles").select("id").eq("role", "general"),
    admin
      .from("weekly_checklists")
      .select("user_id, daily_records, is_submitted")
      .eq("week_start_date", weekStartDate),
    admin.from("user_inventory").select("shop_item_id"),
    admin.from("shop_items").select("id, name"),
  ]);

  const songCountMap = new Map<string, { title: string; count: number }>();
  for (const row of setlistSongRows ?? []) {
    const songId = row.song_id;
    const title =
      (row.songs as { title?: string } | null)?.title?.trim() || "제목 없음";
    const current = songCountMap.get(songId) ?? { title, count: 0 };
    current.count += 1;
    songCountMap.set(songId, current);
  }

  const topSongs: TopSongStat[] = [...songCountMap.entries()]
    .map(([songId, { title, count }]) => ({
      songId,
      title,
      playCount: count,
    }))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  const generalIds = (generalProfiles ?? []).map((p) => p.id);
  const checklistByUser = new Map(
    (weeklyRows ?? []).map((row) => [row.user_id, row]),
  );

  let writtenCount = 0;
  for (const userId of generalIds) {
    const row = checklistByUser.get(userId);
    if (
      row &&
      hasJournalActivity(row.daily_records, weekStartDate, row.is_submitted)
    ) {
      writtenCount += 1;
    }
  }
  const notWrittenCount = Math.max(0, generalIds.length - writtenCount);

  const journalParticipation: JournalParticipationSlice[] = [
    { name: "일지 작성", value: writtenCount, color: CHART_COLORS.sky },
    { name: "미작성", value: notWrittenCount, color: CHART_COLORS.roseLight },
  ].filter((slice) => slice.value > 0);

  const shopNameMap = new Map(
    (shopItems ?? []).map((item) => [item.id, item.name]),
  );
  const salesMap = new Map<string, number>();
  for (const row of inventoryRows ?? []) {
    salesMap.set(row.shop_item_id, (salesMap.get(row.shop_item_id) ?? 0) + 1);
  }

  const shopSalesRanking: ShopSalesRankItem[] = [...salesMap.entries()]
    .map(([shopItemId, salesCount]) => ({
      shopItemId,
      name: shopNameMap.get(shopItemId) ?? "삭제된 상품",
      salesCount,
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 8);

  return {
    weekRangeLabel,
    topSongs,
    journalParticipation,
    journalParticipationTotal: generalIds.length,
    shopSalesRanking,
  };
}
