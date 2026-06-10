import { NextResponse } from "next/server";
import { z } from "zod";

import { savePushSubscription } from "@/features/push/actions";

const subscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(512).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const parsed = subscribeBodySchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const result = await savePushSubscription(parsed.data);
  if (!result.ok) {
    const status = result.message.includes("로그인") ? 401 : 400;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const endpoint = z.string().url().safeParse((json as { endpoint?: string })?.endpoint);
  if (!endpoint.success) {
    return NextResponse.json({ ok: false, message: "구독 endpoint가 필요합니다." }, { status: 400 });
  }

  const { removePushSubscription } = await import("@/features/push/actions");
  const result = await removePushSubscription(endpoint.data);
  if (!result.ok) {
    const status = result.message.includes("로그인") ? 401 : 400;
    return NextResponse.json({ ok: false, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
