"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TEAM_ROLE_CODE_SET } from "@/lib/team-roles";
import type { TeamRoleCode } from "@/types/database";
import { requireLeader } from "@/lib/require-leader";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };

const roleValueSchema = z.string().nullable().optional();
const updateMemberRolesSchema = z.object({
  targetUserId: z.string().uuid("유효한 사용자 ID가 아닙니다."),
  rolePriority1: roleValueSchema,
  rolePriority2: roleValueSchema,
  rolePriority3: roleValueSchema,
});
const deleteMemberSchema = z.object({
  targetUserId: z.string().uuid("유효한 사용자 ID가 아닙니다."),
});

function sanitizeRole(value: string | null | undefined): TeamRoleCode | null {
  if (!value) return null;
  return TEAM_ROLE_CODE_SET.has(value as TeamRoleCode) ? (value as TeamRoleCode) : null;
}

export async function updateMemberRoles(raw: z.infer<typeof updateMemberRolesSchema>): Promise<ActionResult> {
  const parsed = updateMemberRolesSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: leader.message };
    }

    const payload = {
      role_priority_1: sanitizeRole(parsed.data.rolePriority1),
      role_priority_2: sanitizeRole(parsed.data.rolePriority2),
      role_priority_3: sanitizeRole(parsed.data.rolePriority3),
    };

    const { error } = await supabase.from("profiles").update(payload).eq("id", parsed.data.targetUserId);
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/team");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "멤버 포지션 수정 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function hardDeleteMember(raw: z.infer<typeof deleteMemberSchema>): Promise<ActionResult> {
  const parsed = deleteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: leader.message };
    }

    if (leader.userId === parsed.data.targetUserId) {
      return { ok: false, message: "본인 계정은 강제 퇴장할 수 없습니다." };
    }

    const admin = createAdminClient();
    const userId = parsed.data.targetUserId;

    const deleteOps: Array<Promise<unknown>> = [
      admin.from("setlist_lineups").delete().eq("member_id", userId),
      admin.from("attendance").delete().eq("user_id", userId),
      admin.from("attendances").delete().eq("user_id", userId),
      admin.from("faith_checks").delete().eq("user_id", userId),
      admin.from("user_inventory").delete().eq("user_id", userId),
      admin.from("prayer_reactions").delete().eq("user_id", userId),
      admin.from("prayer_requests").delete().eq("user_id", userId),
      admin.from("comments").delete().eq("user_id", userId),
      admin.from("posts").delete().eq("user_id", userId),
      admin.from("profiles").delete().eq("id", userId),
      admin.from("team_settings").update({ updated_by: null }).eq("updated_by", userId),
    ];
    await Promise.allSettled(deleteOps);

    const { data: avatarObjects } = await admin.storage.from("avatars").list(userId);
    const avatarPaths = avatarObjects?.map((item) => `${userId}/${item.name}`) ?? [];
    if (avatarPaths.length > 0) {
      await admin.storage.from("avatars").remove(avatarPaths);
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId, false);
    if (deleteAuthError && !deleteAuthError.message.toLowerCase().includes("not found")) {
      return { ok: false, message: deleteAuthError.message };
    }

    revalidatePath("/team");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "멤버 강제 퇴장 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
