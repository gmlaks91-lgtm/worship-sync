import { AppHeaderClient } from "@/components/layout/app-header-client";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import type { ProfileRole } from "@/types/database";
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
  let userRole: ProfileRole | null = null;

  if (user) {
    const [{ data: row }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("id, username").order("username", { ascending: true }),
    ]);
    recentSongWarningByVideoId = await getRecentSongWarningByVideoId();
    userRole = row?.role ?? null;
    canManageSetlists = row?.role === "leader" || row?.role === "admin";
    teamMembers = (members ?? []) as { id: string; username: string }[];
  }

  return (
    <AppHeaderClient
      className={className}
      isLoggedIn={Boolean(user)}
      userRole={userRole}
      canManageSetlists={canManageSetlists}
      teamMembers={teamMembers}
      recentSongWarningByVideoId={recentSongWarningByVideoId}
    />
  );
}
