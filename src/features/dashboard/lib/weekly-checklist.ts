import { z } from "zod";

import type { Json } from "@/types/database";

export const WEEKLY_CHECKLIST_MAX_POINTS = 100;
export const WEEKLY_CHECKLIST_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const WEEKLY_CHECKLIST_DAY_DEFS = [
  { key: "sun", label: "일" },
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
] as const;

export const WEEKLY_WORSHIP_FIELDS = [
  { key: "sundayFirstService", label: "주일 1부 예배", basePoints: 3 },
  { key: "sundaySecondService", label: "주일 2부 예배", basePoints: 3 },
  { key: "youthService", label: "청년/오후 예배", basePoints: 3 },
  { key: "youthEarlyArrival", label: "청년/오후 예배 10분 전 도착", basePoints: 1 },
  { key: "wednesdayService", label: "수요 예배", basePoints: 3 },
  { key: "fridayPrayer", label: "금요 기도회", basePoints: 3 },
  { key: "saturdayPrayer", label: "토요 기도회", basePoints: 3 },
] as const;

export type WeeklyChecklistDayKey = (typeof WEEKLY_CHECKLIST_DAY_KEYS)[number];
export type WeeklyChecklistWorshipKey = (typeof WEEKLY_WORSHIP_FIELDS)[number]["key"];

export type WeeklyChecklistDailyRecord = {
  dayKey: WeeklyChecklistDayKey;
  date: string;
  diary: string;
  bibleChapters: number;
  qtDone: boolean;
  prayerDone: boolean;
};

export type WeeklyChecklistWorshipRecords = {
  sundayFirstService: boolean;
  sundaySecondService: boolean;
  youthService: boolean;
  youthEarlyArrival: boolean;
  wednesdayService: boolean;
  fridayPrayer: boolean;
  saturdayPrayer: boolean;
};

export type WeeklyChecklistScoreBreakdown = {
  rawTotalPoints: number;
  totalPoints: number;
  dailyPoints: number;
  worshipPoints: number;
  dailyBreakdown: Array<{
    dayKey: WeeklyChecklistDayKey;
    date: string;
    label: string;
    points: number;
    hasDoubleBonus: boolean;
  }>;
  worshipBreakdown: Array<{
    key: WeeklyChecklistWorshipKey;
    label: string;
    active: boolean;
    points: number;
  }>;
};

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const weeklyChecklistDailyRecordSchema = z.object({
  dayKey: z.enum(WEEKLY_CHECKLIST_DAY_KEYS),
  date: ymdSchema,
  diary: z.string().max(400).default(""),
  bibleChapters: z.number().int().min(0).max(150),
  qtDone: z.boolean(),
  prayerDone: z.boolean(),
});

export const weeklyChecklistWorshipRecordsSchema = z.object({
  sundayFirstService: z.boolean(),
  sundaySecondService: z.boolean(),
  youthService: z.boolean(),
  youthEarlyArrival: z.boolean(),
  wednesdayService: z.boolean(),
  fridayPrayer: z.boolean(),
  saturdayPrayer: z.boolean(),
});

export const weeklyChecklistDraftSchema = z.object({
  weekStartDate: ymdSchema,
  dailyRecords: z.array(weeklyChecklistDailyRecordSchema).length(7),
  worshipRecords: weeklyChecklistWorshipRecordsSchema,
});

export type WeeklyChecklistDraftInput = z.infer<typeof weeklyChecklistDraftSchema>;

function parseUtcDateFromYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatUtcDateYmd(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToYmd(ymd: string, days: number) {
  const date = parseUtcDateFromYmd(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDateYmd(date);
}

export function getKstTodayYmd(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return formatUtcDateYmd(kst);
}

export function getKstWeekStartDate(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - kst.getUTCDay());
  return formatUtcDateYmd(kst);
}

export function formatWeekRangeLabel(weekStartDate: string) {
  const start = parseUtcDateFromYmd(weekStartDate);
  const end = parseUtcDateFromYmd(addDaysToYmd(weekStartDate, 6));
  const parts = (date: Date) => ({
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: WEEKLY_CHECKLIST_DAY_DEFS[date.getUTCDay()]?.label ?? "",
  });
  const startParts = parts(start);
  const endParts = parts(end);
  return `${startParts.month}월 ${startParts.day}일(${startParts.weekday}) - ${endParts.month}월 ${endParts.day}일(${endParts.weekday})`;
}

export function createDefaultDailyRecords(weekStartDate: string): WeeklyChecklistDailyRecord[] {
  return WEEKLY_CHECKLIST_DAY_DEFS.map((day, index) => ({
    dayKey: day.key,
    date: addDaysToYmd(weekStartDate, index),
    diary: "",
    bibleChapters: 0,
    qtDone: false,
    prayerDone: false,
  }));
}

export function createDefaultWorshipRecords(): WeeklyChecklistWorshipRecords {
  return {
    sundayFirstService: false,
    sundaySecondService: false,
    youthService: false,
    youthEarlyArrival: false,
    wednesdayService: false,
    fridayPrayer: false,
    saturdayPrayer: false,
  };
}

export function normalizeDailyRecords(value: Json | null | undefined, weekStartDate: string) {
  const fallback = createDefaultDailyRecords(weekStartDate);
  const parsed = z.array(weeklyChecklistDailyRecordSchema).safeParse(value);
  if (!parsed.success) return fallback;

  const byDayKey = new Map(parsed.data.map((record) => [record.dayKey, record]));
  return fallback.map((base) => {
    const record = byDayKey.get(base.dayKey);
    if (!record) return base;
    return {
      ...base,
      diary: record.diary,
      bibleChapters: record.bibleChapters,
      qtDone: record.qtDone,
      prayerDone: record.prayerDone,
    };
  });
}

export function normalizeWorshipRecords(value: Json | null | undefined) {
  const fallback = createDefaultWorshipRecords();
  const parsed = weeklyChecklistWorshipRecordsSchema.safeParse(value);
  if (!parsed.success) return fallback;
  return parsed.data;
}

export function calculateWeeklyChecklistPoints(params: {
  dailyRecords: WeeklyChecklistDailyRecord[];
  worshipRecords: WeeklyChecklistWorshipRecords;
}): WeeklyChecklistScoreBreakdown {
  const dailyBreakdown = params.dailyRecords.map((record, index) => {
    const biblePoints = record.bibleChapters >= 7 ? 2 : 0;
    const qtPoints = record.qtDone ? 2 : 0;
    const prayerPoints = record.prayerDone ? 2 : 0;
    const hasDoubleBonus = biblePoints > 0 && qtPoints > 0 && prayerPoints > 0;
    return {
      dayKey: record.dayKey,
      date: record.date,
      label: `${WEEKLY_CHECKLIST_DAY_DEFS[index]?.label ?? ""}요일`,
      points: hasDoubleBonus ? 12 : biblePoints + qtPoints + prayerPoints,
      hasDoubleBonus,
    };
  });

  const worshipBreakdown = WEEKLY_WORSHIP_FIELDS.map((field) => {
    const active = params.worshipRecords[field.key];
    let points = 0;
    if (field.key === "sundayFirstService" || field.key === "sundaySecondService") {
      const sundayActive =
        params.worshipRecords.sundayFirstService || params.worshipRecords.sundaySecondService;
      points = sundayActive && field.key === "sundayFirstService" ? 3 : 0;
      return {
        key: field.key,
        label: field.label,
        active,
        points,
      };
    }

    if (field.key === "youthService") {
      points = active ? (params.worshipRecords.youthEarlyArrival ? 4 : 3) : 0;
      return { key: field.key, label: field.label, active, points };
    }

    if (field.key === "youthEarlyArrival") {
      points = 0;
      return { key: field.key, label: field.label, active, points };
    }

    points = active ? field.basePoints : 0;
    return { key: field.key, label: field.label, active, points };
  });

  const dailyPoints = dailyBreakdown.reduce((sum, item) => sum + item.points, 0);
  const worshipPoints = worshipBreakdown.reduce((sum, item) => sum + item.points, 0);
  const rawTotalPoints = dailyPoints + worshipPoints;

  return {
    rawTotalPoints,
    totalPoints: Math.min(rawTotalPoints, WEEKLY_CHECKLIST_MAX_POINTS),
    dailyPoints,
    worshipPoints,
    dailyBreakdown,
    worshipBreakdown,
  };
}
