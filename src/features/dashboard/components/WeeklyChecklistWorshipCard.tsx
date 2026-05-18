import { Church, Clock3 } from "lucide-react";

import type { WeeklyChecklistWorshipRecords } from "@/features/dashboard/lib/weekly-checklist";
import { cn } from "@/lib/utils";

type WeeklyChecklistWorshipCardProps = {
  value: WeeklyChecklistWorshipRecords;
  disabled?: boolean;
  onImmediateChange: (patch: Partial<WeeklyChecklistWorshipRecords>) => void;
};

function WorshipCheckbox({
  checked,
  disabled,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all duration-200",
        "hover:border-sky-100 hover:bg-sky-50/40",
        checked && "border-sky-200 bg-sky-50/60",
      )}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-gray-200 accent-sky-500"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );
}

export function WeeklyChecklistWorshipCard({
  value,
  disabled,
  onImmediateChange,
}: WeeklyChecklistWorshipCardProps) {
  return (
    <section className="surface-card p-5">
      <div className="flex items-center gap-2">
        <Church className="size-4 text-sky-500" aria-hidden />
        <div>
          <p className="text-base font-semibold text-gray-800">예배 참석 기록</p>
          <p className="text-sm text-gray-500">이번 주 예배와 기도회 참석 여부를 체크하세요.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <WorshipCheckbox
          checked={value.sundayFirstService}
          disabled={disabled}
          label="주일 1부 예배"
          hint="1부/2부는 둘 다 참석해도 최대 3점만 인정됩니다."
          onChange={(sundayFirstService) => onImmediateChange({ sundayFirstService })}
        />
        <WorshipCheckbox
          checked={value.sundaySecondService}
          disabled={disabled}
          label="주일 2부 예배"
          hint="1부/2부 중 하나만 체크해도 3점입니다."
          onChange={(sundaySecondService) => onImmediateChange({ sundaySecondService })}
        />
        <WorshipCheckbox
          checked={value.youthService}
          disabled={disabled}
          label="청년/오후 예배"
          hint="기본 3점, 10분 전 도착 시 4점입니다."
          onChange={(youthService) => onImmediateChange({
              youthService,
              youthEarlyArrival: youthService ? value.youthEarlyArrival : false,
            })
          }
        />
        <div className="rounded-xl border border-gray-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <Clock3 className="size-4 text-rose-400" aria-hidden />
            청년/오후 예배 10분 전 도착
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={value.youthEarlyArrival}
              disabled={disabled || !value.youthService}
              onChange={(event) => onImmediateChange({ youthEarlyArrival: event.target.checked })}
              className="size-4 rounded border-gray-200 accent-rose-400"
            />
            미리 도착했어요 (+1점)
          </label>
          {!value.youthService ? (
            <p className="mt-2 text-xs text-gray-400">청년/오후 예배를 체크하면 활성화됩니다.</p>
          ) : null}
        </div>
        <WorshipCheckbox
          checked={value.wednesdayService}
          disabled={disabled}
          label="수요 예배"
          hint="참석 시 3점"
          onChange={(wednesdayService) => onImmediateChange({ wednesdayService })}
        />
        <WorshipCheckbox
          checked={value.fridayPrayer}
          disabled={disabled}
          label="금요 기도회"
          hint="참석 시 3점"
          onChange={(fridayPrayer) => onImmediateChange({ fridayPrayer })}
        />
        <WorshipCheckbox
          checked={value.saturdayPrayer}
          disabled={disabled}
          label="토요 기도회"
          hint="참석 시 3점"
          onChange={(saturdayPrayer) => onImmediateChange({ saturdayPrayer })}
        />
      </div>
    </section>
  );
}
