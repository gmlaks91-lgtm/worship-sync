"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Sparkles } from "lucide-react";

import type { WeeklyChecklistJournalFeedEntry } from "@/features/dashboard/queries/getWeeklyChecklistJournalData";
import type { JournalTeamFilter } from "@/features/teams/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  hasTeams: boolean;
  teamFilter: JournalTeamFilter;
  loading?: boolean;
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

function TeamJournalFeedEntry({ entry }: { entry: WeeklyChecklistJournalFeedEntry }) {
  const [expanded, setExpanded] = useState(false);
  const diaryPreview = entry.diaryEntries.find((record) => record.diary.trim());
  const panelId = `team-journal-${entry.userId}`;

  return (
    <Card className="surface-card overflow-hidden rounded-3xl">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="sm">
              <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.username} />
              <AvatarFallback>{initials(entry.username)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-semibold text-gray-800">{entry.username}</CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-gray-100 bg-white text-[11px]",
                    entry.isSubmitted && "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {entry.isSubmitted ? "제출 완료" : "작성 중"}
                </Badge>
              </div>
              <CardDescription className="text-sm text-gray-500">
                {entry.isSubmitted
                  ? `제출 시각 · ${formatDateTime(entry.submittedAt)}`
                  : `최근 수정 · ${formatDateTime(entry.updatedAt)}`}
              </CardDescription>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-lg font-semibold tracking-tight text-gray-800">{entry.totalPoints}P</span>
            <p className="mt-0.5 text-xs text-gray-400">
              일지 {entry.diaryCount}/7 · QT {entry.qtCount}/7 · 기도 {entry.prayerCount}/7
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {!expanded && diaryPreview ? (
          <p className="line-clamp-2 text-sm leading-6 text-gray-600">
            <span className="font-medium text-gray-500">{diaryPreview.label}요일 · </span>
            {diaryPreview.diary.trim()}
          </p>
        ) : null}

        {!expanded ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded(true)}
          >
            상세보기
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        ) : (
          <div id={panelId} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Badge className="border-sky-100 bg-sky-50 text-sky-700">일지 {entry.diaryCount}/7</Badge>
              <Badge className="border-gray-100 bg-slate-100 text-gray-700">말씀 {entry.qtCount}/7</Badge>
              <Badge className="border-gray-100 bg-slate-100 text-gray-700">기도 {entry.prayerCount}/7</Badge>
            </div>

            <div className="grid gap-3">
              {entry.diaryEntries.map((record) => (
                <div key={record.dayKey} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                    <p className="font-medium text-gray-800">{record.label}요일</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">
                        <Sparkles className="size-3.5 text-sky-500" aria-hidden />
                        {record.qtDone ? "QT 완료" : "QT 미완료"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-gray-600">
                        <CheckCircle2 className="size-3.5 text-rose-400" aria-hidden />
                        {record.prayerDone ? "기도 완료" : "기도 미완료"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-800">
                    {record.diary.trim() || (
                      <span className="text-gray-400">아직 작성된 일지가 없습니다.</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-gray-500 sm:w-auto"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setExpanded(false)}
            >
              접기
              <ChevronDown className="size-4 rotate-180" aria-hidden />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WeeklyChecklistJournalFeed({
  entries,
  hasTeams,
  teamFilter,
  loading = false,
}: WeeklyChecklistJournalFeedProps) {
  if (!hasTeams) {
    return (
      <Card className="surface-card rounded-3xl">
        <CardHeader>
          <CardTitle>팀원 일지 공유</CardTitle>
          <CardDescription>소속된 팀이 없습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            찬양팀·목장 등 팀에 배정되면 같은 팀원의 경건 일지가 여기에 표시됩니다. 일지를 제출하면 별도 선택 없이
            내가 속한 모든 팀 피드에 자동으로 공유됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading && entries.length === 0) {
    return <p className="text-sm text-gray-500">팀원 일지를 불러오는 중…</p>;
  }

  if (entries.length === 0) {
    return (
      <Card className="surface-card rounded-3xl">
        <CardHeader>
          <CardTitle>팀원 일지 공유</CardTitle>
          <CardDescription>
            {teamFilter === "all" ? "아직 표시할 팀원 일지가 없습니다." : "이 팀에 표시할 일지가 없습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            같은 팀·목장에 소속된 팀원이 이번 주 일지를 작성·제출하면 자동으로 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {teamFilter === "all"
          ? "내가 속한 모든 팀·목장의 팀원 일지입니다."
          : "선택한 팀·목장 팀원의 일지입니다."}{" "}
        상세보기로 전체 내용을 확인할 수 있습니다.
      </p>
      {entries.map((entry) => (
        <TeamJournalFeedEntry key={entry.userId} entry={entry} />
      ))}
    </div>
  );
}
