import Link from "next/link";
import { redirect } from "next/navigation";

import { ScheduleRegistrationForm } from "@/features/schedule/components/ScheduleRegistrationForm";
import { getRecentSongWarningByVideoId } from "@/features/setlist/queries/getSongUsageStats";
import { getTeamMembers } from "@/features/team/queries/getTeamMembers";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/schedule");
  }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const canManage = me?.role === "leader" || me?.role === "admin";
  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        접근 권한이 없습니다. 리더/관리자만 접근할 수 있습니다.
      </div>
    );
  }

  const [{ members }, recentSongWarningByVideoId] = await Promise.all([
    getTeamMembers(),
    getRecentSongWarningByVideoId(),
  ]);

  const teamMembers = members.map((m) => ({ id: m.id, username: m.username }));

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">일정·송리스트 등록</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          카카오톡 공지를 붙여넣으면 AI가 날짜·곡·라인업을 채워 줍니다. 확인 후 일정과 송리스트를
          한 번에 저장합니다.
        </p>
      </header>

      <ScheduleRegistrationForm
        teamMembers={teamMembers}
        recentSongWarningByVideoId={recentSongWarningByVideoId}
      />

      <footer className="flex flex-wrap gap-3 border-t border-border/50 pt-6">
        <Link href="/schedule" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          일정 캘린더
        </Link>
        <Link href="/more" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          마이페이지
        </Link>
      </footer>
    </div>
  );
}
