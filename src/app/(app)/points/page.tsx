import Link from "next/link";

import { PointsBalance } from "@/features/points/components/PointsBalance";
import { getPointLogsPageData } from "@/features/points/queries/getPointLogsPageData";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  signup_bonus: "회원가입 보상",
  daily_login: "출석 보상",
  sheet_view: "악보 확인 보상",
  schedule_check: "일정 체크 보상",
  board_post: "게시글 작성 보상",
  shop_purchase: "상점 구매",
};

function eventLabel(eventType: string) {
  return EVENT_LABEL[eventType] ?? eventType;
}

export default async function PointsPage() {
  const data = await getPointLogsPageData();

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ahava</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">포인트 내역</h1>
        <p className="text-sm text-muted-foreground">적립/사용 이력을 최근 순서대로 확인할 수 있어요.</p>
      </header>

      {!data.isLoggedIn ? (
        <Card className="border-border/70">
          <CardContent className="space-y-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">로그인 후 포인트 내역을 확인할 수 있습니다.</p>
            <div>
              <Link href="/login?next=/points" className={cn(buttonVariants({ size: "sm" }))}>
                로그인하기
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/70">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">현재 보유 포인트</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                <PointsBalance valueClassName="font-semibold" />
              </p>
            </CardContent>
          </Card>

          {data.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
              포인트 로그를 불러오지 못했습니다: {data.error}
            </div>
          ) : null}

          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">최근 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {data.logs.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">아직 포인트 내역이 없습니다.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.logs.map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{eventLabel(log.event_type)}</p>
                        <p className="text-xs text-muted-foreground">{log.occurred_on}</p>
                      </div>
                      <Badge variant={log.points >= 0 ? "secondary" : "outline"} className={cn(log.points < 0 && "text-destructive")}>
                        {log.points >= 0 ? `+${log.points}` : log.points}P
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
