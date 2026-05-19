import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminTeamsManager } from "@/features/teams/components/AdminTeamsManager";
import { getAdminTeamsPageData } from "@/features/teams/queries/getAdminTeamsPageData";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/teams");
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

  const { teams, profiles, error } = await getAdminTeamsPageData();

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">팀 · 목장 관리</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          경건 일지 피드용 팀을 만들고, 멤버를 체크박스로 배정합니다. 배정은 즉시 반영되며, 한 명이 여러
          팀에 동시에 소속될 수 있습니다.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {error}
        </div>
      ) : (
        <AdminTeamsManager initialTeams={teams} profiles={profiles} />
      )}

      <footer className="flex flex-wrap gap-3 border-t border-border/50 pt-6">
        <Link href="/journal" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          경건 일지
        </Link>
        <Link href="/more" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          마이페이지
        </Link>
      </footer>
    </div>
  );
}
