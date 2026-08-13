"use client";

import { useMemo } from "react";
import { ko } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  calendarDateFromYmd,
  formatYmdKstLabel,
  getKstTodayYmd,
  isKstPastOrTodayYmd,
  isKstTodayYmd,
  ymdFromCalendarDate,
  type WeeklyChecklistDailyRecord,
} from "@/features/dashboard/lib/weekly-checklist";

type WeeklyChecklistDayPickerProps = {
  dailyRecords: WeeklyChecklistDailyRecord[];
  selectedDateYmd: string;
  onSelectDateYmd: (ymd: string) => void;
};

export function WeeklyChecklistDayPicker({
  dailyRecords,
  selectedDateYmd,
  onSelectDateYmd,
}: WeeklyChecklistDayPickerProps) {
  const todayYmd = useMemo(() => getKstTodayYmd(), []);
  const weekDateSet = useMemo(() => new Set(dailyRecords.map((record) => record.date)), [dailyRecords]);
  const selectedIsToday = isKstTodayYmd(selectedDateYmd);
  const selectedIsEditable = isKstPastOrTodayYmd(selectedDateYmd);

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-800">날짜 선택</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-gray-600">{formatYmdKstLabel(selectedDateYmd)}</p>
            {selectedIsToday ? (
              <Badge variant="outline" className="border-sky-100 bg-sky-50 text-sky-700">
                오늘
              </Badge>
            ) : selectedIsEditable ? null : (
              <Badge variant="outline" className="border-amber-100 bg-amber-50 text-amber-700">
                조회 전용
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400">달력에서 하루를 고르고 그날 점수를 입력하세요.</p>
      </div>

      <Calendar
        mode="single"
        locale={ko}
        selected={calendarDateFromYmd(selectedDateYmd)}
        defaultMonth={calendarDateFromYmd(selectedDateYmd)}
        onSelect={(date) => {
          if (!date) return;
          const ymd = ymdFromCalendarDate(date);
          if (!weekDateSet.has(ymd)) return;
          onSelectDateYmd(ymd);
        }}
        disabled={(date) => !weekDateSet.has(ymdFromCalendarDate(date))}
        className="mx-auto w-fit"
      />

      {!selectedIsEditable ? (
        <p className="text-xs text-gray-500">아직 오지 않은 날짜는 조회만 가능합니다.</p>
      ) : todayYmd !== selectedDateYmd && weekDateSet.has(todayYmd) ? (
        <button
          type="button"
          className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
          onClick={() => onSelectDateYmd(todayYmd)}
        >
          오늘로 이동
        </button>
      ) : null}
    </div>
  );
}
