import "server-only";

import webpush from "web-push";

import { configureWebPush } from "@/lib/push/vapid";
import type { Tables } from "@/types/database";

export type PushSubscriptionRow = Pick<
  Tables<"push_subscriptions">,
  "id" | "endpoint" | "p256dh" | "auth_key"
>;

export type PushMessagePayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushSendSummary = {
  sent: number;
  failed: number;
  removed: number;
};

export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushMessagePayload,
  onInvalidSubscription?: (subscriptionId: string) => Promise<void>,
): Promise<PushSendSummary> {
  if (!configureWebPush()) {
    throw new Error("VAPID 키가 설정되지 않았습니다.");
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/announcements",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth_key,
            },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;

        if ((statusCode === 404 || statusCode === 410) && onInvalidSubscription) {
          await onInvalidSubscription(row.id);
          removed += 1;
        }
      }
    }),
  );

  return { sent, failed, removed };
}
