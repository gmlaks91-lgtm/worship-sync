"use client";

import { useEffect, useMemo, useState } from "react";

import { PushNotificationPrompt } from "@/features/push/components/PushNotificationPrompt";
import {
  isPushSupported,
  wasPushPromptDismissed,
} from "@/features/push/lib/client-push";
import { getVapidPublicKeyFromEnv } from "@/lib/push/vapid-env";
import { createClient } from "@/utils/supabase/client";

type PushNotificationProviderProps = {
  vapidPublicKey: string | null;
};

export function PushNotificationProvider({ vapidPublicKey }: PushNotificationProviderProps) {
  const [open, setOpen] = useState(false);
  const effectivePublicKey = useMemo(
    () => vapidPublicKey ?? getVapidPublicKeyFromEnv(),
    [vapidPublicKey],
  );

  useEffect(() => {
    if (!effectivePublicKey || !isPushSupported()) return;
    if (wasPushPromptDismissed()) return;
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return;

    const supabase = createClient();

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

      setOpen(true);
    };

    void check();
  }, [effectivePublicKey]);

  if (!effectivePublicKey) return null;

  return (
    <PushNotificationPrompt
      open={open}
      onOpenChange={setOpen}
      vapidPublicKey={effectivePublicKey}
    />
  );
}
