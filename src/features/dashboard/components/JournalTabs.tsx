"use client";

import { useCallback, useState } from "react";

import { fetchWeeklyChecklistJournalFeed } from "@/features/dashboard/actions/weeklyChecklistActions";
import { TeamJournalFilterTabs } from "@/features/dashboard/components/TeamJournalFilterTabs";
import { WeeklyChecklistBoard } from "@/features/dashboard/components/WeeklyChecklistBoard";
import { WeeklyChecklistJournalFeed } from "@/features/dashboard/components/WeeklyChecklistJournalFeed";
import type { WeeklyChecklistBoardData } from "@/features/dashboard/queries/getWeeklyChecklistBoardData";
import type { WeeklyChecklistJournalFeedEntry } from "@/features/dashboard/queries/getWeeklyChecklistJournalData";
import type { JournalTeamFilter, UserTeam } from "@/features/teams/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JournalTabsProps = {
  boardData: WeeklyChecklistBoardData;
  initialFeed: WeeklyChecklistJournalFeedEntry[];
  userTeams: UserTeam[];
  initialDayYmd?: string | null;
};

export function JournalTabs({ boardData, initialFeed, userTeams, initialDayYmd }: JournalTabsProps) {
  const [feedEntries, setFeedEntries] = useState(initialFeed);
  const [teamFilter, setTeamFilter] = useState<JournalTeamFilter>("all");
  const [feedLoading, setFeedLoading] = useState(false);

  const refreshFeed = useCallback(async (filter: JournalTeamFilter = teamFilter) => {
    setFeedLoading(true);
    try {
      const entries = await fetchWeeklyChecklistJournalFeed(filter);
      setFeedEntries(entries);
    } finally {
      setFeedLoading(false);
    }
  }, [teamFilter]);

  const handleTeamFilterChange = useCallback(
    (filter: JournalTeamFilter) => {
      setTeamFilter(filter);
      void refreshFeed(filter);
    },
    [refreshFeed],
  );

  return (
    <Tabs
      defaultValue="mine"
      className="gap-4"
      onValueChange={(value) => {
        if (value === "team") {
          void refreshFeed(teamFilter);
        }
      }}
    >
      <TabsList className="w-full justify-start rounded-2xl bg-slate-100/90 p-1.5">
        <TabsTrigger value="mine">내 일지</TabsTrigger>
        <TabsTrigger value="team">팀원 일지</TabsTrigger>
      </TabsList>
      <div className="p-5">
        <TabsContent value="mine" className="mt-3">
          <WeeklyChecklistBoard data={boardData} initialDayYmd={initialDayYmd} />
        </TabsContent>
        <TabsContent value="team" className="mt-3 space-y-4">
          <TeamJournalFilterTabs
            teams={userTeams}
            value={teamFilter}
            onChange={handleTeamFilterChange}
            disabled={feedLoading}
          />
          <WeeklyChecklistJournalFeed
            entries={feedEntries}
            hasTeams={userTeams.length > 0}
            teamFilter={teamFilter}
            loading={feedLoading}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
