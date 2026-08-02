"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loginIdToSupabaseEmail, sanitizeLoginIdRawInput } from "@/features/auth/login-id-email";
import { awardPointsForEvent } from "@/features/points/server/awardPoints";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function safeInternalPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function loginRedirectWithError(message: string, next: string) {
  const params = new URLSearchParams({
    error: message,
    next,
  });
  redirect(`/login?${params.toString()}`);
}

export async function signInWithFormAction(formData: FormData) {
  const loginId = sanitizeLoginIdRawInput(String(formData.get("loginId") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeInternalPath(String(formData.get("next") ?? "/"));

  if (!loginId) {
    loginRedirectWithError("아이디를 입력해 주세요.", next);
  }
  if (password.length < 6) {
    loginRedirectWithError("비밀번호는 6자 이상이어야 합니다.", next);
  }

  const { error, awardedPoints } = await signInWithIdAction({ loginId, password });
  if (error) {
    loginRedirectWithError(error, next);
  }

  if (awardedPoints > 0) {
    const url = new URL(next, "http://local");
    url.searchParams.set("login_reward", String(awardedPoints));
    redirect(`${url.pathname}${url.search}`);
  }

  redirect(next);
}

export async function signUpWithFormAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const loginId = sanitizeLoginIdRawInput(String(formData.get("loginId") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!username) {
    loginRedirectWithError("이름을 입력해 주세요.", "/");
  }
  if (!loginId) {
    loginRedirectWithError("아이디를 입력해 주세요.", "/");
  }
  if (password.length < 6) {
    loginRedirectWithError("비밀번호는 6자 이상이어야 합니다.", "/");
  }
  if (password !== confirm) {
    loginRedirectWithError("비밀번호가 일치하지 않습니다.", "/");
  }

  const { error } = await signUpWithIdAction({ loginId, password, username });
  if (error) {
    loginRedirectWithError(error, "/");
  }

  redirect("/login?signup=1");
}

export async function signInWithIdAction(input: { loginId: string; password: string }) {
  const supabase = await createClient();

  const email = loginIdToSupabaseEmail(input.loginId);
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
}) {
  const supabase = await createClient();
  const email = loginIdToSupabaseEmail(input.loginId);

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username: input.username.trim(),
        profile_role: "general",
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("database error")) {
      return {
        error:
          "회원가입 처리 중 DB 오류가 발생했습니다. Supabase에 최신 마이그레이션이 적용되었는지 확인해 주세요.",
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
          role: "general",
        },
        { onConflict: "id" },
      );
    } catch {
      // 트리거가 정상 동작하면 upsert는 no-op. SERVICE_ROLE_KEY 미설정 시 무시.
    }
  }

  return { error: null };
}

export type PasswordActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<PasswordActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });

  if (signInError) {
    return { ok: false, message: "현재 비밀번호가 올바르지 않습니다." };
  }

  const { error } = await supabase.auth.updateUser({ password: input.newPassword });
  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/more");
  revalidatePath("/profile");
  return { ok: true, message: "비밀번호가 변경되었습니다." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
