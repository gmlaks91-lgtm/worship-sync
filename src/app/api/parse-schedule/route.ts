import { NextResponse } from "next/server";

import { parseScheduleFromText } from "@/features/schedule/lib/parse-schedule";
import { parseScheduleRequestSchema } from "@/features/schedule/lib/parsed-schedule-schema";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const leader = await requireLeader(supabase);
  if (!leader.ok) {
    return NextResponse.json({ ok: false, message: leader.message }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = parseScheduleRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  try {
    const data = await parseScheduleFromText(parsed.data.text);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: e instanceof Error ? e.message : "일정 텍스트 분석에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
