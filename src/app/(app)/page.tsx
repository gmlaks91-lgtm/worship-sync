import { PersonalDashboard } from "@/features/dashboard/components/PersonalDashboard";
import { WeeklyChecklistBoard } from "@/features/dashboard/components/WeeklyChecklistBoard";
import { getPersonalDashboardData } from "@/features/dashboard/queries/getPersonalDashboardData";
import { getWeeklyChecklistBoardData } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import { WeeklySetlistHero } from "@/features/setlist/components/WeeklySetlistHero";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import type { PrepSetlistWithSheets } from "@/features/setlist/types";
import { fetchWeeklyPrepSetlist } from "@/features/setlist/weekly/fetch-weekly-prep-setlist";
import { resolveDashboardWeekSunday } from "@/features/setlist/weekly/navigation";
import { LastWorshipVideoSection } from "@/features/team-settings/components/LastWorshipVideoSection";
import { getLatestSheetsBySongIds } from "@/features/sheets/queries/getSheets";
import type { TeamMemberRow } from "@/features/team/queries/getTeamMembers";
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
  let canManageSetlists = false;
  let teamMembers: TeamMemberRow[] = [];

  if (user) {
    const [{ data: row }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, username, avatar_url, role, role_priority_1, role_priority_2, role_priority_3")
        .order("username", { ascending: true }),
    ]);
    canManageSetlists = row?.role === "leader" || row?.role === "admin";
    teamMembers = (members ?? []) as TeamMemberRow[];
  }

  const weekSundayYmd = resolveDashboardWeekSunday(sp.sunday);

  const [{ setlist, error: setlistError }, dashboardData, weeklyChecklistData] = await Promise.all([
    fetchWeeklyPrepSetlist(weekSundayYmd),
    getPersonalDashboardData(),
    getWeeklyChecklistBoardData(),
  ]);
  const recentSongWarningByVideoId = canManageSetlists ? await getRecentSongWarningByVideoId() : {};
  const songIds = setlist ? setlist.songs.map((s) => s.id) : [];
  const sheetMap = await getLatestSheetsBySongIds(songIds);

  const weeklyWithSheets: PrepSetlistWithSheets | null = setlist
    ? {
        ...setlist,
        songs: setlist.songs.map((s) => ({
          ...s,
          sheet: sheetMap[s.id] ?? null,
        })),
      }
    : null;

  return (
    <div className="flex flex-1 flex-col gap-12">
      <WeeklySetlistHero
        key={weekSundayYmd}
        weekSundayYmd={weekSundayYmd}
        setlist={weeklyWithSheets}
        error={setlistError}
        canManageSetlists={canManageSetlists}
        teamMembers={teamMembers}
        recentSongWarningByVideoId={recentSongWarningByVideoId}
      />

      <LastWorshipVideoSection
        videoUrl={dashboardData.lastWorshipVideoUrl}
        embedUrl={dashboardData.lastWorshipVideoEmbedUrl}
        canEdit={dashboardData.canManageTeamPlaylist}
      />

      <WeeklyChecklistBoard data={weeklyChecklistData} />

      <PersonalDashboard data={dashboardData} />
    </div>
  );
}
