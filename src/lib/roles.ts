import type { ProfileRole } from "@/types/database";

/** 찬양팀(리더·관리자·팀원) 권한 */
export function isWorshipTeamRole(role: ProfileRole | null | undefined): boolean {
  return role === "leader" || role === "admin" || role === "member";
}

/** 일반 청년부원 권한 */
export function isGeneralRole(role: ProfileRole | null | undefined): boolean {
  return role === "general";
}

/** 역할별 기본 홈 경로 */
export function getHomePathForRole(role: ProfileRole | null | undefined): string {
  return isGeneralRole(role) ? "/journal" : "/";
}

export function roleLabel(role: ProfileRole): string {
  if (role === "leader") return "리더";
  if (role === "admin") return "관리자";
  if (role === "general") return "일반 멤버";
  return "찬양팀";
}
