import Link from "next/link";

import { AppHeaderActions } from "@/components/layout/app-header-actions";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

type AppHeaderProps = {
  className?: string;
};

export async function AppHeader({ className }: AppHeaderProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canManageSetlists = false;
  let teamMembers: { id: string; username: string }[] = [];
  let recentSongWarningByVideoId: Record<string, number> = {};

  if (user) {
    const [{ data: row }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("id, username").order("username", { ascending: true }),
    ]);
    recentSongWarningByVideoId = await getRecentSongWarningByVideoId();
    canManageSetlists = row?.role === "leader";
    teamMembers = (members ?? []) as { id: string; username: string }[];
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-background",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-7">
        <Link href="/" className="group flex flex-col gap-0.5 transition-opacity hover:opacity-90">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            찬양팀
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Ahava</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">아하바 찬양팀</span>
          <AppHeaderActions
            canManageSetlists={canManageSetlists}
            teamMembers={teamMembers}
            recentSongWarningByVideoId={recentSongWarningByVideoId}
          />
        </div>
      </div>
    </header>
  );
}
