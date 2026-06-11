import Link from "next/link";

import { PointsBalance } from "@/features/points/components/PointsBalance";
import { getPointLogsPageData } from "@/features/points/queries/getPointLogsPageData";
import { PushNotificationSettings } from "@/features/push/components/PushNotificationSettings";
import { ProfileSettings } from "@/features/profile/components/ProfileSettings";
import { getMyProfile } from "@/features/profile/queries/getMyProfile";
import { getVapidPublicKey } from "@/lib/push/vapid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const { profile, error, dailyReminderAvailable } = await getMyProfile();
  const pointsData = await getPointLogsPageData();
  const vapidPublicKey = getVapidPublicKey();

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

      {profile ? (
        <>
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>포인트 관리</span>
                <Link
                  href="/points"
                  className="text-xs font-normal text-muted-foreground hover:text-foreground"
                >
                  자세히 보기 →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">현재 보유 포인트</p>
                  <p className="text-2xl font-semibold">
                    <PointsBalance />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">이번 달 적립</p>
                  <p className="text-lg font-medium text-green-600">
                    +{pointsData.monthlyEarned}P
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PushNotificationSettings
            vapidPublicKey={vapidPublicKey}
            wantsDailyReminder={profile.wants_daily_reminder}
            dailyReminderTime={profile.daily_reminder_time}
            dailyReminderAvailable={dailyReminderAvailable}
          />

          <ProfileSettings key={profile.updated_at} profile={profile} />
        </>
      ) : null}

      <footer className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-6">
        <Link href="/profile" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
          내 프로필 설정
        </Link>
        <Link href="/points" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          포인트 내역
        </Link>
        {profile?.role === "leader" || profile?.role === "admin" ? (
          <>
            <Link
              href="/admin/dashboard"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              데이터 대시보드
            </Link>
            <Link href="/admin/shop" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              상점 관리자
            </Link>
            <Link
              href="/admin/announcements"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              공지 푸시 알림
            </Link>
            <Link
              href="/admin/ai-report"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              AI 주간 리포트
            </Link>
            <Link
              href="/admin/teams"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              팀 · 목장 관리
            </Link>
          </>
        ) : null}
        <Link href="/shop" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>포인트 상점</Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>송리스트</Link>
      </footer>
    </div>
  );
}
