import { AppShell } from "@/components/layout/app-shell";
import { PushNotificationProvider } from "@/features/push/components/PushNotificationProvider";
import { getVapidPublicKey } from "@/lib/push/vapid";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vapidPublicKey = getVapidPublicKey();

  return (
    <AppShell>
      {children}
      <PushNotificationProvider vapidPublicKey={vapidPublicKey} />
    </AppShell>
  );
}
