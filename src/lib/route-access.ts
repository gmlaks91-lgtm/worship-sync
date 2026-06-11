import type { ProfileRole } from "@/types/database";

import { getHomePathForRole } from "@/lib/roles";

/** 로그인 사용자가 접근할 수 있는 경로(접두사 일치) */
const ALLOWED_PREFIXES = [
  "/",
  "/journal",
  "/qt",
  "/prayer",
  "/announcements",
  "/free-board",
  "/profile",
  "/shop",
  "/points",
  "/marble",
  "/setlists",
  "/sheets",
  "/qr",
  "/more",
  "/admin",
] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** 접근 불가 경로에 대한 리다이렉트 (현재는 홈 경로만 처리) */
export function getGeneralAccessRedirect(
  pathname: string,
  role: ProfileRole | null | undefined,
): string | null {
  void role;

  if (pathname === "/login") return null;
  if (isAllowedPath(pathname)) return null;

  return getHomePathForRole(role);
}
