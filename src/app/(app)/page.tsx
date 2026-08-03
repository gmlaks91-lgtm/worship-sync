import { BoardWidget } from "@/features/dashboard/components/BoardWidget";
import { QuickActionsHero } from "@/features/dashboard/components/QuickActionsHero";
import { WeeklySetlistHero } from "@/features/setlist/components/WeeklySetlistHero";
import { getLineupMembers } from "@/features/setlist/queries/getLineupMembers";
import { fetchWeeklyPrepSetlist } from "@/features/setlist/weekly/fetch-weekly-prep-setlist";
import { resolveDashboardWeekSunday } from "@/features/setlist/weekly/navigation";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sunday?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekSunday = resolveDashboardWeekSunday(sp.sunday);

  const [weeklyData, lineupMembersResult, recentSongWarningByVideoId] = await Promise.all([
    fetchWeeklyPrepSetlist(weekSunday),
    getLineupMembers(),
    getRecentSongWarningByVideoId(),
  ]);

  let canManageSetlists = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    canManageSetlists = profile?.role === "leader" || profile?.role === "admin";
  }

  return (
    <div className="flex flex-1 flex-col gap-8 sm:gap-12">
      <WeeklySetlistHero
        weekSundayYmd={weekSunday}
        setlist={weeklyData.setlist}
        error={weeklyData.error}
        canManageSetlists={canManageSetlists}
        teamMembers={lineupMembersResult.members}
        recentSongWarningByVideoId={recentSongWarningByVideoId}
      />

      <QuickActionsHero />
      <BoardWidget />
    </div>
  );
}
