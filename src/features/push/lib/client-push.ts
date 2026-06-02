"use client";

import { savePushSubscription } from "@/features/push/actions";
import { getVapidPublicKeyFromEnv } from "@/lib/push/vapid-env";

const DISMISS_STORAGE_KEY = "worship-sync:push-prompt-dismissed";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function resolveVapidPublicKey(explicit?: string | null): string {
  const key = (explicit ?? getVapidPublicKeyFromEnv() ?? "").trim();
  if (!key) {
    throw new Error(
      "VAPID Public Key가 설정되지 않았습니다. NEXT_PUBLIC_VAPID_PUBLIC_KEY를 확인하고 서버를 재시작해 주세요.",
    );
  }
  return key;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function wasPushPromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPushPrompt(): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

export async function subscribeToPushNotifications(vapidPublicKey?: string | null) {
  if (!isPushSupported()) {
    throw new Error("이 브라우저는 웹 푸시를 지원하지 않습니다.");
  }

  const key = resolveVapidPublicKey(vapidPublicKey);

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한이 허용되지 않았습니다.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const applicationServerKey = urlBase64ToUint8Array(key);

  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("구독 정보를 가져오지 못했습니다.");
  }

  const result = await savePushSubscription({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    userAgent: navigator.userAgent.slice(0, 512),
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  return subscription;
}
