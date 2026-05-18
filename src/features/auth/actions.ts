"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AUTH_CODE_INVALID_MESSAGE, validateAuthCode } from "@/features/auth/auth-codes";
import { loginIdToSupabaseEmail } from "@/features/auth/login-id-email";
import { awardPointsForEvent } from "@/features/points/server/awardPoints";
import type { ProfileRole } from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type SignupMembershipType = "worship_team" | "youth";

export async function signInWithIdAction(input: { loginId: string; password: string }) {
  const supabase = await createClient();

  const email = loginIdToSupabaseEmail(input.loginId);
  console.log("로그인 시도 이메일:", email);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) return { error: error.message, awardedPoints: 0 };

  const reward = await awardPointsForEvent({
    eventType: "daily_login",
    points: 10,
    oncePerDay: true,
  });

  return { error: null, awardedPoints: reward.awardedPoints };
}

export async function signUpWithIdAction(input: {
  loginId: string;
  password: string;
  username: string;
  membershipType: SignupMembershipType;
  authCode?: string;
  rolePriority1?: string;
  rolePriority2?: string;
  rolePriority3?: string;
}) {
  const supabase = await createClient();
  const email = loginIdToSupabaseEmail(input.loginId);

  let profileRole: ProfileRole = "general";

  if (input.membershipType === "worship_team") {
    const code = input.authCode?.trim() ?? "";
    if (!code) {
      return { error: "인증 코드를 입력해 주세요." };
    }
    const valid = await validateAuthCode(code);
    if (!valid) {
      return { error: AUTH_CODE_INVALID_MESSAGE };
    }
    if (!input.rolePriority1?.trim()) {
      return { error: "역할 1순위를 선택해 주세요." };
    }
    profileRole = "member";
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username: input.username.trim(),
        profile_role: profileRole,
        role_priority_1: input.membershipType === "worship_team" ? input.rolePriority1?.trim() : null,
        role_priority_2:
          input.membershipType === "worship_team" ? input.rolePriority2?.trim() || null : null,
        role_priority_3:
          input.membershipType === "worship_team" ? input.rolePriority3?.trim() || null : null,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("database error")) {
      return {
        error:
          "회원가입 처리 중 DB 오류가 발생했습니다. Supabase에 최신 마이그레이션(20260519140000_fix_signup_profile_trigger)이 적용되었는지 확인해 주세요.",
      };
    }
    return { error: error.message };
  }

  const userId = signUpData.user?.id;
  if (userId) {
    try {
      const admin = createAdminClient();
      await admin.from("profiles").upsert(
        {
          id: userId,
          username: input.username.trim().slice(0, 80),
          role: profileRole,
          role_priority_1:
            input.membershipType === "worship_team" ? input.rolePriority1?.trim() || null : null,
          role_priority_2:
            input.membershipType === "worship_team" ? input.rolePriority2?.trim() || null : null,
          role_priority_3:
            input.membershipType === "worship_team" ? input.rolePriority3?.trim() || null : null,
        },
        { onConflict: "id" },
      );
    } catch {
      // 트리거가 정상 동작하면 upsert는 no-op. SERVICE_ROLE_KEY 미설정 시 무시.
    }
  }

  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
