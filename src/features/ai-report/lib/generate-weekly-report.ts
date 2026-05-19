import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import type { AnonymousWeeklyAggregate } from "@/features/ai-report/lib/aggregate-anonymous-data";
import { getGeminiModel } from "@/lib/ai/google";

const weeklyReportSchema = z.object({
  summary: z
    .string()
    .min(80)
    .max(1200)
    .describe("공동체 전체가 읽을 따뜻한 주간 요약 (3~5문장)"),
  keywords: z
    .array(z.string().min(1).max(24))
    .min(3)
    .max(8)
    .describe("이번 주 묵상·기도 키워드 (짧은 명사구)"),
});

export type GeneratedWeeklyReport = z.infer<typeof weeklyReportSchema>;

function buildPromptPayload(aggregate: AnonymousWeeklyAggregate): string {
  return JSON.stringify(
    {
      week: aggregate.weekRangeLabel,
      participation: aggregate.participation,
      habits: aggregate.habits,
      diarySnippets: aggregate.diarySnippets,
      prayerTopics: aggregate.prayerTopics,
    },
    null,
    2,
  );
}

export async function generateWeeklyAiReport(
  aggregate: AnonymousWeeklyAggregate,
): Promise<GeneratedWeeklyReport> {
  const { object } = await generateObject({
    model: getGeminiModel(),
    schema: weeklyReportSchema,
    system: `당신은 청년부 공동체를 돌보는 따뜻한 목회 조력자입니다.
익명으로 취합된 경건 일지(한줄일기)와 기도 제목만 보고, 공동체 전체가 읽을 "AI 주간 리포트"를 작성합니다.

작성 원칙:
- 개인을 특정하거나 비교·평가하지 마세요.
- 데이터가 적어도 격려와 감사의 톤을 유지하세요.
- "이번 주 공동체의 주요 기도 및 묵상 키워드"가 드러나게 요약하세요.
- 문체는 다정하고 따뜻한 한국어 (~해요 체).
- keywords는 3~8개, 짧은 명사구로 작성하세요.`,
    prompt: `아래는 ${aggregate.weekRangeLabel} 동안 청년부원들의 익명 경건 데이터입니다.
이를 바탕으로 summary와 keywords를 작성해 주세요.

${buildPromptPayload(aggregate)}`,
  });

  return object;
}
