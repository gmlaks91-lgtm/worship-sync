import type { ProfileRole } from "@/types/database";

/** 리더·관리자 권한 (송리스트 관리 등) */
export function isLeaderRole(role: ProfileRole | null | undefined): boolean {
  return role === "leader" || role === "admin";
}

/** @deprecated use isLeaderRole */
export function isWorshipTeamRole(role: ProfileRole | null | undefined): boolean {
  return role === "leader" || role === "admin" || role === "member";
}

/** 일반 청년부원 권한 */
export function isGeneralRole(role: ProfileRole | null | undefined): boolean {
  return role === "general";
}

/** 역할별 기본 홈 경로 */
export function getHomePathForRole(_role: ProfileRole | null | undefined): string {
  return "/";
}

export function roleLabel(role: ProfileRole): string {
  if (role === "leader") return "리더";
  if (role === "admin") return "관리자";
  if (role === "general") return "일반 멤버";
  return "멤버";
}
