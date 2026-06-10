"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import {
  removePushSubscription,
  updateDailyReminderSettings,
} from "@/features/push/actions";
import {
  isPushSupported,
  subscribeToPushNotifications,
} from "@/features/push/lib/client-push";
import { normalizeReminderTime } from "@/lib/push/kst-time";
import { getVapidPublicKeyFromEnv } from "@/lib/push/vapid-env";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PushNotificationSettingsProps = {
  vapidPublicKey: string | null;
  wantsDailyReminder: boolean;
  dailyReminderTime: string | null;
};

type PushStatus = "unsupported" | "denied" | "subscribed" | "available";

const DEFAULT_REMINDER_TIME = "09:00";

export function PushNotificationSettings({
  vapidPublicKey,
  wantsDailyReminder,
  dailyReminderTime,
}: PushNotificationSettingsProps) {
  const [status, setStatus] = useState<PushStatus>("available");
  const [pending, start] = useTransition();
  const [reminderPending, startReminder] = useTransition();

  const [wantsReminder, setWantsReminder] = useState(wantsDailyReminder);
  const [reminderTime, setReminderTime] = useState(
    normalizeReminderTime(dailyReminderTime) ?? DEFAULT_REMINDER_TIME,
  );

  const [effectivePublicKey, setEffectivePublicKey] = useState<string | null>(
    vapidPublicKey ?? null,
  );

  useEffect(() => {
    setWantsReminder(wantsDailyReminder);
    setReminderTime(normalizeReminderTime(dailyReminderTime) ?? DEFAULT_REMINDER_TIME);
  }, [wantsDailyReminder, dailyReminderTime]);

  useEffect(() => {
    const key = vapidPublicKey ?? getVapidPublicKeyFromEnv();
    setEffectivePublicKey(key);

    if (!isPushSupported() || !key) {
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

  const saveReminderSettings = (nextWants: boolean, nextTime: string) => {
    startReminder(async () => {
      const res = await updateDailyReminderSettings({
        wantsDailyReminder: nextWants,
        dailyReminderTime: nextWants ? nextTime : undefined,
      });
      if (!res.ok) {
        toastError(res.message);
        setWantsReminder(wantsDailyReminder);
        setReminderTime(normalizeReminderTime(dailyReminderTime) ?? DEFAULT_REMINDER_TIME);
        return;
      }
      toastSuccess(nextWants ? "경건일지 알림 시간을 저장했어요." : "경건일지 알림을 껐어요.");
    });
  };

  const handleReminderToggle = () => {
    const nextWants = !wantsReminder;
    setWantsReminder(nextWants);
    saveReminderSettings(nextWants, reminderTime);
  };

  const handleReminderTimeChange = (value: string) => {
    setReminderTime(value);
  };

  const handleReminderTimeSave = () => {
    if (!wantsReminder) return;
    saveReminderSettings(true, reminderTime);
  };

  const handleEnable = () => {
    if (!effectivePublicKey) return;
    start(async () => {
      try {
        await subscribeToPushNotifications(effectivePublicKey);
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

  if (!effectivePublicKey) {
    return (
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">웹 푸시 알림</CardTitle>
          <CardDescription>
            NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되지 않았습니다. .env.local 확인 후 서버를 재시작해 주세요.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const reminderTimeDirty =
    wantsReminder &&
    reminderTime !== (normalizeReminderTime(dailyReminderTime) ?? DEFAULT_REMINDER_TIME);

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">웹 푸시 알림</CardTitle>
        <CardDescription>
          공지·중요 소식을 브라우저 알림으로 받을 수 있어요. PWA로 설치한 앱에서도 동일하게 작동합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">매일 경건일지 알림 받기</p>
              <p className="text-xs text-muted-foreground">
                원하는 시간에 &quot;오늘의 경건일지를 작성해 볼까요?&quot; 알림을 보내드려요. (한국 시간 기준)
              </p>
            </div>
            <ReminderSwitch
              checked={wantsReminder}
              disabled={reminderPending || status !== "subscribed"}
              onChange={handleReminderToggle}
            />
          </div>

          {status !== "subscribed" ? (
            <p className="text-xs text-amber-700">
              경건일지 알림을 받으려면 먼저 위에서 웹 푸시 알림을 켜 주세요.
            </p>
          ) : null}

          {wantsReminder && status === "subscribed" ? (
            <div className="space-y-2">
              <Label htmlFor="daily-reminder-time" className="text-xs text-muted-foreground">
                알림 받을 시간
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="daily-reminder-time"
                  type="time"
                  value={reminderTime}
                  disabled={reminderPending}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="w-[9.5rem]"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={reminderPending || !reminderTimeDirty}
                  onClick={handleReminderTimeSave}
                >
                  {reminderPending ? <Loader2 className="size-4 animate-spin" /> : "시간 저장"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ReminderSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-slate-200",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 translate-x-1 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-6",
        )}
      />
      <span className="sr-only">매일 경건일지 알림 받기</span>
    </button>
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
