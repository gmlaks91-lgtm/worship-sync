"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronDown, Loader2, Plus, Users } from "lucide-react";

import { createTeam, setTeamMembership } from "@/features/teams/actions/adminTeamsActions";
import type { AdminTeamProfile, AdminTeamRow } from "@/features/teams/queries/getAdminTeamsPageData";
import { toastError, toastSuccess } from "@/lib/app-toast";
import type { ProfileRole } from "@/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TEAM_CARD_PALETTES = [
  { border: "border-sky-200/80", header: "bg-sky-50/80", badge: "bg-sky-100 text-sky-800" },
  { border: "border-rose-200/80", header: "bg-rose-50/80", badge: "bg-rose-100 text-rose-800" },
  { border: "border-violet-200/80", header: "bg-violet-50/80", badge: "bg-violet-100 text-violet-800" },
  { border: "border-amber-200/80", header: "bg-amber-50/80", badge: "bg-amber-100 text-amber-900" },
  { border: "border-emerald-200/80", header: "bg-emerald-50/80", badge: "bg-emerald-100 text-emerald-800" },
] as const;

const ROLE_LABELS: Record<ProfileRole, string> = {
  leader: "리더",
  admin: "관리자",
  member: "찬양팀",
  general: "청년부",
};

type AdminTeamsManagerProps = {
  initialTeams: AdminTeamRow[];
  profiles: AdminTeamProfile[];
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function membershipKey(teamId: string, userId: string) {
  return `${teamId}:${userId}`;
}

export function AdminTeamsManager({ initialTeams, profiles }: AdminTeamsManagerProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [membershipByTeam, setMembershipByTeam] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    initialTeams.forEach((team) => {
      map[team.id] = new Set(team.memberIds);
    });
    return map;
  });
  const [openTeamIds, setOpenTeamIds] = useState<Set<string>>(() => new Set());
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [createPending, startCreate] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((a, b) => {
        const roleOrder = (role: ProfileRole) => {
          if (role === "leader" || role === "admin") return 0;
          if (role === "member") return 1;
          return 2;
        };
        const diff = roleOrder(a.role) - roleOrder(b.role);
        if (diff !== 0) return diff;
        return a.username.localeCompare(b.username, "ko");
      }),
    [profiles],
  );

  const toggleTeamOpen = useCallback((teamId: string) => {
    setOpenTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  const isMember = useCallback(
    (teamId: string, userId: string) => membershipByTeam[teamId]?.has(userId) ?? false,
    [membershipByTeam],
  );

  const memberCount = useCallback(
    (teamId: string) => membershipByTeam[teamId]?.size ?? 0,
    [membershipByTeam],
  );

  const handleSlugChange = (value: string) => {
    setSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    );
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    startCreate(async () => {
      const res = await createTeam({ name: name.trim(), slug: slug.trim() });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      if (!res.data) {
        toastError("팀 정보를 받지 못했습니다.");
        return;
      }

      const team = res.data;
      setTeams((prev) => [...prev, { id: team.id, name: team.name, slug: team.slug, memberIds: [] }].sort((a, b) =>
        a.name.localeCompare(b.name, "ko"),
      ));
      setMembershipByTeam((prev) => ({ ...prev, [team.id]: new Set() }));
      setOpenTeamIds((prev) => new Set(prev).add(team.id));
      setName("");
      setSlug("");
      toastSuccess(`「${team.name}」 팀을 만들었습니다.`);
    });
  };

  const handleMembershipToggle = async (teamId: string, userId: string, checked: boolean) => {
    const key = membershipKey(teamId, userId);
    setPendingKey(key);

    setMembershipByTeam((prev) => {
      const next = { ...prev };
      const set = new Set(prev[teamId] ?? []);
      if (checked) {
        set.add(userId);
      } else {
        set.delete(userId);
      }
      next[teamId] = set;
      return next;
    });

    const res = await setTeamMembership({ teamId, userId, isMember: checked });
    setPendingKey(null);

    if (!res.ok) {
      setMembershipByTeam((prev) => {
        const next = { ...prev };
        const set = new Set(prev[teamId] ?? []);
        if (checked) {
          set.delete(userId);
        } else {
          set.add(userId);
        }
        next[teamId] = set;
        return next;
      });
      toastError(res.message);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Card className="surface-card overflow-hidden rounded-3xl border-sky-100/80">
        <CardHeader className="border-b border-sky-100/60 bg-gradient-to-br from-sky-50/90 to-white pb-5">
          <CardTitle className="text-lg text-slate-800">새 팀 만들기</CardTitle>
          <CardDescription>
            팀 이름과 슬러그(영어 소문자)를 입력하면 경건 일지 피드 필터에 사용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreateTeam} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="team-name">팀 이름</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 찬양팀, 희만목장"
                className="rounded-xl border-sky-100 bg-white"
                required
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-slug">슬러그</Label>
              <Input
                id="team-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="예: worship, heeman"
                className="rounded-xl border-sky-100 bg-white font-mono text-sm"
                required
                maxLength={40}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </div>
            <Button
              type="submit"
              disabled={createPending || !name.trim() || !slug.trim()}
              className="rounded-xl bg-sky-500 text-white hover:bg-sky-600"
            >
              {createPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              팀 만들기
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-sky-500" aria-hidden />
          <h2 className="text-lg font-semibold text-slate-800">팀 목록 · 멤버 배정</h2>
        </div>

        {teams.length === 0 ? (
          <Card className="surface-card rounded-3xl">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              등록된 팀이 없습니다. 위에서 첫 팀을 만들어 주세요.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {teams.map((team, index) => {
              const palette = TEAM_CARD_PALETTES[index % TEAM_CARD_PALETTES.length];
              const isOpen = openTeamIds.has(team.id);
              const count = memberCount(team.id);

              return (
                <li key={team.id}>
                  <Card className={cn("surface-card overflow-hidden rounded-3xl border", palette.border)}>
                    <button
                      type="button"
                      onClick={() => toggleTeamOpen(team.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors",
                        palette.header,
                      )}
                      aria-expanded={isOpen}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-slate-800">{team.name}</span>
                          <Badge variant="outline" className={cn("border-0 text-[11px]", palette.badge)}>
                            {count}명
                          </Badge>
                          <span className="font-mono text-xs text-slate-500">{team.slug}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          펼치면 전체 프로필 목록에서 팀원을 체크해 배정할 수 있습니다.
                        </p>
                      </div>
                      <ChevronDown
                        className={cn("size-5 shrink-0 text-slate-500 transition-transform", isOpen && "rotate-180")}
                        aria-hidden
                      />
                    </button>

                    {isOpen ? (
                      <CardContent className="border-t border-slate-100/80 pt-4">
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {sortedProfiles.map((profile) => {
                            const key = membershipKey(team.id, profile.id);
                            const checked = isMember(team.id, profile.id);
                            const loading = pendingKey === key;

                            return (
                              <li key={profile.id}>
                                <label
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
                                    checked
                                      ? "border-sky-200 bg-sky-50/70"
                                      : "border-slate-100 bg-white hover:bg-slate-50/80",
                                    loading && "pointer-events-none opacity-60",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="size-4 rounded border-slate-300 text-sky-500 focus:ring-sky-300"
                                    checked={checked}
                                    disabled={loading}
                                    onChange={(e) =>
                                      void handleMembershipToggle(team.id, profile.id, e.target.checked)
                                    }
                                  />
                                  <Avatar size="sm">
                                    <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
                                    <AvatarFallback>{initials(profile.username)}</AvatarFallback>
                                  </Avatar>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-slate-800">
                                      {profile.username}
                                    </span>
                                    <span className="text-[11px] text-slate-500">{ROLE_LABELS[profile.role]}</span>
                                  </span>
                                  {loading ? (
                                    <Loader2 className="size-4 shrink-0 animate-spin text-sky-500" aria-hidden />
                                  ) : null}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
