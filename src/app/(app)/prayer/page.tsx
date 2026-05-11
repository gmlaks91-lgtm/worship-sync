import { PrayerBoard } from "@/features/prayer/components/PrayerBoard";
import { getPrayerPageData } from "@/features/prayer/queries/getPrayerPageData";

export const dynamic = "force-dynamic";

export default async function PrayerPage() {
  const { prayers, error } = await getPrayerPageData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ahaba</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">기도나눔</h1>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <PrayerBoard prayers={prayers} />
    </div>
  );
}
