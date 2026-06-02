"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { usePoints } from "@/features/points/components/PointsProvider";
import { ChangePasswordForm } from "@/features/profile/components/ChangePasswordForm";
import { updateProfile } from "@/features/profile/actions/profileActions";
import type { MyProfileRow } from "@/features/profile/queries/getMyProfile";
import { roleLabel } from "@/lib/roles";
import { TEAM_ROLE_OPTIONS, teamRoleLabel } from "@/lib/team-roles";
import { toastError, toastPromise } from "@/lib/app-toast";
import { LayeredProfileAvatar } from "@/components/profile/layered-profile-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatRolePriorities(...roles: Array<string | null | undefined>) {
  return roles
    .map((role) => (role ? teamRoleLabel(role as Parameters<typeof teamRoleLabel>[0]) : null))
    .filter(Boolean)
    .join(" / ");
}

export function ProfileSettings({ profile }: { profile: MyProfileRow }) {
  const router = useRouter();
  const { points } = usePoints();
  const [openEdit, setOpenEdit] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [role1, setRole1] = useState(profile.role_priority_1 ?? "");
  const [role2, setRole2] = useState(profile.role_priority_2 ?? "");
  const [role3, setRole3] = useState(profile.role_priority_3 ?? "");
  const [pendingSave, startSaveTransition] = useTransition();
  const roleText = formatRolePriorities(profile.role_priority_1, profile.role_priority_2, profile.role_priority_3);

  const onSaveProfile = () => {
    const next = username.trim();
    if (!next) return toastError("이름을 입력해 주세요.");

    startSaveTransition(async () => {
      try {
        await toastPromise(
          updateProfile({ username: next, rolePriority1: role1 || null, rolePriority2: role2 || null, rolePriority3: role3 || null }).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "프로필을 저장하는 중입니다...",
        ).unwrap();
        setOpenEdit(false);
        router.refresh();
      } catch {
        /* handled */
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <LayeredProfileAvatar
            size="lg"
            avatarUrl={profile.avatar_url}
            frameUrl={profile.active_border_color}
            badgeUrl={profile.active_badge}
            fallbackLabel={profile.username}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
          <p className="text-lg font-semibold tracking-tight">{profile.username}</p>
          <p className="text-sm text-muted-foreground">권한: <span className="font-medium text-foreground">{roleLabel(profile.role)}</span></p>
          <p className="text-sm text-muted-foreground">포지션: {roleText || "미정"}</p>
          <p className="text-sm text-muted-foreground">
            포인트: <span className="font-medium tabular-nums text-foreground">{points}P</span>
          </p>
          <p className="text-sm text-muted-foreground">장착 상태: 아바타 · 프레임 · 배지 레이어 미리보기</p>
          <p className="text-xs text-muted-foreground">프로필 아바타/프레임은 포인트 상점에서 구매한 아이템으로만 변경됩니다.</p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-5 sm:p-6">
        <h2 className="text-sm font-medium text-foreground">내 프로필 설정</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          팀 라인업 카드에 보이는 생일·MBTI·가장 좋아하는 곡을 입력하고 꾸밀 수 있어요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile" className={cn(buttonVariants({ size: "sm" }), "inline-flex w-full justify-center sm:w-auto")}>
            생일 · MBTI · 곡 수정하기
          </Link>
          <Link href="/shop" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex w-full justify-center sm:w-auto")}>
            상점에서 아이템 장착하기
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border/60 bg-card/70 p-5 sm:p-6">
        <h2 className="text-sm font-medium text-foreground">비밀번호 변경</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          새 비밀번호와 확인 값이 일치할 때만 변경됩니다.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="space-y-4 rounded-lg border border-border/60 bg-card/70 p-5 sm:p-6">
        <h2 className="text-sm font-medium text-foreground">프로필 수정</h2>
        <p className="text-xs text-muted-foreground">표시 이름과 포지션을 수정할 수 있습니다.</p>
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogTrigger render={<Button type="button" variant="outline" className="w-full sm:w-auto" />}>프로필 열기</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>프로필 수정</DialogTitle>
              <DialogDescription>내 이름과 포지션을 설정합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="profile-username" className="text-xs font-medium text-muted-foreground">이름</label>
                <Input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={pendingSave} maxLength={80} />
              </div>
              {[{ v: role1, s: setRole1, l: "포지션 선택 A" }, { v: role2, s: setRole2, l: "포지션 선택 B" }, { v: role3, s: setRole3, l: "포지션 선택 C" }].map((item) => (
                <div className="space-y-1.5" key={item.l}>
                  <label className="text-xs font-medium text-muted-foreground">{item.l}</label>
                  <select value={item.v} onChange={(e) => item.s(e.target.value)} className={cn("h-10 w-full rounded-lg border border-input bg-background px-3 text-sm", "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40")}>
                    <option value="">선택 안 함</option>
                    {TEAM_ROLE_OPTIONS.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)} disabled={pendingSave}>취소</Button>
              <Button type="button" onClick={onSaveProfile} disabled={pendingSave}>{pendingSave ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}저장</Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
