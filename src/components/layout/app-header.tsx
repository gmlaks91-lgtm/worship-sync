import { AppHeaderClient } from "@/components/layout/app-header-client";
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
  let userRole: ProfileRole | null = null;

  if (user) {
    const { data: row } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    userRole = row?.role ?? null;
  }

  return <AppHeaderClient className={className} isLoggedIn={Boolean(user)} userRole={userRole} />;
}
