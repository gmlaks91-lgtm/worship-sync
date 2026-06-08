import { NextResponse } from "next/server";

import { getKstHourMinute, normalizeReminderTime } from "@/lib/push/kst-time";
import { sendPushToSubscriptions } from "@/lib/push/send-notifications";
import { configureWebPush, getVapidConfigError } from "@/lib/push/vapid";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_TITLE = "📖 묵상할 시간이에요!";
const REMINDER_BODY = "오늘의 경건일지를 작성해 볼까요?";
const REMINDER_URL = "/journal";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!configureWebPush()) {
    return NextResponse.json(
      { ok: false, message: getVapidConfigError() },
      { status: 503 },
    );
  }

  const kst = getKstHourMinute();
  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, daily_reminder_time")
    .eq("wants_daily_reminder", true)
    .not("daily_reminder_time", "is", null);

  if (profilesError) {
    return NextResponse.json({ ok: false, message: profilesError.message }, { status: 500 });
  }

  const dueUserIds =
    profiles
      ?.filter((row) => normalizeReminderTime(row.daily_reminder_time) === kst.hhmm)
      .map((row) => row.id) ?? [];

  if (dueUserIds.length === 0) {
    return NextResponse.json({
      ok: true,
      kst: kst.hhmm,
      dueUsers: 0,
      sent: 0,
      failed: 0,
      removed: 0,
      message: "이 시각에 알림을 받을 사용자가 없습니다.",
    });
  }

  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .in("user_id", dueUserIds);

  if (subsError) {
    return NextResponse.json({ ok: false, message: subsError.message }, { status: 500 });
  }

  const rows = subscriptions ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      kst: kst.hhmm,
      dueUsers: dueUserIds.length,
      sent: 0,
      failed: 0,
      removed: 0,
      message: "알림 대상 사용자에게 등록된 푸시 구독이 없습니다.",
    });
  }

  const summary = await sendPushToSubscriptions(
    rows,
    {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
      url: REMINDER_URL,
    },
    async (subscriptionId) => {
      await admin.from("push_subscriptions").delete().eq("id", subscriptionId);
    },
  );

  return NextResponse.json({
    ok: true,
    kst: kst.hhmm,
    dueUsers: dueUserIds.length,
    subscriptions: rows.length,
    ...summary,
    message: `${summary.sent}건 발송 완료 (대상 사용자 ${dueUserIds.length}명)`,
  });
}
