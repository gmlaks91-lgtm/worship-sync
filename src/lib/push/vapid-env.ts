const DEFAULT_VAPID_SUBJECT = "mailto:관리자이메일@test.com";

/** .env 값의 앞뒤 공백·따옴표 제거 */
export function readEnvValue(name: string): string | undefined {
  const raw = process.env[name];
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

export function getVapidPublicKeyFromEnv(): string | null {
  return readEnvValue("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ?? null;
}

export function getVapidPrivateKeyFromEnv(): string | null {
  return readEnvValue("VAPID_PRIVATE_KEY") ?? null;
}

/** web-push는 subject가 mailto: 또는 https:// URI여야 함 */
export function normalizeVapidSubject(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_VAPID_SUBJECT;
  if (value.startsWith("mailto:") || value.startsWith("https://")) return value;
  if (value.includes("@")) return `mailto:${value}`;
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
