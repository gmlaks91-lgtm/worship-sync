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
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-amber-100/90 hover:bg-white/10 hover:text-white",
          )}
        >
          내 프로필
        </Link>
      ) : null}
      {canManageSetlists ? (
        <AddSetlistTriggerButton
          variant="outline"
          size="sm"
          className="border-amber-400/40 bg-emerald-900/40 text-amber-100 hover:bg-emerald-800"
          teamMembers={teamMembers}
          recentSongWarningByVideoId={recentSongWarningByVideoId}
        />
      ) : null}
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-amber-100/90 hover:bg-white/10 hover:text-white"
        >
          로그아웃
        </Button>
      </form>
    </div>
  );
}

