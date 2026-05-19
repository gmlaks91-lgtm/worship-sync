"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { generateAiWeeklyReportAction } from "@/features/ai-report/actions";
import type { WeeklyAiReportView } from "@/features/ai-report/queries/getLatestAiReport";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";

type AdminAiReportPanelProps = {
  currentWeekLabel: string;
  latestReport: WeeklyAiReportView | null;
};

export function AdminAiReportPanel({ currentWeekLabel, latestReport }: AdminAiReportPanelProps) {
  const [pending, start] = useTransition();

  const onGenerate = () => {
    start(async () => {
      const result = await generateAiWeeklyReportAction();
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      toastSuccess(result.message);
    });
  };

  return (
    <div className="surface-card space-y-5">
      <PanelHeader
        currentWeekLabel={currentWeekLabel}
        pending={pending}
        onGenerate={onGenerate}
      />

      {latestReport ? (
        <ReportPreview report={latestReport} />
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
          이번 주 리포트가 아직 없어요. 위 버튼을 눌러 생성해 주세요.
        </p>
      )}
    </div>
  );
}

function PanelHeader({
  currentWeekLabel,
  pending,
  onGenerate,
}: {
  currentWeekLabel: string;
  pending: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">분석 대상 주간</p>
        <p className="text-sm text-slate-600">{currentWeekLabel}</p>
        <p className="text-xs leading-relaxed text-slate-500">
          청년부원(general)의 경건 일지·기도 제목을 익명으로 취합해 AI가 요약합니다.
        </p>
      </div>
      <Button onClick={onGenerate} disabled={pending} className="shrink-0">
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            생성 중…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI 주간 리포트 생성
          </>
        )}
      </Button>
    </div>
  );
}

function ReportPreview({ report }: { report: WeeklyAiReportView }) {
  return (
    <div className="space-y-3 rounded-2xl border border-sky-100/80 bg-sky-50/40 p-4">
      <p className="text-xs font-medium text-sky-700">최근 생성본 미리보기</p>
      <p className="text-sm leading-relaxed text-slate-700">{report.summary}</p>
      {report.keywords.length > 0 ? (
        <KeywordChips keywords={report.keywords} />
      ) : null}
      <p className="text-[11px] text-slate-400">
        갱신: {new Date(report.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
      </p>
    </div>
  );
}

function KeywordChips({ keywords }: { keywords: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw) => (
        <span key={kw} className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs text-slate-600">
          {kw}
        </span>
      ))}
    </div>
  );
}
