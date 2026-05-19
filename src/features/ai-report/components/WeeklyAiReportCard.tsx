import { Sparkles } from "lucide-react";

import type { WeeklyAiReportView } from "@/features/ai-report/queries/getLatestAiReport";
import { formatWeekRangeLabel } from "@/features/dashboard/lib/weekly-checklist";

type WeeklyAiReportCardProps = {
  report: WeeklyAiReportView;
};

export function WeeklyAiReportCard({ report }: WeeklyAiReportCardProps) {
  return (
    <section
      aria-label="AI 주간 리포트"
      className="transform-gpu relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-violet-50/95 via-sky-50/90 to-rose-50/95 p-6 shadow-[0_18px_48px_-16px_rgba(125,211,252,0.35)]"
    >
      <span
        className="decorative-blur pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-sky-200/40"
        aria-hidden
      />
      <span
        className="decorative-blur pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-rose-200/35"
        aria-hidden
      />

      <div className="relative space-y-4">
        <header className="flex items-start gap-3">
          <ReportIcon />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600/90">
              AI 주간 리포트
            </p>
            <h2 className="text-lg font-semibold leading-snug text-slate-800">
              이번 주 우리의 기도와 묵상
            </h2>
            <p className="text-xs text-slate-500">{report.weekRangeLabel}</p>
          </div>
        </header>

        <p className="text-sm leading-relaxed text-slate-700">{report.summary}</p>

        {report.keywords.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {report.keywords.map((keyword) => (
              <li
                key={keyword}
                className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
              >
                {keyword}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[11px] text-slate-400">
          익명으로 모은 경건 일지·기도 제목을 바탕으로 AI가 요약했어요.
        </p>
      </div>
    </section>
  );
}

function ReportIcon() {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/90 to-sky-500 text-white shadow-md shadow-sky-200/60">
      <Sparkles className="h-5 w-5" />
    </div>
  );
}

export function WeeklyAiReportCardPlaceholder({ weekStartDate }: { weekStartDate: string }) {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-sky-50/50 px-5 py-4 text-sm text-slate-500">
      <p className="font-medium text-slate-600">AI 주간 리포트 준비 중</p>
      <p className="mt-1 text-xs leading-relaxed">
        {formatWeekRangeLabel(weekStartDate)} 리포트가 생성되면 이곳에 표시돼요.
      </p>
    </section>
  );
}
