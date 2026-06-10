"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TEAM_ROLE_CODE_SET } from "@/lib/team-roles";
import type { TeamRoleCode } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type ProfileActionResult = { ok: true } | { ok: false; message: string };

const usernameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력하세요.")
  .max(80, "이름은 80자 이내로 해 주세요.");

const profileUpdateSchema = z.object({
  username: usernameSchema,
  rolePriority1: z.string().nullable().optional(),
  rolePriority2: z.string().nullable().optional(),
  rolePriority3: z.string().nullable().optional(),
});

function sanitizeRole(value: string | null | undefined): TeamRoleCode | null {
  if (!value) return null;
  return TEAM_ROLE_CODE_SET.has(value as TeamRoleCode) ? (value as TeamRoleCode) : null;
}

export async function updateProfile(raw: {
  username: string;
  rolePriority1?: string | null;
  rolePriority2?: string | null;
  rolePriority3?: string | null;
}): Promise<ProfileActionResult> {
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const role1 = sanitizeRole(parsed.data.rolePriority1);
    const role2 = sanitizeRole(parsed.data.rolePriority2);
    const role3 = sanitizeRole(parsed.data.rolePriority3);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: parsed.data.username,
        role_priority_1: role1,
        role_priority_2: role2,
        role_priority_3: role3,
      })
      .eq("id", user.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/profile");
    revalidatePath("/more");
    revalidatePath("/team");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function updateAvatar(formData: FormData): Promise<ProfileActionResult> {
  void formData;
  return { ok: false, message: "프로필 사진 직접 업로드는 비활성화되었습니다. 상점 아이템을 장착해 변경해 주세요." };
}

