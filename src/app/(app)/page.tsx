import { PersonalDashboard } from "@/features/dashboard/components/PersonalDashboard";
import { QuickActionsHero } from "@/features/dashboard/components/QuickActionsHero";
import { BoardWidget } from "@/features/dashboard/components/BoardWidget";
import { WeeklySetlistHero } from "@/features/setlist/components/WeeklySetlistHero";
import { getPersonalDashboardData } from "@/features/dashboard/queries/getPersonalDashboardData";
import { fetchWeeklyPrepSetlist } from "@/features/setlist/weekly/fetch-weekly-prep-setlist";
import { resolveDashboardWeekSunday } from "@/features/setlist/weekly/navigation";
import { getTeamMembers } from "@/features/team/queries/getTeamMembers";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AhavaDashboardPage({
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

  const [dashboardData, weeklyData, teamMembersResult, recentSongWarningByVideoId] = await Promise.all([
    getPersonalDashboardData(),
    fetchWeeklyPrepSetlist(weekSunday),
    getTeamMembers(),
    getRecentSongWarningByVideoId(),
  ]);

  const canManageSetlists = user
    ? teamMembersResult.members.some(
        (member) => member.id === user.id && (member.role === "leader" || member.role === "admin"),
      )
    : false;

  return (
    <div className="flex flex-1 flex-col gap-12">
      <QuickActionsHero />
      <BoardWidget />

      <PersonalDashboard data={dashboardData} />

      <WeeklySetlistHero
        weekSundayYmd={weekSunday}
        setlist={weeklyData.setlist}
        error={weeklyData.error}
        canManageSetlists={canManageSetlists}
        teamMembers={teamMembersResult.members}
        recentSongWarningByVideoId={recentSongWarningByVideoId}
      />
    </div>
  );
}
