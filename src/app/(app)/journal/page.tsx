import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyChecklistBoard } from "@/features/dashboard/components/WeeklyChecklistBoard";
import { WeeklyChecklistJournalFeed } from "@/features/dashboard/components/WeeklyChecklistJournalFeed";
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
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            경건 일지
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">나의 주간 일지와 팀 공유 피드</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              매일의 경건 기록과 팀원 일지를 한 곳에서 확인하고, 함께 격려할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm shadow-neutral-100/60">
          <Tabs defaultValue="mine" className="gap-4">
            <TabsList className="w-full justify-start bg-muted/70 p-1">
              <TabsTrigger value="mine">내 일지</TabsTrigger>
              <TabsTrigger value="team">팀원 일지</TabsTrigger>
            </TabsList>
            <div className="p-5">
              <TabsContent value="mine" className="mt-3">
                <WeeklyChecklistBoard data={weeklyChecklistData} />
              </TabsContent>
              <TabsContent value="team" className="mt-3">
                <WeeklyChecklistJournalFeed entries={journalFeed} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
