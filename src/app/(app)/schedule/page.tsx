import { SchedulesSection } from "@/features/schedule/components/SchedulesSection";
import { getSchedulesPageData } from "@/features/schedule/queries/getSchedulesPageData";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const { schedules, attendances, profiles, currentUserId, isLeader, error } =
    await getSchedulesPageData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          팀 캘린더
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          일정 · 참석
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          캘린더에서 일정을 확인하고 참석 여부를 공유하세요. 일정 추가와 삭제는 리더만 할 수 있습니다.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <SchedulesSection
        schedules={schedules}
        attendances={attendances}
        profiles={profiles}
        currentUserId={currentUserId}
        isLeader={isLeader}
      />
    </div>
  );
}
