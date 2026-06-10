import "server-only";

import type { ProfileRole } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type AdminTeamRow = {
  id: string;
  name: string;
  slug: string;
  memberIds: string[];
};

export type AdminTeamProfile = {
  id: string;
  username: string;
  role: ProfileRole;
  avatar_url: string | null;
};

export type AdminTeamsPageData = {
  teams: AdminTeamRow[];
  profiles: AdminTeamProfile[];
  error: string | null;
};

export async function getAdminTeamsPageData(): Promise<AdminTeamsPageData> {
  const supabase = await createClient();

  const [teamsResult, membersResult, profilesResult] = await Promise.all([
    supabase.from("teams").select("id, name, slug").order("name", { ascending: true }),
    supabase.from("team_members").select("team_id, user_id"),
    supabase
      .from("profiles")
      .select("id, username, role, avatar_url")
      .order("role", { ascending: true })
      .order("username", { ascending: true }),
  ]);

  if (teamsResult.error) {
    return { teams: [], profiles: [], error: teamsResult.error.message };
  }
  if (membersResult.error) {
    return { teams: [], profiles: [], error: membersResult.error.message };
  }
  if (profilesResult.error) {
    return { teams: [], profiles: [], error: profilesResult.error.message };
  }

  const membersByTeam = new Map<string, string[]>();
  (membersResult.data ?? []).forEach((row) => {
    if (!row.team_id || !row.user_id) return;
    const list = membersByTeam.get(row.team_id) ?? [];
    list.push(row.user_id);
    membersByTeam.set(row.team_id, list);
  });

  const teams: AdminTeamRow[] = (teamsResult.data ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    memberIds: membersByTeam.get(team.id) ?? [],
  }));

  const profiles: AdminTeamProfile[] = (profilesResult.data ?? [])
    .filter((profile): profile is AdminTeamProfile => Boolean(profile?.id))
    .map((profile) => ({
      id: profile.id,
      username: profile.username,
      role: profile.role,
      avatar_url: profile.avatar_url,
    }));

  return { teams, profiles, error: null };
}
