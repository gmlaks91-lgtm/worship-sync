"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send } from "lucide-react";

import {
  submitWeeklyChecklist,
  upsertWeeklyChecklistDraft,
} from "@/features/dashboard/actions/weeklyChecklistActions";
import {
  calculateWeeklyChecklistPoints,
  WEEKLY_CHECKLIST_DAY_DEFS,
  WEEKLY_CHECKLIST_MAX_POINTS,
  type WeeklyChecklistDailyRecord,
  type WeeklyChecklistWorshipRecords,
} from "@/features/dashboard/lib/weekly-checklist";
import type { WeeklyChecklistBoardData } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import { WeeklyChecklistDayCard } from "@/features/dashboard/components/WeeklyChecklistDayCard";
import { WeeklyChecklistTeamOverview } from "@/features/dashboard/components/WeeklyChecklistTeamOverview";
import { WeeklyChecklistWorshipCard } from "@/features/dashboard/components/WeeklyChecklistWorshipCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type WeeklyChecklistBoardProps = {
  data: WeeklyChecklistBoardData;
};

function formatDateTime(value: string | null) {
  if (!value) return null;
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

export function WeeklyChecklistBoard({ data }: WeeklyChecklistBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dailyRecords, setDailyRecords] = useState(data.checklist.dailyRecords);
  const [worshipRecords, setWorshipRecords] = useState(data.checklist.worshipRecords);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDailyRecords(data.checklist.dailyRecords);
    setWorshipRecords(data.checklist.worshipRecords);
    setDirty(false);
  }, [
    data.checklist.id,
    data.checklist.updatedAt,
    data.checklist.submittedAt,
    data.checklist.isSubmitted,
    data.weekStartDate,
  ]);

  const score = useMemo(
    () => calculateWeeklyChecklistPoints({ dailyRecords, worshipRecords }),
    [dailyRecords, worshipRecords],
  );
  const isSubmitted = data.checklist.isSubmitted;
  const lastSavedLabel = formatDateTime(data.checklist.updatedAt);
  const submittedLabel = formatDateTime(data.checklist.submittedAt);

  const onSave = () => {
    startTransition(async () => {
      const result = await upsertWeeklyChecklistDraft({
        weekStartDate: data.weekStartDate,
        dailyRecords,
        worshipRecords,
      });
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      setDirty(false);
      toastSuccess(result.message);
      router.refresh();
    });
  };

  const onSubmit = () => {
    if (!window.confirm("이번 주 체크리스트를 제출할까요? 제출 후에는 수정할 수 없습니다.")) {
      return;
    }

    startTransition(async () => {
      const result = await submitWeeklyChecklist({
        weekStartDate: data.weekStartDate,
        dailyRecords,
        worshipRecords,
      });
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      setDirty(false);
      toastSuccess(
        result.awardedPoints
          ? `${result.message} +${result.awardedPoints}P가 반영되었습니다.`
          : result.message,
      );
      router.refresh();
    });
  };

  const progressPercent = Math.min(
    100,
    Math.round((score.totalPoints / WEEKLY_CHECKLIST_MAX_POINTS) * 100),
  );

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border-neutral-200 bg-white shadow-sm shadow-neutral-100/80">
        <CardHeader className="border-b border-neutral-100 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-neutral-700">
                  이번 주 체크리스트
                </Badge>
                {isSubmitted ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    제출 완료
                  </Badge>
                ) : dirty ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    저장 전 변경사항 있음
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-500">
                    초안 작성 중
                  </Badge>
                )}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-neutral-900">
                  주간 체크리스트 보드
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-neutral-500">
                  {data.weekRangeLabel} · 한줄일기, 말씀, 큐티, 기도, 예배 참석을 기록해 보세요.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={pending || isSubmitted || !dirty}
                className="h-10 border-neutral-300 text-neutral-800"
                onClick={onSave}
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
                임시 저장
              </Button>
              <Button
                type="button"
                disabled={pending || isSubmitted}
                className="h-10 bg-neutral-900 text-white hover:bg-neutral-800"
                onClick={onSubmit}
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                이번 주 제출
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {data.error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              일부 데이터를 불러오지 못했습니다: {data.error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-neutral-900">
                  이번 주 획득 예상 포인트 <span className="text-neutral-500">(최대 100점)</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                  <span>매일 기록 {score.dailyPoints}P</span>
                  <span className="text-neutral-300">/</span>
                  <span>예배 기록 {score.worshipPoints}P</span>
                  {score.rawTotalPoints > WEEKLY_CHECKLIST_MAX_POINTS ? (
                    <>
                      <span className="text-neutral-300">/</span>
                      <span>상한 적용 전 {score.rawTotalPoints}P</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="text-left lg:text-right">
                <p className="text-3xl font-semibold tracking-tight text-neutral-900">
                  {score.totalPoints}
                  <span className="ml-1 text-lg text-neutral-400">P</span>
                </p>
                <p className="text-xs text-neutral-500">
                  {isSubmitted
                    ? submittedLabel
                      ? `${submittedLabel}에 제출 완료`
                      : "이번 주 제출 완료"
                    : lastSavedLabel
                      ? `최근 저장 ${lastSavedLabel}`
                      : "아직 제출 전입니다."}
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isSubmitted ? "bg-emerald-500" : "bg-neutral-900",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {score.dailyBreakdown.map((item) => (
                <div
                  key={item.dayKey}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    item.points > 0
                      ? "border-neutral-300 bg-white text-neutral-700"
                      : "border-neutral-200 bg-neutral-100 text-neutral-400",
                  )}
                >
                  {item.label} {item.points}P
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {dailyRecords.map((record, index) => {
              const dayScore = score.dailyBreakdown[index];
              return (
                <WeeklyChecklistDayCard
                  key={`${record.dayKey}-${record.date}`}
                  record={record}
                  label={`${WEEKLY_CHECKLIST_DAY_DEFS[index]?.label ?? ""}요일`}
                  disabled={pending || isSubmitted}
                  points={dayScore?.points ?? 0}
                  hasDoubleBonus={Boolean(dayScore?.hasDoubleBonus)}
                  onChange={(patch) => {
                    setDailyRecords((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ...patch } : item,
                      ),
                    );
                    setDirty(true);
                  }}
                />
              );
            })}
          </div>

          <WeeklyChecklistWorshipCard
            value={worshipRecords}
            disabled={pending || isSubmitted}
            onChange={(patch) => {
              setWorshipRecords((current) => ({ ...current, ...patch }));
              setDirty(true);
            }}
          />
        </CardContent>
      </Card>

      {data.canManageOverview ? <WeeklyChecklistTeamOverview rows={data.teamOverview} /> : null}
    </section>
  );
}
