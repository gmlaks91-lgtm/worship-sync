"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { submitWeeklyChecklist } from "@/features/dashboard/actions/weeklyChecklistActions";
import { syncPointsAfterMutation } from "@/features/points/lib/sync-points-client";
import {
  calculateWeeklyChecklistPoints,
  formatYmdKstLabel,
  isKstPastOrTodayYmd,
  resolveDefaultSelectedDateYmd,
  WEEKLY_CHECKLIST_MAX_POINTS,
  type WeeklyChecklistDailyRecord,
  type WeeklyChecklistWorshipRecords,
} from "@/features/dashboard/lib/weekly-checklist";
import type { WeeklyChecklistBoardData } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import { PreviousWeekSubmitBanner } from "@/features/dashboard/components/PreviousWeekSubmitBanner";
import { WeeklyChecklistDayCard } from "@/features/dashboard/components/WeeklyChecklistDayCard";
import { WeeklyChecklistDayPicker } from "@/features/dashboard/components/WeeklyChecklistDayPicker";
import { WeeklyChecklistTeamOverview } from "@/features/dashboard/components/WeeklyChecklistTeamOverview";
import { WeeklyChecklistAutosaveStatusLabel } from "@/features/dashboard/components/WeeklyChecklistAutosaveStatus";
import { WeeklyChecklistWorshipCard } from "@/features/dashboard/components/WeeklyChecklistWorshipCard";
import { useWeeklyChecklistAutosave } from "@/features/dashboard/hooks/useWeeklyChecklistAutosave";
import type { WeeklyChecklistSaveSnapshot } from "@/features/dashboard/hooks/useWeeklyChecklistAutosave";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  onAutosaveComplete?: () => void;
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

export function WeeklyChecklistBoard({ data, onAutosaveComplete }: WeeklyChecklistBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dailyRecords, setDailyRecords] = useState(data.checklist.dailyRecords);
  const [worshipRecords, setWorshipRecords] = useState(data.checklist.worshipRecords);
  const [selectedDateYmd, setSelectedDateYmd] = useState(() =>
    resolveDefaultSelectedDateYmd(data.checklist.dailyRecords),
  );

  const dailyRecordsRef = useRef(dailyRecords);
  const worshipRecordsRef = useRef(worshipRecords);
  dailyRecordsRef.current = dailyRecords;
  worshipRecordsRef.current = worshipRecords;

  const isPreviousWeekView = data.isPreviousWeekView;
  const weekLabel = isPreviousWeekView ? "지난주" : "이번 주";

  useEffect(() => {
    setDailyRecords(data.checklist.dailyRecords);
    setWorshipRecords(data.checklist.worshipRecords);
    dailyRecordsRef.current = data.checklist.dailyRecords;
    worshipRecordsRef.current = data.checklist.worshipRecords;
    setSelectedDateYmd(resolveDefaultSelectedDateYmd(data.checklist.dailyRecords));
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

  const { status: autosaveStatus, scheduleDebouncedSave, saveImmediately, flushPending } =
    useWeeklyChecklistAutosave({
      weekStartDate: data.weekStartDate,
      isSubmitted: data.checklist.isSubmitted,
      dailyRecords,
      worshipRecords,
      onSaved: onAutosaveComplete,
    });

  const applyDailyPatch = useCallback(
    (
      index: number,
      patch: Partial<WeeklyChecklistDailyRecord>,
      mode: "debounced" | "immediate",
    ) => {
      const nextDaily = dailyRecordsRef.current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      );
      dailyRecordsRef.current = nextDaily;

      const snapshot: WeeklyChecklistSaveSnapshot = {
        dailyRecords: nextDaily,
        worshipRecords: worshipRecordsRef.current,
      };

      setDailyRecords(nextDaily);

      if (mode === "immediate") saveImmediately(snapshot);
      else scheduleDebouncedSave(snapshot);
    },
    [saveImmediately, scheduleDebouncedSave],
  );

  const applyWorshipPatch = useCallback(
    (patch: Partial<WeeklyChecklistWorshipRecords>) => {
      const nextWorship = { ...worshipRecordsRef.current, ...patch };
      worshipRecordsRef.current = nextWorship;

      setWorshipRecords(nextWorship);
      saveImmediately({
        dailyRecords: dailyRecordsRef.current,
        worshipRecords: nextWorship,
      });
    },
    [saveImmediately],
  );

  const isSubmitted = data.checklist.isSubmitted;
  const lastSavedLabel = formatDateTime(data.checklist.updatedAt);
  const submittedLabel = formatDateTime(data.checklist.submittedAt);

  const selectedDailyIndex = dailyRecords.findIndex((record) => record.date === selectedDateYmd);
  const selectedDailyRecord =
    selectedDailyIndex >= 0 ? dailyRecords[selectedDailyIndex] : dailyRecords[0];
  const selectedDailyIndexSafe = selectedDailyIndex >= 0 ? selectedDailyIndex : 0;
  const isSelectedEditable = selectedDailyRecord
    ? isKstPastOrTodayYmd(selectedDailyRecord.date)
    : false;
  const isDailyEditable = isSelectedEditable && !pending;
  const isWorshipEditable = !pending;

  const onSubmit = () => {
    flushPending();
    const confirmMessage = isSubmitted
      ? "수정한 내용으로 다시 제출할까요? 변경된 점수로 다시 계산됩니다."
      : `${weekLabel} 체크리스트를 제출할까요? 제출 후에도 언제든 수정해 다시 제출할 수 있습니다.`;
    if (!window.confirm(confirmMessage)) {
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
      toastSuccess(
        result.awardedPoints
          ? `${result.message} +${result.awardedPoints}P가 반영되었습니다.`
          : result.message,
      );
      if (result.awardedPoints) {
        await syncPointsAfterMutation(router);
      } else {
        router.refresh();
      }
    });
  };

  const progressPercent = Math.min(
    100,
    Math.round((score.totalPoints / WEEKLY_CHECKLIST_MAX_POINTS) * 100),
  );

  return (
    <section className="space-y-6">
      {!isPreviousWeekView && data.previousWeekSummary ? (
        <PreviousWeekSubmitBanner summary={data.previousWeekSummary} />
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    isPreviousWeekView
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-gray-100 bg-slate-50 text-gray-700"
                  }
                >
                  {weekLabel} 체크리스트
                </Badge>
                {isSubmitted ? (
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    제출 완료
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-sky-100 bg-sky-50 text-sky-700">
                    작성 중
                  </Badge>
                )}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-gray-800">
                  주간 체크리스트 보드
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-gray-500">
                  {data.weekRangeLabel} ·{" "}
                  {isPreviousWeekView
                    ? "지난주 기록을 확인하고 수정한 뒤 제출할 수 있습니다."
                    : "오늘의 경건일지를 작성하고, 예배 참석은 주간 단위로 기록합니다."}
                </CardDescription>
                <WeeklyChecklistAutosaveStatusLabel status={autosaveStatus} className="mt-2" />
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {isPreviousWeekView ? (
                <Link
                  href="/journal"
                  className={cn(buttonVariants({ variant: "outline" }), "inline-flex h-10 items-center gap-2")}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  이번 주로 돌아가기
                </Link>
              ) : null}
              <Button type="button" disabled={pending} className="h-10" onClick={onSubmit}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                {isSubmitted ? "수정 후 다시 제출" : `${weekLabel} 제출`}
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

          <div className="rounded-2xl border border-gray-100 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  {weekLabel} 획득 예상 포인트 <span className="text-gray-500">(최대 100점)</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span>매일 기록 {score.dailyPoints}P</span>
                  <span className="text-gray-300">/</span>
                  <span>예배 기록 {score.worshipPoints}P</span>
                  {score.rawTotalPoints > WEEKLY_CHECKLIST_MAX_POINTS ? (
                    <>
                      <span className="text-gray-300">/</span>
                      <span>상한 적용 전 {score.rawTotalPoints}P</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="text-left lg:text-right">
                <p className="text-3xl font-semibold tracking-tight text-gray-800">
                  {score.totalPoints}
                  <span className="ml-1 text-lg text-gray-400">P</span>
                </p>
                <p className="text-xs text-gray-500">
                  {isSubmitted
                    ? submittedLabel
                      ? `${submittedLabel}에 제출 완료`
                      : `${weekLabel} 제출 완료`
                    : lastSavedLabel
                      ? `최근 저장 ${lastSavedLabel}`
                      : "아직 제출 전입니다."}
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isSubmitted ? "bg-emerald-500" : "bg-sky-500",
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
                      ? "border-gray-200 bg-white text-gray-700"
                      : "border-gray-100 bg-slate-100 text-gray-400",
                  )}
                >
                  {item.label} {item.points}P
                </div>
              ))}
            </div>
          </div>

          <WeeklyChecklistDayPicker
            dailyRecords={dailyRecords}
            selectedDateYmd={selectedDailyRecord?.date ?? selectedDateYmd}
            onSelectDateYmd={setSelectedDateYmd}
          />

          {selectedDailyRecord ? (
            <WeeklyChecklistDayCard
              key={`${selectedDailyRecord.dayKey}-${selectedDailyRecord.date}`}
              record={selectedDailyRecord}
              label={formatYmdKstLabel(selectedDailyRecord.date)}
              disabled={!isDailyEditable}
              readOnly={!isSelectedEditable}
              points={score.dailyBreakdown[selectedDailyIndexSafe]?.points ?? 0}
              hasDoubleBonus={Boolean(score.dailyBreakdown[selectedDailyIndexSafe]?.hasDoubleBonus)}
              onDebouncedChange={(patch) =>
                applyDailyPatch(selectedDailyIndexSafe, patch, "debounced")
              }
              onImmediateChange={(patch) =>
                applyDailyPatch(selectedDailyIndexSafe, patch, "immediate")
              }
              onDiaryBlur={() => flushPending()}
            />
          ) : null}

          <WeeklyChecklistWorshipCard
            value={worshipRecords}
            disabled={!isWorshipEditable}
            onImmediateChange={applyWorshipPatch}
          />
        </CardContent>
      </Card>

      {data.canManageOverview ? <WeeklyChecklistTeamOverview rows={data.teamOverview} /> : null}
    </section>
  );
}
