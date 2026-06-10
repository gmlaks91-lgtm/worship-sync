import "server-only";

import type { JournalTeamFilter } from "@/features/teams/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AppSupabase = SupabaseClient<Database>;

export async function resolveTeamPeerUserIds(
  supabase: AppSupabase,
  userId: string,
  teamFilter: JournalTeamFilter,
): Promise<string[]> {
  const { data: myMemberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId);

  if (membershipError || !myMemberships?.length) {
    return [];
  }

  const myTeamIds = [...new Set(myMemberships.map((row) => row.team_id).filter(Boolean))];
  if (myTeamIds.length === 0) {
    return [];
  }

  const targetTeamIds =
    teamFilter === "all"
      ? myTeamIds
      : myTeamIds.includes(teamFilter)
        ? [teamFilter]
        : [];

  if (targetTeamIds.length === 0) {
    return [];
  }

  const { data: peers, error: peersError } = await supabase
    .from("team_members")
    .select("user_id")
    .in("team_id", targetTeamIds);

  if (peersError || !peers?.length) {
    return [];
  }

  return [
    ...new Set(
      peers
        .map((row) => row.user_id)
        .filter((peerId): peerId is string => Boolean(peerId && peerId !== userId)),
    ),
  ];
}
