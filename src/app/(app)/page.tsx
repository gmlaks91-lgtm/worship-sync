import { PersonalDashboard } from "@/features/dashboard/components/PersonalDashboard";
import { BoardWidget } from "@/features/dashboard/components/BoardWidget";
import { getPersonalDashboardData } from "@/features/dashboard/queries/getPersonalDashboardData";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AhavaDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sunday?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dashboardData = await getPersonalDashboardData();

  return (
    <div className="flex flex-1 flex-col gap-12">
      <BoardWidget />

      <PersonalDashboard data={dashboardData} />
    </div>
  );
}
