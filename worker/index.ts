/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  /** 알림 클릭 시 이동할 앱 내부 경로. 예) "/qt-board/123", "/checklist", "/journal" */
  url?: string;
};

/** url이 없을 때의 안전한 기본 도착지 */
const DEFAULT_URL = "/announcements";

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? "Worship Sync";
  // 클릭 시 사용할 url을 notification.data 에 실어서 notificationclick 으로 전달
  const targetUrl = payload.url && payload.url.trim().length > 0 ? payload.url : DEFAULT_URL;

  const options: NotificationOptions = {
    body: payload.body ?? "새 알림이 도착했어요.",
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/icon-192.png",
    data: { url: targetUrl },
    // 같은 url끼리는 묶어서 표시(서로 다른 딥링크는 별도 알림으로 유지)
    tag: `worship-sync:${targetUrl}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const rawUrl =
    (event.notification.data as { url?: string } | undefined)?.url ?? DEFAULT_URL;
  // payload 경로를 절대 URL로 정규화 (상대 경로/절대 경로 모두 허용)
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // 1) 이미 정확히 같은 경로를 열어둔 창이 있으면 그 창에 포커스
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return (client as WindowClient).focus();
        }
      }

      // 2) 우리 도메인 창이 열려 있으면 해당 창을 딥링크 경로로 이동시킨 뒤 포커스
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ("navigate" in client) {
          const navigated = await (client as WindowClient).navigate(targetUrl);
          return navigated ? navigated.focus() : undefined;
        }
        return (client as WindowClient).focus();
      }

      // 3) 열린 창이 없으면 딥링크 경로로 새 창을 연다
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })(),
  );
});

export {};
