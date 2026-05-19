"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "슬러그는 2자 이상이어야 합니다.")
  .max(40, "슬러그는 40자 이하여야 합니다.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "슬러그는 영어 소문자·숫자·하이픈(-)만 사용할 수 있습니다.");

const createTeamSchema = z.object({
  name: z.string().trim().min(1, "팀 이름을 입력해 주세요.").max(60, "팀 이름은 60자 이하여야 합니다."),
  slug: slugSchema,
});

const setMembershipSchema = z.object({
  teamId: z.string().uuid("유효한 팀 ID가 아닙니다."),
  userId: z.string().uuid("유효한 사용자 ID가 아닙니다."),
  isMember: z.boolean(),
});

export type CreatedTeam = {
  id: string;
  name: string;
  slug: string;
};

function revalidateTeamRoutes() {
  revalidatePath("/admin/teams");
  revalidatePath("/journal");
}

export async function createTeam(raw: z.infer<typeof createTeamSchema>): Promise<ActionResult<CreatedTeam>> {
  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: leader.message };
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({ name: parsed.data.name, slug: parsed.data.slug })
      .select("id, name, slug")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "이미 사용 중인 팀 이름 또는 슬러그입니다." };
      }
      return { ok: false, message: error.message };
    }

    revalidateTeamRoutes();
    return { ok: true, data: data as CreatedTeam };
  } catch (e) {
    const message = e instanceof Error ? e.message : "팀 생성 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function setTeamMembership(
  raw: z.infer<typeof setMembershipSchema>,
): Promise<ActionResult> {
  const parsed = setMembershipSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: leader.message };
    }

    const { teamId, userId, isMember } = parsed.data;

    if (isMember) {
      const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
      if (error) {
        if (error.code === "23505") {
          revalidateTeamRoutes();
          return { ok: true };
        }
        return { ok: false, message: error.message };
      }
    } else {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) {
        return { ok: false, message: error.message };
      }
    }

    revalidateTeamRoutes();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "팀원 배정 변경 중 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
