import "server-only";

import type { TeamRoleCode } from "@/lib/team-roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ProfileLite = {
  id: string;
  username: string;
  role: "leader" | "member";
  avatar_url: string | null;
  created_at: string;
  role_priority_1: TeamRoleCode | null;
  role_priority_2: TeamRoleCode | null;
  role_priority_3: TeamRoleCode | null;
};

export type TeamManagementMember = {
  id: string;
  email: string | null;
  username: string;
  role: "leader" | "member";
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  role_priority_1: TeamRoleCode | null;
  role_priority_2: TeamRoleCode | null;
  role_priority_3: TeamRoleCode | null;
  hasProfile: boolean;
};

export type TeamManagementData = {
  isLeader: boolean;
  currentUserId: string | null;
  members: TeamManagementMember[];
  error: string | null;
};

export async function getTeamManagementData(): Promise<TeamManagementData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isLeader: false, currentUserId: null, members: [], error: "로그인이 필요합니다." };
  }

  const { data: myProfile, error: myProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (myProfileError) {
    return { isLeader: false, currentUserId: user.id, members: [], error: myProfileError.message };
  }

  const isLeader = myProfile?.role === "leader";

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, role, avatar_url, created_at, role_priority_1, role_priority_2, role_priority_3")
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  if (profilesError) {
    return { isLeader, currentUserId: user.id, members: [], error: profilesError.message };
  }

  const profileRows = (profiles ?? []) as ProfileLite[];
  const profileById = new Map(profileRows.map((p) => [p.id, p]));

  if (!isLeader) {
    const members: TeamManagementMember[] = profileRows.map((p) => ({
      id: p.id,
      email: null,
      username: p.username,
      role: p.role,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      last_sign_in_at: null,
      email_confirmed_at: null,
      role_priority_1: p.role_priority_1,
      role_priority_2: p.role_priority_2,
      role_priority_3: p.role_priority_3,
      hasProfile: true,
    }));
    return { isLeader, currentUserId: user.id, members, error: null };
  }

  try {
    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      return { isLeader, currentUserId: user.id, members: [], error: authError.message };
    }

    const membersFromAuth: TeamManagementMember[] = (authData.users ?? []).map((authUser) => {
      const p = profileById.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email ?? null,
        username: p?.username ?? authUser.user_metadata?.username?.toString() ?? "이름 미설정",
        role: p?.role ?? "member",
        avatar_url: p?.avatar_url ?? null,
        created_at: p?.created_at ?? authUser.created_at ?? new Date(0).toISOString(),
        last_sign_in_at: authUser.last_sign_in_at ?? null,
        email_confirmed_at: authUser.email_confirmed_at ?? null,
        role_priority_1: p?.role_priority_1 ?? null,
        role_priority_2: p?.role_priority_2 ?? null,
        role_priority_3: p?.role_priority_3 ?? null,
        hasProfile: Boolean(p),
      };
    });

    const authIds = new Set(membersFromAuth.map((m) => m.id));
    const profileOnly = profileRows
      .filter((p) => !authIds.has(p.id))
      .map<TeamManagementMember>((p) => ({
        id: p.id,
        email: null,
        username: p.username,
        role: p.role,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        last_sign_in_at: null,
        email_confirmed_at: null,
        role_priority_1: p.role_priority_1,
        role_priority_2: p.role_priority_2,
        role_priority_3: p.role_priority_3,
        hasProfile: true,
      }));

    const members = [...membersFromAuth, ...profileOnly].sort((a, b) => {
      if (a.role !== b.role) return a.role === "leader" ? -1 : 1;
      return a.username.localeCompare(b.username, "ko");
    });

    return { isLeader, currentUserId: user.id, members, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "팀 관리 데이터를 불러오지 못했습니다.";
    return { isLeader, currentUserId: user.id, members: [], error: message };
  }
}
