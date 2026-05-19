"use server";

import { revalidatePath } from "next/cache";

import { aggregateAnonymousWeeklyData } from "@/features/ai-report/lib/aggregate-anonymous-data";
import { generateWeeklyAiReport } from "@/features/ai-report/lib/generate-weekly-report";
import { getKstWeekStartDate } from "@/features/dashboard/lib/weekly-checklist";
import { requireLeader } from "@/lib/require-leader";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type AiReportActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function generateAiWeeklyReportAction(): Promise<AiReportActionResult> {
  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: leader.message };
    }

    const weekStartDate = getKstWeekStartDate();
    const aggregate = await aggregateAnonymousWeeklyData(weekStartDate);

    if (
      aggregate.diarySnippets.length === 0 &&
      aggregate.prayerTopics.length === 0 &&
      aggregate.participation.membersWithChecklist === 0
    ) {
      return {
        ok: false,
        message: "이번 주에 분석할 경건 일지·기도 데이터가 아직 없어요.",
      };
    }

    const generated = await generateWeeklyAiReport(aggregate);
    const admin = createAdminClient();

    const { error } = await admin.from("ai_reports").upsert(
      {
        week_start_date: aggregate.weekStartDate,
        week_end_date: aggregate.weekEndDate,
        summary: generated.summary,
        keywords: generated.keywords,
        stats: {
          participation: aggregate.participation,
          habits: aggregate.habits,
        },
        generated_by: leader.userId,
      },
      { onConflict: "week_start_date" },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/journal");
    revalidatePath("/admin/ai-report");

    return {
      ok: true,
      message: `${aggregate.weekRangeLabel} AI 주간 리포트를 생성했어요.`,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "AI 리포트 생성에 실패했습니다.",
    };
  }
}
