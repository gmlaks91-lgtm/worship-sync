"use client";

import { signOut } from "@/features/auth/actions";
import { AddSetlistTriggerButton } from "@/features/setlist/components/AddSetlistDialog";
import { Button } from "@/components/ui/button";

type AppHeaderActionsProps = {
  canManageSetlists: boolean;
  teamMembers: Array<{ id: string; username: string }>;
  recentSongWarningByVideoId: Record<string, number>;
};

export function AppHeaderActions({
  canManageSetlists,
  teamMembers,
  recentSongWarningByVideoId,
}: AppHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {canManageSetlists ? (
        <AddSetlistTriggerButton
          variant="outline"
          size="sm"
          className="border-border/80"
          teamMembers={teamMembers}
          recentSongWarningByVideoId={recentSongWarningByVideoId}
        />
      ) : null}
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
          로그아웃
        </Button>
      </form>
    </div>
  );
}

