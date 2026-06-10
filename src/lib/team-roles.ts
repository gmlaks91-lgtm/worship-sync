export type TeamRoleCode = "L" | "M" | "S" | "D" | "A/G" | "B/G" | "E/G" | "V" | "STAFF";

export type TeamRoleOption = {
  code: TeamRoleCode;
  label: string;
};

export const TEAM_ROLE_OPTIONS: TeamRoleOption[] = [
  { code: "L", label: "L · 리더" },
  { code: "M", label: "M · 메인 건반" },
  { code: "S", label: "S · 세컨 건반" },
  { code: "D", label: "D · 드럼" },
  { code: "A/G", label: "A/G · 어쿠스틱 기타" },
  { code: "B/G", label: "B/G · 베이스 기타" },
  { code: "E/G", label: "E/G · 일렉 기타" },
  { code: "V", label: "V · 보컬" },
  { code: "STAFF", label: "STAFF · 스텝" },
];

export const TEAM_ROLE_CODE_SET = new Set<TeamRoleCode>(TEAM_ROLE_OPTIONS.map((r) => r.code));
export const MULTI_MEMBER_ROLE_CODES: TeamRoleCode[] = ["V", "STAFF"];

export function isMultiMemberRole(code: TeamRoleCode) {
  return MULTI_MEMBER_ROLE_CODES.includes(code);
}

export function teamRoleLabel(code: TeamRoleCode | null | undefined) {
  if (!code) return "미정";
  return TEAM_ROLE_OPTIONS.find((r) => r.code === code)?.label ?? code;
}
