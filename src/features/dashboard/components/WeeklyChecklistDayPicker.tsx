"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  WEEKLY_CHECKLIST_DAY_DEFS,
  calendarDateFromYmd,
  formatYmdKstLabel,
  getKstTodayYmd,
  isKstTodayYmd,
  ymdFromCalendarDate,
  type WeeklyChecklistDailyRecord,
} from "@/features/dashboard/lib/weekly-checklist";
import { cn } from "@/lib/utils";

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
  const [weekListExpanded, setWeekListExpanded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const todayYmd = useMemo(() => getKstTodayYmd(), []);
  const weekDateSet = useMemo(() => new Set(dailyRecords.map((record) => record.date)), [dailyRecords]);
  const selectedIsToday = isKstTodayYmd(selectedDateYmd);

  const weekEndYmd = dailyRecords[dailyRecords.length - 1]?.date;
  const weekStartYmd = dailyRecords[0]?.date;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-800">일별 경건일지</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-gray-600">{formatYmdKstLabel(selectedDateYmd)}</p>
            {selectedIsToday ? (
              <Badge variant="outline" className="border-sky-100 bg-sky-50 text-sky-700">
                오늘
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-100 bg-amber-50 text-amber-700">
                조회 전용
              </Badge>
            )}
          </div>
          {!selectedIsToday ? (
            <p className="text-xs text-gray-500">오늘이 아닌 날짜는 일일 항목을 수정할 수 없습니다.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                  <CalendarDays className="size-4" aria-hidden />
                  달력
                </Button>
              }
            />
            <PopoverContent className="w-auto p-2" align="end">
              <Calendar
                mode="single"
                locale={ko}
                selected={calendarDateFromYmd(selectedDateYmd)}
                onSelect={(date) => {
                  if (!date) return;
                  const ymd = ymdFromCalendarDate(date);
                  if (!weekDateSet.has(ymd)) return;
                  onSelectDateYmd(ymd);
                  setCalendarOpen(false);
                }}
                disabled={(date) => !weekDateSet.has(ymdFromCalendarDate(date))}
                defaultMonth={calendarDateFromYmd(selectedDateYmd)}
              />
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setWeekListExpanded((current) => !current)}
          >
            {weekListExpanded ? (
              <ChevronUp className="size-4" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
            {weekListExpanded ? "목록 접기" : "주간 목록 보기"}
          </Button>

          {!selectedIsToday ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={() => onSelectDateYmd(todayYmd)}
            >
              오늘로 이동
            </Button>
          ) : null}
        </div>
      </div>

      {weekListExpanded ? (
        <div className="flex flex-wrap gap-2">
          {dailyRecords.map((record, index) => {
            const dayLabel = WEEKLY_CHECKLIST_DAY_DEFS[index]?.label ?? "";
            const isSelected = record.date === selectedDateYmd;
            const isToday = record.date === todayYmd;
            const date = calendarDateFromYmd(record.date);

            return (
              <button
                key={record.date}
                type="button"
                onClick={() => onSelectDateYmd(record.date)}
                className={cn(
                  "min-w-[4.5rem] rounded-xl border px-3 py-2 text-left transition-all duration-200",
                  isSelected
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-gray-100 bg-slate-50 text-gray-700 hover:border-sky-100 hover:bg-sky-50/50",
                )}
              >
                <span className="block text-xs font-semibold">{dayLabel}</span>
                <span className="block text-[11px] text-gray-500">
                  {format(date, "M/d", { locale: ko })}
                </span>
                {isToday ? (
                  <span className="mt-1 block text-[10px] font-medium text-sky-600">오늘</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : weekStartYmd && weekEndYmd ? (
        <p className="text-xs text-gray-400">
          이번 주 {formatYmdKstLabel(weekStartYmd)} ~ {formatYmdKstLabel(weekEndYmd)} · 달력 또는
          주간 목록에서 날짜를 선택하세요.
        </p>
      ) : null}
    </div>
  );
}
