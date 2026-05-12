import "server-only";

import { getSetlists, type PrepSetlistRow } from "@/features/setlist/queries/getSetlists";
import { getRecentSheetsForDashboard } from "@/features/sheets/queries/getSheets";
import { youtubePlaylistEmbedUrl } from "@/features/team-settings/lib/youtube-playlist";
import { extractYouTubeVideoId, youtubeVideoEmbedUrl } from "@/features/team-settings/lib/youtube-video";
import type { ScheduleAttendanceStatus, ScheduleKind } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type DashboardScheduleRow = {
  id: string;
  title: string;
  kind: ScheduleKind;
  starts_at: string;
};

export type PersonalDashboardData = {
  upcomingWithMine: Array<{
    schedule: DashboardScheduleRow;
    myStatus: ScheduleAttendanceStatus | null;
  }>;
  recentSetlists: PrepSetlistRow[];
  recentSheets: Awaited<ReturnType<typeof getRecentSheetsForDashboard>>;
  lastWorshipVideoUrl: string | null;
  lastWorshipVideoEmbedUrl: string | null;
  teamPlaylistId: string | null;
  teamPlaylistEmbedUrl: string | null;
  canManageTeamPlaylist: boolean;
  errors: string[];
};

export async function getPersonalDashboardData(): Promise<PersonalDashboardData> {
  const errors: string[] = [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canManageTeamPlaylist = false;

  const nowIso = new Date().toISOString();

  const [{ setlists, error: setlistErr }, sheets] = await Promise.all([
    getSetlists({ limit: 3 }),
    getRecentSheetsForDashboard(5),
  ]);

  if (setlistErr) errors.push(setlistErr);
  let teamPlaylistId: string | null = null;
  let lastWorshipVideoUrl: string | null = null;

  if (user) {
    const [{ data: profile, error: profileError }, { data: teamSettings, error: settingsError }] =
      await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("team_settings")
          .select("playlist_id, last_worship_video_url")
          .eq("id", true)
          .maybeSingle(),
      ]);

    if (profileError) errors.push(profileError.message);
    if (settingsError) errors.push(settingsError.message);

    canManageTeamPlaylist = profile?.role === "leader" || profile?.role === "admin";
    teamPlaylistId = teamSettings?.playlist_id ?? null;
    lastWorshipVideoUrl = teamSettings?.last_worship_video_url ?? null;
  }

  let upcomingWithMine: PersonalDashboardData["upcomingWithMine"] = [];

  if (user) {
    const { data: schedRaw, error: sErr } = await supabase
      .from("schedules")
      .select("id, title, kind, starts_at")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(8);

    if (sErr) {
      errors.push(sErr.message);
    } else {
      const schedules = (schedRaw ?? []) as DashboardScheduleRow[];
      const ids = schedules.map((s) => s.id);

      let mineMap = new Map<string, ScheduleAttendanceStatus>();
      if (ids.length > 0) {
        const { data: mineRaw, error: mErr } = await supabase
          .from("attendances")
          .select("schedule_id, status")
          .eq("user_id", user.id)
          .in("schedule_id", ids);

        if (mErr) {
          errors.push(mErr.message);
        } else {
          mineMap = new Map(
            (mineRaw ?? []).map((r) => [r.schedule_id, r.status as ScheduleAttendanceStatus]),
          );
        }
      }

      upcomingWithMine = schedules.map((schedule) => ({
        schedule,
        myStatus: mineMap.get(schedule.id) ?? null,
      }));
    }
  }

  return {
    upcomingWithMine,
    recentSetlists: setlists,
    recentSheets: sheets,
    lastWorshipVideoUrl,
    lastWorshipVideoEmbedUrl: lastWorshipVideoUrl
      ? (() => {
          const id = extractYouTubeVideoId(lastWorshipVideoUrl);
          return id ? youtubeVideoEmbedUrl(id) : null;
        })()
      : null,
    teamPlaylistId,
    teamPlaylistEmbedUrl: teamPlaylistId ? youtubePlaylistEmbedUrl(teamPlaylistId) : null,
    canManageTeamPlaylist,
    errors,
  };
}
