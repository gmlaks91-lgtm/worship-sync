"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, PencilLine, Send } from "lucide-react";

import { submitPreviousWeekChecklist } from "@/features/dashboard/actions/weeklyChecklistActions";
import type { PreviousWeekChecklistSummary } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import { syncPointsAfterMutation } from "@/features/points/lib/sync-points-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type PreviousWeekSubmitBannerProps = {
  summary: PreviousWeekChecklistSummary;
};

export function PreviousWeekSubmitBanner({ summary }: PreviousWeekSubmitBannerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSubmitAsIs = () => {
    const confirmMessage = summary.hasStarted
      ? `지난주 체크리스트 ${summary.totalPoints}점으로 제출할까요?`
      : "지난주 기록이 없습니다. 0점으로 제출할까요?";
    if (!window.confirm(confirmMessage)) return;

    startTransition(async () => {
      const result = await submitPreviousWeekChecklist();
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

  return (
    <div className="rounded-2xl border-2 border-amber-300/60 bg-amber-50 px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-sm font-semibold text-amber-950 sm:text-base">
        지난주 체크리스트는{" "}
        <span className="tabular-nums text-amber-700">{summary.totalPoints}점</span>
        입니다. 이대로 제출할까요?
      </p>
      <p className="mt-1 text-xs text-amber-800/80 sm:text-sm">
        {summary.weekRangeLabel}
        {summary.hasStarted ? "" : " · 아직 작성된 기록이 없습니다"}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          disabled={pending}
          className="h-10 bg-amber-600 text-white hover:bg-amber-700"
          onClick={onSubmitAsIs}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          이대로 제출
        </Button>
        <Link
          href={`/journal?weekStart=${summary.weekStartDate}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-10 items-center gap-2 border-amber-300 bg-white",
            pending && "pointer-events-none opacity-50",
          )}
        >
          <PencilLine className="size-4" aria-hidden />
          지난주 수정하기
        </Link>
      </div>
    </div>
  );
}
