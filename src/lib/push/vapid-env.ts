const DEFAULT_VAPID_SUBJECT = "mailto:관리자이메일@test.com";

/** .env 값의 앞뒤 공백·따옴표 제거 */
function cleanEnvValue(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;

  let value = raw.trim();
  if (!value) return undefined;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value || undefined;
}

/**
 * 중요: NEXT_PUBLIC_* 변수는 반드시 정적 멤버 표현식
 * (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)으로 읽어야 합니다.
 * process.env[name] 같은 동적 접근은 Next.js가 클라이언트 번들에 인라인하지
 * 못해 브라우저에서 항상 undefined가 됩니다.
 */
export function getVapidPublicKeyFromEnv(): string | null {
  return cleanEnvValue(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ?? null;
}

/** 서버 전용 (클라이언트 번들에는 포함되지 않음) */
export function getVapidPrivateKeyFromEnv(): string | null {
  return cleanEnvValue(process.env.VAPID_PRIVATE_KEY) ?? null;
}

/** 서버 전용 */
export function getVapidSubjectFromEnv(): string | undefined {
  return cleanEnvValue(process.env.VAPID_SUBJECT);
}

/** web-push는 subject가 mailto: 또는 https:// URI여야 함 */
export function normalizeVapidSubject(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_VAPID_SUBJECT;
  if (value.startsWith("mailto:") || value.startsWith("https://")) return value;
  return `mailto:${value}`;
}

export function describeMissingVapidEnv(): string | null {
  const publicKey = getVapidPublicKeyFromEnv();
  const privateKey = getVapidPrivateKeyFromEnv();

  if (!publicKey && !privateKey) {
    return "NEXT_PUBLIC_VAPID_PUBLIC_KEY와 VAPID_PRIVATE_KEY가 설정되지 않았습니다. (.env.local 또는 배포 환경 변수 확인)";
  }
  if (!publicKey) {
    return "NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되지 않았습니다.";
  }
  if (!privateKey) {
    return "VAPID_PRIVATE_KEY가 설정되지 않았습니다. (서버 전용 — Vercel/배포 환경 변수에 추가 필요)";
  }
  return null;
}
