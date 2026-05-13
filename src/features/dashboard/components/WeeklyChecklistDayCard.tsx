import { BookOpen, Flame, NotebookPen } from "lucide-react";

import type { WeeklyChecklistDailyRecord } from "@/features/dashboard/lib/weekly-checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type WeeklyChecklistDayCardProps = {
  record: WeeklyChecklistDailyRecord;
  label: string;
  disabled?: boolean;
  points: number;
  hasDoubleBonus: boolean;
  onChange: (patch: Partial<WeeklyChecklistDailyRecord>) => void;
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
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 border-neutral-200 bg-white",
            value && "border-emerald-400 bg-emerald-50 text-emerald-700",
          )}
          onClick={() => onChange(true)}
        >
          O
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 border-neutral-200 bg-white",
            !value && "border-neutral-300 bg-neutral-50 text-neutral-600",
          )}
          onClick={() => onChange(false)}
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
  points,
  hasDoubleBonus,
  onChange,
}: WeeklyChecklistDayCardProps) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-100/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{label}</p>
          <p className="mt-1 text-xs text-neutral-500">{record.date}</p>
        </div>
        <div className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700">
          {points}P
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
            <NotebookPen className="size-3.5" aria-hidden />
            한줄일기
          </div>
          <textarea
            value={record.diary}
            disabled={disabled}
            rows={3}
            maxLength={400}
            onChange={(event) => onChange({ diary: event.target.value })}
            className="min-h-[86px] w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus-visible:border-neutral-400"
            placeholder="오늘의 은혜나 다짐을 한 줄로 남겨 보세요."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
            <BookOpen className="size-3.5" aria-hidden />
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
                onChange({
                  bibleChapters: Math.max(0, Number(event.target.value || 0)),
                })
              }
              className="h-10 border-neutral-200 bg-white"
            />
            <span className="shrink-0 text-xs text-neutral-500">장</span>
          </div>
          <p className="text-[11px] text-neutral-400">7장 이상 읽으면 2점입니다.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <BooleanChoice
            label="큐티"
            value={record.qtDone}
            disabled={disabled}
            onChange={(qtDone) => onChange({ qtDone })}
          />
          <BooleanChoice
            label="기도"
            value={record.prayerDone}
            disabled={disabled}
            onChange={(prayerDone) => onChange({ prayerDone })}
          />
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
            hasDoubleBonus
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-neutral-200 bg-neutral-50 text-neutral-500",
          )}
        >
          <Flame className="size-3.5" aria-hidden />
          {hasDoubleBonus
            ? "말씀 · 큐티 · 기도를 모두 완료해 2배 보너스 12점이 적용됩니다."
            : "하루에 말씀 · 큐티 · 기도를 모두 완료하면 12점이 적용됩니다."}
        </div>
      </div>
    </article>
  );
}
