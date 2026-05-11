export const SUPABASE_AUTH_EMAIL_HOST = "gmail.com" as const;

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF\u00AD]/g;

/** 가입·로그인 입력값 공통 정리(전각·보이지 않는 문자 등). */
export function sanitizeLoginIdRawInput(raw: string): string {
  return String(raw).normalize("NFKC").replace(INVISIBLE_CHARS, "").trim();
}

/** Supabase Auth에 넣는 로컬파트(@ 앞). 가입/로그인 동일 규칙. */
export function localPartFromLoginId(raw: string): string {
  return sanitizeLoginIdRawInput(raw).split("@")[0]?.toLowerCase() ?? "";
}

export function loginIdToSupabaseEmail(raw: string): string {
  const localPart = localPartFromLoginId(raw);
  if (!localPart) {
    throw new Error("아이디를 입력해 주세요.");
  }
  return `${localPart}@${SUPABASE_AUTH_EMAIL_HOST}`;
}
