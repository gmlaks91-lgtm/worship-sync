import type { ProfileRole } from "@/types/database";

import { getHomePathForRole, isGeneralRole } from "@/lib/roles";

/** 일반 멤버가 접근할 수 있는 경로(접두사 일치) */
const GENERAL_ALLOWED_PREFIXES = [
  "/journal",
  "/prayer",
  "/playlist",
  "/announcements",
  "/free-board",
  "/profile",
] as const;

/** 찬양팀 전용 경로(접두사 일치) */
const WORSHIP_TEAM_ONLY_PREFIXES = [
  "/shop",
  "/more",
  "/schedule",
  "/team",
  "/profile",
  "/points",
  "/faith",
  "/setlists",
  "/sheets",
  "/admin",
  "/board",
] as const;

export const TEAM_ONLY_QUERY_FLAG = "team_only";

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isGeneralAllowedPath(pathname: string): boolean {
  return GENERAL_ALLOWED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isWorshipTeamOnlyPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return WORSHIP_TEAM_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** general 유저가 해당 경로에 들어갈 수 있는지 */
export function canGeneralAccessPath(pathname: string): boolean {
  return isGeneralAllowedPath(pathname);
}

/** general 유저 접근 시 리다이렉트가 필요한지 */
export function getGeneralAccessRedirect(
  pathname: string,
  role: ProfileRole | null | undefined,
): string | null {
  if (!isGeneralRole(role)) return null;

  if (pathname === "/") {
    return getHomePathForRole(role);
  }

  if (!canGeneralAccessPath(pathname)) {
    const home = getHomePathForRole(role);
    const url = new URL(home, "http://local");
    url.searchParams.set(TEAM_ONLY_QUERY_FLAG, "1");
    return `${url.pathname}${url.search}`;
  }

  return null;
}
