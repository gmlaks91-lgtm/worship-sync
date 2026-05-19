"use client";

import { useEffect, useState } from "react";

import { PushNotificationPrompt } from "@/features/push/components/PushNotificationPrompt";
import {
  isPushSupported,
  wasPushPromptDismissed,
} from "@/features/push/lib/client-push";
import { isGeneralRole } from "@/lib/roles";
import type { ProfileRole } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

type PushNotificationProviderProps = {
  vapidPublicKey: string | null;
};

export function PushNotificationProvider({ vapidPublicKey }: PushNotificationProviderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!vapidPublicKey || !isPushSupported()) return;
    if (wasPushPromptDismissed()) return;
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return;

    const supabase = createClient();

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role as ProfileRole | undefined;
      if (!isGeneralRole(role)) return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

      setOpen(true);
    };

    void check();
  }, [vapidPublicKey]);

  if (!vapidPublicKey) return null;

  return <PushNotificationPrompt open={open} onOpenChange={setOpen} vapidPublicKey={vapidPublicKey} />;
}
