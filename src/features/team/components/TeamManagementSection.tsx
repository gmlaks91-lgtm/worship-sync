"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { hardDeleteMember, updateMemberRoles } from "@/features/team/actions/teamManagementActions";
import type { TeamManagementMember } from "@/features/team/queries/getTeamManagementData";
import { TEAM_ROLE_OPTIONS, teamRoleLabel } from "@/lib/team-roles";
import { toastError, toastPromise } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeamManagementSectionProps = {
  members: TeamManagementMember[];
  isLeader: boolean;
  currentUserId: string | null;
};

type DraftRoles = {
  rolePriority1: string;
  rolePriority2: string;
  rolePriority3: string;
};

function formatDate(value: string | null) {
  if (!value) return "정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "정보 없음";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function signupStatus(member: TeamManagementMember) {
  if (!member.hasProfile) return "프로필 미생성";
  if (!member.email_confirmed_at) return "가입 대기";
  return "가입 완료";
}

export function TeamManagementSection({ members, isLeader, currentUserId }: TeamManagementSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, DraftRoles>>(() => {
    const next: Record<string, DraftRoles> = {};
    for (const member of members) {
      next[member.id] = {
        rolePriority1: member.role_priority_1 ?? "",
        rolePriority2: member.role_priority_2 ?? "",
        rolePriority3: member.role_priority_3 ?? "",
      };
    }
    return next;
  });

  const counts = useMemo(() => {
    const joined = members.filter((m) => m.email_confirmed_at).length;
    const waiting = members.filter((m) => !m.email_confirmed_at).length;
    return { total: members.length, joined, waiting };
  }, [members]);

  const onRoleChange = (memberId: string, key: keyof DraftRoles, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [memberId]: {
        rolePriority1: prev[memberId]?.rolePriority1 ?? "",
        rolePriority2: prev[memberId]?.rolePriority2 ?? "",
        rolePriority3: prev[memberId]?.rolePriority3 ?? "",
        [key]: value,
      },
    }));
  };

  const onSaveRoles = (member: TeamManagementMember) => {
    const draft = drafts[member.id];
    if (!draft) return;
    startTransition(async () => {
      try {
        await toastPromise(
          updateMemberRoles({
            targetUserId: member.id,
            rolePriority1: draft.rolePriority1 || null,
            rolePriority2: draft.rolePriority2 || null,
            rolePriority3: draft.rolePriority3 || null,
          }).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "포지션을 저장하는 중입니다...",
        ).unwrap();
        router.refresh();
      } catch {
        // handled by toastPromise
      }
    });
  };

  const onDeleteMember = (member: TeamManagementMember) => {
    if (!isLeader) return;
    if (member.id === currentUserId) {
      toastError("본인 계정은 강제 퇴장할 수 없습니다.");
      return;
    }
    if (!window.confirm(`${member.username} 멤버를 영구 삭제할까요? auth 계정도 함께 삭제됩니다.`)) {
      return;
    }
    setDeleteTargetId(member.id);
    startTransition(async () => {
      try {
        await toastPromise(
          hardDeleteMember({ targetUserId: member.id }).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "멤버 계정을 영구 삭제하는 중입니다...",
        ).unwrap();
        router.refresh();
      } catch {
        // handled by toastPromise
      } finally {
        setDeleteTargetId(null);
      }
    });
  };

  return (
    <div className="space-y-5">
      {isLeader ? (
        <Card className="border-border/70 shadow-sm ring-1 ring-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">리더 관리 요약</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <p>
              <span className="text-muted-foreground">전체 멤버</span> · {counts.total}명
            </p>
            <p>
              <span className="text-muted-foreground">가입 완료</span> · {counts.joined}명
            </p>
            <p>
              <span className="text-muted-foreground">가입 대기/미완료</span> · {counts.waiting}명
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const roleText = [
            member.role_priority_1 ? teamRoleLabel(member.role_priority_1) : null,
            member.role_priority_2 ? teamRoleLabel(member.role_priority_2) : null,
            member.role_priority_3 ? teamRoleLabel(member.role_priority_3) : null,
          ]
            .filter(Boolean)
            .join(" / ");

          const draft = drafts[member.id] ?? { rolePriority1: "", rolePriority2: "", rolePriority3: "" };

          return (
            <Card key={member.id} className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{member.username}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">권한</span> · {member.role === "leader" ? "리더" : "팀원"}
                </p>
                <p>
                  <span className="text-muted-foreground">가입 현황</span> · {signupStatus(member)}
                </p>
                <p>
                  <span className="text-muted-foreground">가입일</span> · {formatDate(member.created_at)}
                </p>
                <p className="truncate">
                  <span className="text-muted-foreground">이메일</span> · {member.email ?? "정보 없음"}
                </p>
                <p>
                  <span className="text-muted-foreground">현재 포지션</span> · {roleText || "미정"}
                </p>

                {isLeader ? (
                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground">포지션 수정</p>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={draft.rolePriority1}
                      onChange={(e) => onRoleChange(member.id, "rolePriority1", e.target.value)}
                      disabled={pending}
                    >
                      <option value="">역할 1순위 없음</option>
                      {TEAM_ROLE_OPTIONS.map((role) => (
                        <option key={`p1-${role.code}`} value={role.code}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={draft.rolePriority2}
                      onChange={(e) => onRoleChange(member.id, "rolePriority2", e.target.value)}
                      disabled={pending}
                    >
                      <option value="">역할 2순위 없음</option>
                      {TEAM_ROLE_OPTIONS.map((role) => (
                        <option key={`p2-${role.code}`} value={role.code}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={draft.rolePriority3}
                      onChange={(e) => onRoleChange(member.id, "rolePriority3", e.target.value)}
                      disabled={pending}
                    >
                      <option value="">역할 3순위 없음</option>
                      {TEAM_ROLE_OPTIONS.map((role) => (
                        <option key={`p3-${role.code}`} value={role.code}>
                          {role.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2 pt-1">
                      <Button type="button" size="sm" onClick={() => onSaveRoles(member)} disabled={pending}>
                        포지션 저장
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => onDeleteMember(member)}
                        disabled={pending || deleteTargetId === member.id || member.id === currentUserId}
                      >
                        {deleteTargetId === member.id ? "삭제 중..." : "강제 퇴장"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
