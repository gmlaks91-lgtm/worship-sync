import { AppShell } from "@/components/layout/app-shell";
import { PwaInstallBanner } from "@/features/pwa/components/PwaInstallBanner";
import { PointsProvider } from "@/features/points/components/PointsProvider";
import { getFreshUserPoints } from "@/features/points/queries/getFreshUserPoints";
import { PushNotificationProvider } from "@/features/push/components/PushNotificationProvider";
import { getVapidPublicKey } from "@/lib/push/vapid";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vapidPublicKey = getVapidPublicKey();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialPoints = 0;
  if (user) {
    const fresh = await getFreshUserPoints(user.id);
    initialPoints = fresh.points;
  }

  return (
    <PointsProvider initialPoints={initialPoints} isLoggedIn={Boolean(user)}>
      <AppShell>
        {children}
        <PwaInstallBanner />
        <PushNotificationProvider vapidPublicKey={vapidPublicKey} />
      </AppShell>
    </PointsProvider>
  );
}
