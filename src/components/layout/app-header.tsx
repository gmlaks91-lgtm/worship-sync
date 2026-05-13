import { AppHeaderActions } from "@/components/layout/app-header-actions";
import { AppHeaderClient } from "@/components/layout/app-header-client";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
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
    canManageSetlists = row?.role === "leader" || row?.role === "admin";
    teamMembers = (members ?? []) as { id: string; username: string }[];
  }

  return (
    <AppHeaderClient
      className={className}
      isLoggedIn={Boolean(user)}
      canManageSetlists={canManageSetlists}
      teamMembers={teamMembers}
      recentSongWarningByVideoId={recentSongWarningByVideoId}
    />
  );
}
