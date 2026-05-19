import "server-only";

import type { UserTeam } from "@/features/teams/types";
import { createClient } from "@/utils/supabase/server";

export async function getUserTeamsForCurrentUser(): Promise<UserTeam[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (membershipError || !memberships?.length) {
    return [];
  }

  const teamIds = [...new Set(memberships.map((row) => row.team_id).filter(Boolean))];
  if (teamIds.length === 0) {
    return [];
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, slug")
    .in("id", teamIds)
    .order("name", { ascending: true });

  if (teamsError || !teams) {
    return [];
  }

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
  }));
}
