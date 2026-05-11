import { PersonalDashboard } from "@/features/dashboard/components/PersonalDashboard";
import { getPersonalDashboardData } from "@/features/dashboard/queries/getPersonalDashboardData";
import { WeeklySetlistHero } from "@/features/setlist/components/WeeklySetlistHero";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import { getPrepSetlistForWeekSunday } from "@/features/setlist/queries/getSetlists";
import type { PrepSetlistWithSheets } from "@/features/setlist/types";
import { LastWorshipVideoSection } from "@/features/team-settings/components/LastWorshipVideoSection";
import { getLatestSheetsBySongIds } from "@/features/sheets/queries/getSheets";
import type { TeamMemberRow } from "@/features/team/queries/getTeamMembers";
import { isYmdKst, nextOrSameSundayYmdKst, sundayOfKstWeekContaining, todayYmdKst } from "@/lib/date-kst";
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
    canManageSetlists = row?.role === "leader";
    teamMembers = (members ?? []) as TeamMemberRow[];
  }

  const today = todayYmdKst();
  const defaultSunday = nextOrSameSundayYmdKst(today);
  const rawSunday = isYmdKst(sp.sunday) ? sp.sunday : defaultSunday;
  const weekSundayYmd = sundayOfKstWeekContaining(rawSunday);

  const [{ setlist, error: setlistError }, dashboardData] = await Promise.all([
    getPrepSetlistForWeekSunday(weekSundayYmd),
    getPersonalDashboardData(),
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

      <PersonalDashboard data={dashboardData} />
    </div>
  );
}
