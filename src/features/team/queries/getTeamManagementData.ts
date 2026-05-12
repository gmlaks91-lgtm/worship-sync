import "server-only";

import type { TeamRoleCode } from "@/lib/team-roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ProfileLite = {
  id: string;
  username: string;
  role: "leader" | "member";
  avatar_url: string | null;
  role_priority_1: TeamRoleCode | null;
  role_priority_2: TeamRoleCode | null;
  role_priority_3: TeamRoleCode | null;
  birthday: string | null;
  mbti: string | null;
  favorite_song: string | null;
};

export type TeamManagementMember = {
  id: string;
  username: string;
  role: "leader" | "member";
  avatar_url: string | null;
  role_priority_1: TeamRoleCode | null;
  role_priority_2: TeamRoleCode | null;
  role_priority_3: TeamRoleCode | null;
  birthday: string | null;
  mbti: string | null;
  favorite_song: string | null;
};

export type TeamManagementData = {
  isLeader: boolean;
  currentUserId: string | null;
  members: TeamManagementMember[];
  error: string | null;
};

function mapProfileToMember(p: ProfileLite): TeamManagementMember {
  return {
    id: p.id,
    username: p.username,
    role: p.role,
    avatar_url: p.avatar_url,
    role_priority_1: p.role_priority_1,
    role_priority_2: p.role_priority_2,
    role_priority_3: p.role_priority_3,
    birthday: p.birthday,
    mbti: p.mbti,
    favorite_song: p.favorite_song,
  };
}

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
    .select(
      "id, username, role, avatar_url, role_priority_1, role_priority_2, role_priority_3, birthday, mbti, favorite_song",
    )
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  if (profilesError) {
    return { isLeader, currentUserId: user.id, members: [], error: profilesError.message };
  }

  const profileRows = (profiles ?? []) as ProfileLite[];
  const profileById = new Map(profileRows.map((p) => [p.id, p]));

  if (!isLeader) {
    return {
      isLeader,
      currentUserId: user.id,
      members: profileRows.map(mapProfileToMember),
      error: null,
    };
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
      if (p) {
        return mapProfileToMember(p);
      }
      return {
        id: authUser.id,
        username: authUser.user_metadata?.username?.toString() ?? "이름 미설정",
        role: "member",
        avatar_url: null,
        role_priority_1: null,
        role_priority_2: null,
        role_priority_3: null,
        birthday: null,
        mbti: null,
        favorite_song: null,
      };
    });

    const authIds = new Set(membersFromAuth.map((m) => m.id));
    const profileOnly = profileRows.filter((p) => !authIds.has(p.id)).map(mapProfileToMember);

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
