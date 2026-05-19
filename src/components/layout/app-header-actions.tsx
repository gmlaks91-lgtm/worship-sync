"use client";

import Link from "next/link";

import { HeaderPointsBadge } from "@/features/points/components/HeaderPointsBadge";
import { signOut } from "@/features/auth/actions";
import { AddSetlistTriggerButton } from "@/features/setlist/components/AddSetlistDialog";
import { PwaInstallButton } from "@/components/layout/PwaInstallButton";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppHeaderActionsProps = {
  isLoggedIn: boolean;
  canManageSetlists: boolean;
  teamMembers: Array<{ id: string; username: string }>;
  recentSongWarningByVideoId: Record<string, number>;
};

export function AppHeaderActions({
  isLoggedIn,
  canManageSetlists,
  teamMembers,
  recentSongWarningByVideoId,
}: AppHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <PwaInstallButton />
      <HeaderPointsBadge />
      {isLoggedIn ? (
        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
        >
          내 프로필
        </Link>
      ) : null}
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

