import { Church } from "lucide-react";

import type { WeeklyChecklistWorshipRecords } from "@/features/dashboard/lib/weekly-checklist";
import { cn } from "@/lib/utils";

type WeeklyChecklistWorshipCardProps = {
  value: WeeklyChecklistWorshipRecords;
  /** 제출 완료·저장 중일 때만 비활성화 (과거 날짜 조회와 무관) */
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
          <p className="text-sm text-gray-500">
            이번 주 예배·기도회 참석은 날짜와 관계없이 언제든 수정할 수 있습니다.
          </p>
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
          hint="참석 기록용 (점수 없음). 10분 전 입실 시에만 4점이 부여됩니다."
          onChange={(youthService) => onImmediateChange({ youthService })}
        />
        <WorshipCheckbox
          checked={value.youthEarlyArrival}
          disabled={disabled}
          label="청년/오후 예배 10분 전 도착"
          hint="10분 전 입실 시 4점 부여 (단순 참석은 0점)"
          onChange={(youthEarlyArrival) => onImmediateChange({ youthEarlyArrival })}
        />
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
