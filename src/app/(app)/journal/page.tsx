import { PageIntro } from "@/components/layout/page-intro";
import { JournalTabs } from "@/features/dashboard/components/JournalTabs";
import { getWeeklyChecklistBoardData } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import { getWeeklyChecklistJournalData } from "@/features/dashboard/queries/getWeeklyChecklistJournalData";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const [weeklyChecklistData, journalFeed] = await Promise.all([
    getWeeklyChecklistBoardData(),
    getWeeklyChecklistJournalData(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-4">
        <PageIntro
          eyebrow="경건 일지"
          title="나의 주간 일지와 팀 공유 피드"
          description="매일의 경건 기록과 팀원 일지를 한 곳에서 확인하고, 함께 격려할 수 있습니다."
        />

        <div className="surface-card overflow-hidden rounded-[2rem]">
          <JournalTabs boardData={weeklyChecklistData} initialFeed={journalFeed} />
        </div>
      </div>
    </div>
  );
}
