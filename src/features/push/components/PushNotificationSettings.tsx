"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { removePushSubscription } from "@/features/push/actions";
import {
  isPushSupported,
  subscribeToPushNotifications,
} from "@/features/push/lib/client-push";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PushNotificationSettingsProps = {
  vapidPublicKey: string | null;
};

type PushStatus = "unsupported" | "denied" | "subscribed" | "available";

export function PushNotificationSettings({ vapidPublicKey }: PushNotificationSettingsProps) {
  const [status, setStatus] = useState<PushStatus>("available");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!isPushSupported() || !vapidPublicKey) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    void navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "available");
    });
  }, [vapidPublicKey]);

  const handleEnable = () => {
    if (!vapidPublicKey) return;
    start(async () => {
      try {
        await subscribeToPushNotifications(vapidPublicKey);
        setStatus("subscribed");
        toastSuccess("알림을 켰어요.");
      } catch (e) {
        toastError(e instanceof Error ? e.message : "알림 설정에 실패했습니다.");
      }
    });
  };

  const handleDisable = () => {
    start(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          const result = await removePushSubscription(endpoint);
          if (!result.ok) {
            toastError(result.message);
            return;
          }
        }
        setStatus(Notification.permission === "denied" ? "denied" : "available");
        toastSuccess("알림을 껐어요.");
      } catch (e) {
        toastError(e instanceof Error ? e.message : "알림 해제에 실패했습니다.");
      }
    });
  };

  if (!vapidPublicKey) {
    return (
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">웹 푸시 알림</CardTitle>
          <CardDescription>VAPID 키가 설정되지 않아 알림을 사용할 수 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">웹 푸시 알림</CardTitle>
        <CardDescription>
          공지·중요 소식을 브라우저 알림으로 받을 수 있어요. PWA로 설치한 앱에서도 동일하게 작동합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusMessage status={status} />

        {status === "available" ? (
          <Button type="button" className="gap-2" disabled={pending} onClick={handleEnable}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
            알림 켜기
          </Button>
        ) : null}

        {status === "subscribed" ? (
          <Button type="button" variant="outline" className="gap-2" disabled={pending} onClick={handleDisable}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <BellOff className="size-4" />}
            알림 끄기
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusMessage({ status }: { status: PushStatus }) {
  if (status === "unsupported") {
    return <p className="text-sm text-muted-foreground">이 브라우저는 웹 푸시를 지원하지 않습니다.</p>;
  }
  if (status === "denied") {
    return (
      <p className="text-sm text-amber-700">
        브라우저에서 알림이 차단되어 있어요. 주소창 옆 자물쇠 아이콘에서 알림을 허용해 주세요.
      </p>
    );
  }
  if (status === "subscribed") {
    return <p className="text-sm text-green-700">알림이 켜져 있어요. 새 공지가 오면 바로 알려드릴게요.</p>;
  }
  return <p className="text-sm text-muted-foreground">알림을 켜면 공지를 놓치지 않을 수 있어요.</p>;
}
