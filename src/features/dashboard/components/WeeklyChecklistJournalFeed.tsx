import { CheckCircle2, MessageSquare, Sparkles } from "lucide-react";

import type { WeeklyChecklistJournalFeedEntry } from "@/features/dashboard/queries/getWeeklyChecklistJournalData";
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

type WeeklyChecklistJournalFeedProps = {
  entries: WeeklyChecklistJournalFeedEntry[];
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

export function WeeklyChecklistJournalFeed({ entries }: WeeklyChecklistJournalFeedProps) {
  if (entries.length === 0) {
    return (
      <Card className="rounded-3xl border border-neutral-200 bg-white shadow-sm shadow-neutral-100/80">
        <CardHeader>
          <CardTitle>팀원 일지 공유</CardTitle>
          <CardDescription>아직 등록된 팀원 일지가 없습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">이번 주 다른 팀원의 경건 일지는 작성 후 자동으로 표시됩니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card
          key={entry.userId}
          className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm shadow-neutral-100/80"
        >
          <CardHeader className="border-b border-neutral-100 pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar size="sm">
                  <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.username} />
                  <AvatarFallback>{initials(entry.username)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-semibold text-neutral-900">{entry.username}</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-neutral-200 bg-white text-[11px]",
                        entry.isSubmitted && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {entry.isSubmitted ? "제출 완료" : "작성 중"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-neutral-500">
                    {entry.isSubmitted ? `제출 시각 · ${formatDateTime(entry.submittedAt)}` : `최근 수정 · ${formatDateTime(entry.updatedAt)}`}
                  </CardDescription>
                </div>
              </div>

              <div className="grid gap-2 text-right text-sm">
                <span className="text-lg font-semibold tracking-tight text-neutral-900">{entry.totalPoints}P</span>
                <span className="text-xs text-muted-foreground">QT {entry.qtCount}/7 · 기도 {entry.prayerCount}/7</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Badge className="border-neutral-200 bg-neutral-100 text-neutral-700">
                일지 {entry.diaryCount}/7
              </Badge>
              <Badge className="border-neutral-200 bg-neutral-100 text-neutral-700">
                말씀 완료 {entry.qtCount}/7
              </Badge>
              <Badge className="border-neutral-200 bg-neutral-100 text-neutral-700">
                기도 완료 {entry.prayerCount}/7
              </Badge>
            </div>

            <div className="grid gap-3">
              {entry.diaryEntries.map((record) => (
                <div
                  key={record.dayKey}
                  className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
                    <p className="font-medium text-neutral-900">{record.label}요일</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-neutral-600">
                        <Sparkles className="size-4" aria-hidden />
                        {record.qtDone ? "QT 완료" : "QT 미완료"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-neutral-600">
                        <CheckCircle2 className="size-4" aria-hidden />
                        {record.prayerDone ? "기도 완료" : "기도 미완료"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-900">
                    {record.diary.trim() || <span className="text-neutral-500">아직 작성된 일지가 없습니다.</span>}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              <MessageSquare className="inline h-4 w-4 align-text-bottom text-neutral-500" aria-hidden />
              <span className="ml-2">팀원들이 작성한 주간 경건 일지를 최신순으로 확인하세요.</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
