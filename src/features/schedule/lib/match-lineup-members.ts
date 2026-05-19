import type { TeamRoleCode } from "@/lib/team-roles";
import { TEAM_ROLE_OPTIONS } from "@/lib/team-roles";

export type MemberOption = { id: string; username: string };

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function matchMemberId(name: string, members: MemberOption[]): string | null {
  const target = normalizeName(name);
  if (!target) return null;

  const exact = members.find((m) => normalizeName(m.username) === target);
  if (exact) return exact.id;

  const partial = members.find((m) => {
    const u = normalizeName(m.username);
    return u.includes(target) || target.includes(u);
  });
  return partial?.id ?? null;
}

export function mapParsedLineupToForm(
  parsed: Array<{ roleCode: TeamRoleCode; memberNames: string[] }>,
  members: MemberOption[],
): Array<{ roleCode: TeamRoleCode; memberIds: string[] }> {
  return TEAM_ROLE_OPTIONS.map((role) => {
    const row = parsed.find((p) => p.roleCode === role.code);
    const names = row?.memberNames ?? [];
    const memberIds = names
      .map((name) => matchMemberId(name, members))
      .filter((id): id is string => Boolean(id));
    return { roleCode: role.code, memberIds: [...new Set(memberIds)] };
  });
}

export function collectUnmatchedMemberNames(
  parsed: Array<{ roleCode: TeamRoleCode; memberNames: string[] }>,
  members: MemberOption[],
): string[] {
  const unmatched = new Set<string>();
  for (const row of parsed) {
    for (const name of row.memberNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      if (!matchMemberId(trimmed, members)) unmatched.add(trimmed);
    }
  }
  return [...unmatched];
}
