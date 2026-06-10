import { BookOpen, Flame, NotebookPen } from "lucide-react";

import type { WeeklyChecklistDailyRecord } from "@/features/dashboard/lib/weekly-checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WeeklyChecklistDayCardProps = {
  record: WeeklyChecklistDailyRecord;
  label: string;
  disabled?: boolean;
  readOnly?: boolean;
  points: number;
  hasDoubleBonus: boolean;
  onDebouncedChange: (patch: Partial<WeeklyChecklistDailyRecord>) => void;
  onImmediateChange: (patch: Partial<WeeklyChecklistDailyRecord>) => void;
  onDiaryBlur?: () => void;
};

function BooleanChoice({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 border-gray-100 bg-white transition-all duration-200",
            value && "border-sky-300 bg-sky-50 text-sky-700",
          )}
          onClick={() => {
            if (!value) onChange(true);
          }}
        >
          O
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 border-gray-100 bg-white transition-all duration-200",
            !value && "border-gray-200 bg-slate-50 text-gray-600",
          )}
          onClick={() => {
            if (value) onChange(false);
          }}
        >
          X
        </Button>
      </div>
    </div>
  );
}

export function WeeklyChecklistDayCard({
  record,
  label,
  disabled,
  readOnly,
  points,
  hasDoubleBonus,
  onDebouncedChange,
  onImmediateChange,
  onDiaryBlur,
}: WeeklyChecklistDayCardProps) {
  return (
    <article className="surface-card-hover relative p-4">
      {readOnly ? (
        <p className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          아직 오지 않은 날짜는 조회만 가능합니다. 오늘과 지난 날짜는 수정할 수 있습니다.
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <p className="mt-1 text-xs text-gray-400">{record.date}</p>
        </div>
        <div className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
          {points}P
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
            <NotebookPen className="size-3.5 text-sky-500" aria-hidden />
            한줄일기
          </div>
          <textarea
            value={record.diary}
            disabled={disabled}
            rows={3}
            maxLength={400}
            onChange={(event) => onDebouncedChange({ diary: event.target.value })}
            onBlur={onDiaryBlur}
            className="min-h-[86px] w-full resize-none rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-all duration-200 focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-100"
            placeholder="오늘의 은혜나 다짐을 한 줄로 남겨 보세요."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
            <BookOpen className="size-3.5 text-rose-400" aria-hidden />
            말씀 읽기
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={150}
              disabled={disabled}
              value={record.bibleChapters}
              onChange={(event) =>
                onDebouncedChange({
                  bibleChapters: Math.max(0, Number(event.target.value || 0)),
                })
              }
              onBlur={onDiaryBlur}
              className="h-10"
            />
            <span className="shrink-0 text-xs text-gray-400">장</span>
          </div>
          <p className="text-[11px] text-gray-400">7장 이상 읽으면 2점입니다.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <BooleanChoice
            label="큐티"
            value={record.qtDone}
            disabled={disabled}
            onChange={(qtDone) => onImmediateChange({ qtDone })}
          />
          <BooleanChoice
            label="기도"
            value={record.prayerDone}
            disabled={disabled}
            onChange={(prayerDone) => onImmediateChange({ prayerDone })}
          />
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all duration-200",
            hasDoubleBonus
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-gray-100 bg-slate-50 text-gray-500",
          )}
        >
          <Flame className="size-3.5 text-rose-400" aria-hidden />
          {hasDoubleBonus
            ? "말씀 · 큐티 · 기도를 모두 완료해 2배 보너스 12점이 적용됩니다."
            : "하루에 말씀 · 큐티 · 기도를 모두 완료하면 12점이 적용됩니다."}
        </div>
      </div>
    </article>
  );
}
