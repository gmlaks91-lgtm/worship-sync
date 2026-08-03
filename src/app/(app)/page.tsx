import { BoardWidget } from "@/features/dashboard/components/BoardWidget";
import { GratitudeHero } from "@/features/dashboard/components/GratitudeHero";
import { QuickActionsHero } from "@/features/dashboard/components/QuickActionsHero";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-8 sm:gap-12">
      <GratitudeHero />
      <QuickActionsHero />
      <BoardWidget />
    </div>
  );
}
