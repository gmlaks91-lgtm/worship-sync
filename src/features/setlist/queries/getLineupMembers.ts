import "server-only";

import type { TeamRoleCode } from "@/lib/team-roles";
import { createClient } from "@/utils/supabase/server";

export type LineupMemberRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: "leader" | "admin" | "member" | "general";
  created_at: string;
  role_priority_1: TeamRoleCode | null;
  role_priority_2: TeamRoleCode | null;
  role_priority_3: TeamRoleCode | null;
  birthday: string | null;
  mbti: string | null;
  favorite_song: string | null;
};

export async function getLineupMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, role, created_at, role_priority_1, role_priority_2, role_priority_3, birthday, mbti, favorite_song",
    )
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  if (error) {
    return { members: [] as LineupMemberRow[], error: error.message };
  }

  return { members: (data ?? []) as LineupMemberRow[], error: null as string | null };
}
