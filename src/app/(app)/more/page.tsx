import Link from "next/link";

import { ProfileSettings } from "@/features/profile/components/ProfileSettings";
import { getMyProfile } from "@/features/profile/queries/getMyProfile";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const { profile, error } = await getMyProfile();

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ahaba</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">마이페이지</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          프로필 사진·이름·포지션과{" "}
          <Link href="/profile" className="font-medium text-primary underline-offset-4 hover:underline">
            생일·MBTI·좋아하는 곡
          </Link>
          을 관리해요.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          프로필을 불러오지 못했습니다: {error}
        </div>
      ) : null}

      {!profile && !error ? (
        <div className="rounded-lg border border-border/60 bg-muted/25 px-6 py-10 text-center text-sm text-muted-foreground">
          로그인이 필요합니다.
          <div className="mt-4">
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>로그인하기</Link>
          </div>
        </div>
      ) : null}

      {profile ? <ProfileSettings key={profile.updated_at} profile={profile} /> : null}

      <footer className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-6">
        <Link href="/profile" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
          내 프로필 설정
        </Link>
        <Link href="/points" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          포인트 내역
        </Link>
        {profile?.role === "leader" || profile?.role === "admin" ? (
          <Link href="/admin/shop" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            상점 관리자
          </Link>
        ) : null}
        <Link href="/team" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>팀 라인업</Link>
        {/* 임시 숨김: 경건생활/상점 기능 */}
        {/* <Link href="/faith" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>신앙 점검표</Link> */}
        {/* <Link href="/shop" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>포인트 상점</Link> */}
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>홈으로</Link>
      </footer>
    </div>
  );
}
