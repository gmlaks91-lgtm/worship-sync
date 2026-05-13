import { CheckCircle2, Clock3, Users } from "lucide-react";

import type { WeeklyChecklistTeamOverviewRow } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WeeklyChecklistTeamOverviewProps = {
  rows: WeeklyChecklistTeamOverviewRow[];
};

function formatDateTime(value: string | null) {
  if (!value) return "기록 없음";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function WeeklyChecklistTeamOverview({ rows }: WeeklyChecklistTeamOverviewProps) {
  const submittedCount = rows.filter((row) => row.isSubmitted).length;

  return (
    <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm shadow-neutral-100/80">
      <CardHeader className="border-b border-neutral-100 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-neutral-500" aria-hidden />
              <CardTitle className="text-base font-semibold text-neutral-900">팀 주간 현황</CardTitle>
            </div>
            <CardDescription>리더/관리자는 팀원들의 제출 상태와 점수를 한눈에 확인할 수 있습니다.</CardDescription>
          </div>
          <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-neutral-700">
            제출 {submittedCount}/{rows.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 팀원이 없습니다.</p>
        ) : (
          rows.map((row) => {
            const percent = Math.min(100, row.totalPoints);
            return (
              <div
                key={row.userId}
                className="rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={row.avatarUrl ?? undefined} alt={row.username} />
                      <AvatarFallback>{initials(row.username)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-neutral-900">{row.username}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-neutral-200 bg-white text-[11px]",
                            row.isSubmitted && "border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {row.isSubmitted ? "제출 완료" : row.hasStarted ? "작성 중" : "미작성"}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {row.isSubmitted
                          ? `제출 시각 · ${formatDateTime(row.submittedAt)}`
                          : `최근 수정 · ${formatDateTime(row.updatedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tracking-tight text-neutral-900">{row.totalPoints}P</p>
                    <p className="text-[11px] text-neutral-500">
                      {row.isSubmitted ? `반영 ${row.awardedPoints}P` : "예상 점수"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      row.isSubmitted ? "bg-emerald-500" : "bg-neutral-900",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    {row.isSubmitted ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden />
                    ) : (
                      <Clock3 className="size-3.5" aria-hidden />
                    )}
                    {row.role === "leader" ? "리더" : row.role === "admin" ? "관리자" : "팀원"}
                  </span>
                  <span>최대 100점</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
