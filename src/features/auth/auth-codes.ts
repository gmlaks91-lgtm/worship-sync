import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export const AUTH_CODE_INVALID_MESSAGE =
  "인증 코드가 올바르지 않습니다. 리더에게 문의하세요.";

export async function getLatestAuthCode(): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("auth_codes").select("code").eq("id", 1).maybeSingle();
  if (error || !data?.code) return null;
  return data.code.trim();
}

export async function validateAuthCode(input: string): Promise<boolean> {
  const latest = await getLatestAuthCode();
  if (!latest) return false;
  return input.trim() === latest;
}
