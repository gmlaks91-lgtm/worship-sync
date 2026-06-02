import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createAnnouncementPost } from "@/features/push/actions";
import { sendPushToSubscriptions } from "@/lib/push/send-notifications";
import { configureWebPush } from "@/lib/push/vapid";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const pushBodySchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요.").max(120),
  body: z.string().trim().min(1, "내용을 입력하세요.").max(500),
  url: z.string().trim().optional(),
  publishToBoard: z.boolean().optional(),
  boardContent: z.string().trim().max(8000).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
    return NextResponse.json({ ok: false, message: "푸시 발송 권한이 없습니다." }, { status: 403 });
  }

  if (!configureWebPush()) {
    return NextResponse.json(
      { ok: false, message: "VAPID 키가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = pushBodySchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const { title, body, url, publishToBoard, boardContent } = parsed.data;

  if (publishToBoard) {
    const content = (boardContent?.trim() || `${title}\n\n${body}`).slice(0, 8000);
    const postResult = await createAnnouncementPost(content);
    if (!postResult.ok) {
      return NextResponse.json({ ok: false, message: postResult.message }, { status: 500 });
    }
  }

  const admin = createAdminClient();

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key");

  if (subsError) {
    return NextResponse.json({ ok: false, message: subsError.message }, { status: 500 });
  }

  const rows = subscriptions ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      failed: 0,
      removed: 0,
      message: "푸시 구독이 등록된 사용자가 없습니다.",
    });
  }

  const summary = await sendPushToSubscriptions(
    rows,
    {
      title,
      body,
      url: url || "/announcements",
    },
    async (subscriptionId) => {
      await admin.from("push_subscriptions").delete().eq("id", subscriptionId);
    },
  );

  revalidatePath("/announcements");

  return NextResponse.json({
    ok: true,
    ...summary,
    total: rows.length,
    message: `${summary.sent}건 발송 완료 (대상 ${rows.length}건)`,
  });
}
