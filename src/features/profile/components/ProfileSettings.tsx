"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { usePoints } from "@/features/points/components/PointsProvider";
import { ChangePasswordForm } from "@/features/profile/components/ChangePasswordForm";
import { ProfileEquipControls } from "@/features/profile/components/ProfileEquipControls";
import { updateProfile } from "@/features/profile/actions/profileActions";
import type { MyProfileRow } from "@/features/profile/queries/getMyProfile";
import { roleLabel } from "@/lib/roles";
import { toastError, toastPromise } from "@/lib/app-toast";
import { LayeredProfileAvatar } from "@/components/profile/layered-profile-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProfileSettings({ profile }: { profile: MyProfileRow }) {
  const router = useRouter();
  const { points } = usePoints();
  const [openEdit, setOpenEdit] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [pendingSave, startSaveTransition] = useTransition();

  const onSaveProfile = () => {
    const next = username.trim();
    if (!next) return toastError("이름을 입력해 주세요.");

    startSaveTransition(async () => {
      try {
        await toastPromise(
          updateProfile({ username: next }).then((res) => {
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
          <p className="text-sm text-muted-foreground">
            권한: <span className="font-medium text-foreground">{roleLabel(profile.role)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            포인트: <span className="font-medium tabular-nums text-foreground">{points}P</span>
          </p>
          <p className="text-sm text-muted-foreground">장착 상태: 아바타 · 프레임 · 배지 레이어 미리보기</p>
          <p className="text-xs text-muted-foreground">
            프로필 아바타/프레임은 포인트 상점에서 구매한 아이템으로만 변경됩니다.
          </p>
          <ProfileEquipControls profile={profile} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-5 sm:p-6">
        <h2 className="text-sm font-medium text-foreground">내 프로필 설정</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          생일·MBTI·가장 좋아하는 곡을 입력하고 꾸밀 수 있어요.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile"
            className={cn(buttonVariants({ size: "sm" }), "inline-flex w-full justify-center sm:w-auto")}
          >
            생일 · MBTI · 곡 수정하기
          </Link>
          <Link
            href="/shop"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex w-full justify-center sm:w-auto",
            )}
          >
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
        <p className="text-xs text-muted-foreground">표시 이름을 수정할 수 있습니다.</p>
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogTrigger render={<Button type="button" variant="outline" className="w-full sm:w-auto" />}>
            프로필 열기
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>프로필 수정</DialogTitle>
              <DialogDescription>내 이름을 설정합니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="profile-username" className="text-xs font-medium text-muted-foreground">
                  이름
                </label>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={pendingSave}
                  maxLength={80}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)} disabled={pendingSave}>
                취소
              </Button>
              <Button type="button" onClick={onSaveProfile} disabled={pendingSave}>
                {pendingSave ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
