import { PageIntro } from "@/components/layout/page-intro";
import { PrayerBoard } from "@/features/prayer/components/PrayerBoard";
import { getPrayerPageData } from "@/features/prayer/queries/getPrayerPageData";

export const dynamic = "force-dynamic";

export default async function PrayerPage() {
  const { prayers, canManage, error } = await getPrayerPageData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageIntro
        eyebrow="영성"
        title="기도 공유"
        description="팀원들의 기도 제목을 나누고 함께 기도해 보세요."
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <PrayerBoard prayers={prayers} canManage={canManage} />
    </div>
  );
}
