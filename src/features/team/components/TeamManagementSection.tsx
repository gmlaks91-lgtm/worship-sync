"use client";

import { Cake, Heart, Music2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { hardDeleteMember, updateMemberRoles } from "@/features/team/actions/teamManagementActions";
import type { TeamManagementMember } from "@/features/team/queries/getTeamManagementData";
import { parseKstYmdAtNoon } from "@/lib/date-kst";
import { TEAM_ROLE_OPTIONS, teamRoleLabel } from "@/lib/team-roles";
import { toastError, toastPromise } from "@/lib/app-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 2);
}

function birthdayLabel(ymd: string | null): string {
  if (!ymd) return "아직 비밀이에요";
  const head = ymd.slice(0, 10);
  try {
    const d = parseKstYmdAtNoon(head);
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "아직 비밀이에요";
  }
}

function softLine(label: string, value: string, Icon: typeof Cake) {
  const empty = value === "아직 비밀이에요" || value === "적어 주면 좋아요";
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("text-sm font-medium leading-snug text-foreground", empty && "text-muted-foreground")}>{value}</p>
        </div>
      </div>
    </div>
  );
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

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role !== b.role) return a.role === "leader" ? -1 : 1;
        return a.username.localeCompare(b.username, "ko");
      }),
    [members],
  );

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
    <div className="space-y-6">
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
          내 프로필 꾸미기
        </Link>
        에서 생일·MBTI·좋아하는 곡을 입력하면 아래 카드가 채워져요.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sortedMembers.map((member) => {
          const roleText = [
            member.role_priority_1 ? teamRoleLabel(member.role_priority_1) : null,
            member.role_priority_2 ? teamRoleLabel(member.role_priority_2) : null,
            member.role_priority_3 ? teamRoleLabel(member.role_priority_3) : null,
          ]
            .filter(Boolean)
            .join(" · ");

          const draft = drafts[member.id] ?? { rolePriority1: "", rolePriority2: "", rolePriority3: "" };
          const mbtiLine = member.mbti?.trim() || "적어 주면 좋아요";
          const songLine = member.favorite_song?.trim() || "적어 주면 좋아요";

          return (
            <Card key={member.id} className="overflow-hidden border-border/70">
              <CardContent className="space-y-4 p-5 pt-5">
                <div className="flex items-start gap-3">
                  <Avatar className="size-14 shrink-0 border border-border/60">
                    {member.avatar_url ? <AvatarImage src={member.avatar_url} alt="" className="object-cover" /> : null}
                    <AvatarFallback className="text-sm font-semibold">{initials(member.username)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-base font-semibold tracking-tight text-foreground">{member.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role === "leader" ? "리더" : "팀원"}
                      {roleText ? (
                        <>
                          <span className="mx-1 text-border">·</span>
                          {roleText}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {softLine("생일", birthdayLabel(member.birthday), Cake)}
                  {softLine("MBTI", mbtiLine, Heart)}
                  {softLine("가장 좋아하는 곡", songLine, Music2)}
                </div>

                {isLeader ? (
                  <div className="space-y-2 border-t border-border/50 pt-4">
                    <p className="text-xs font-medium text-muted-foreground">포지션 (리더만 수정)</p>
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

                    <div className="flex flex-wrap gap-2 pt-1">
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
