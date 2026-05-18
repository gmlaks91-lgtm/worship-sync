"use client";

import { useCallback, useState } from "react";

import { fetchWeeklyChecklistJournalFeed } from "@/features/dashboard/actions/weeklyChecklistActions";
import { WeeklyChecklistBoard } from "@/features/dashboard/components/WeeklyChecklistBoard";
import { WeeklyChecklistJournalFeed } from "@/features/dashboard/components/WeeklyChecklistJournalFeed";
import type { WeeklyChecklistBoardData } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import type { WeeklyChecklistJournalFeedEntry } from "@/features/dashboard/queries/getWeeklyChecklistJournalData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JournalTabsProps = {
  boardData: WeeklyChecklistBoardData;
  initialFeed: WeeklyChecklistJournalFeedEntry[];
};

export function JournalTabs({ boardData, initialFeed }: JournalTabsProps) {
  const [feedEntries, setFeedEntries] = useState(initialFeed);

  const refreshFeed = useCallback(async () => {
    const entries = await fetchWeeklyChecklistJournalFeed();
    setFeedEntries(entries);
  }, []);

  return (
    <Tabs
      defaultValue="mine"
      className="gap-4"
      onValueChange={(value) => {
        if (value === "team") {
          void refreshFeed();
        }
      }}
    >
      <TabsList className="w-full justify-start rounded-2xl bg-slate-100/90 p-1.5">
        <TabsTrigger value="mine">내 일지</TabsTrigger>
        <TabsTrigger value="team">팀원 일지</TabsTrigger>
      </TabsList>
      <div className="p-5">
        <TabsContent value="mine" className="mt-3">
          <WeeklyChecklistBoard data={boardData} onAutosaveComplete={refreshFeed} />
        </TabsContent>
        <TabsContent value="team" className="mt-3">
          <WeeklyChecklistJournalFeed entries={feedEntries} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
