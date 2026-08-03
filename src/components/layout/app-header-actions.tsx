"use client";

import { HeaderPointsBadge } from "@/features/points/components/HeaderPointsBadge";
import { AddSetlistTriggerButton } from "@/features/setlist/components/AddSetlistDialog";

type AppHeaderActionsProps = {
  isLoggedIn: boolean;
  canManageSetlists: boolean;
  teamMembers: Array<{ id: string; username: string }>;
  recentSongWarningByVideoId: Record<string, number>;
};

/** 헤더에는 포인트(+ 데스크톱 셋리스트)만 두고, 프로필·로그아웃·설치는 메뉴로 */
export function AppHeaderActions({
  canManageSetlists,
  teamMembers,
  recentSongWarningByVideoId,
}: AppHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <HeaderPointsBadge className="border-sky-300/35 bg-sky-950/40 text-sky-50 hover:border-sky-200/50 hover:bg-sky-900/55 hover:text-white [&_svg]:text-amber-200" />
      {canManageSetlists ? (
        <AddSetlistTriggerButton
          variant="outline"
          size="sm"
          className="hidden border-sky-300/40 bg-sky-950/35 text-sky-50 hover:bg-sky-900/55 sm:inline-flex"
          teamMembers={teamMembers}
          recentSongWarningByVideoId={recentSongWarningByVideoId}
        />
      ) : null}
    </div>
  );
}
