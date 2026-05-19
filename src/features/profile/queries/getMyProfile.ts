import "server-only";

import { unstable_noStore } from "next/cache";

import { getFreshUserPoints } from "@/features/points/queries/getFreshUserPoints";
import type { ProfileRole, TeamRoleCode } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type MyProfileRow = {
  id: string;
  username: string;
  role: ProfileRole;
  avatar_url: string | null;
  role_priority_1: TeamRoleCode | null;
  role_priority_2: TeamRoleCode | null;
  role_priority_3: TeamRoleCode | null;
  points: number;
  active_badge: string | null;
  active_border_color: string | null;
  active_background_color: string | null;
  birthday: string | null;
  mbti: string | null;
  favorite_song: string | null;
  updated_at: string;
};

export async function getMyProfile(): Promise<{
  profile: MyProfileRow | null;
  error: string | null;
}> {
  unstable_noStore();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { profile: null, error: null };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, role, avatar_url, role_priority_1, role_priority_2, role_priority_3, points, active_badge, active_border_color, active_background_color, birthday, mbti, favorite_song, updated_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }
    if (!data) {
      return { profile: null, error: "프로필을 찾을 수 없습니다." };
    }

    const freshPoints = await getFreshUserPoints(user.id);

    return {
      profile: {
        id: data.id,
        username: data.username,
        role: data.role as ProfileRole,
        avatar_url: data.avatar_url ?? null,
        role_priority_1: (data.role_priority_1 as TeamRoleCode | null) ?? null,
        role_priority_2: (data.role_priority_2 as TeamRoleCode | null) ?? null,
        role_priority_3: (data.role_priority_3 as TeamRoleCode | null) ?? null,
        points: freshPoints.error ? (data.points ?? 0) : freshPoints.points,
        active_badge: data.active_badge ?? null,
        active_border_color: data.active_border_color ?? null,
        active_background_color: data.active_background_color ?? null,
        birthday: data.birthday ?? null,
        mbti: data.mbti ?? null,
        favorite_song: data.favorite_song ?? null,
        updated_at: data.updated_at,
      },
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { profile: null, error: message };
  }
}

