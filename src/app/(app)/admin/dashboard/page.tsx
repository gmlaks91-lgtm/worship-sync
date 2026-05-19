import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboardCharts } from "@/features/admin-dashboard/components/AdminDashboardCharts";
import { getAdminDashboardStats } from "@/features/admin-dashboard/queries/getAdminDashboardStats";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/dashboard");
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

  let stats;
  try {
    stats = await getAdminDashboardStats();
  } catch (e) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        통계를 불러오지 못했습니다:{" "}
        {e instanceof Error ? e.message : "SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요."}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">데이터 대시보드</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          찬양 사용량, 청년부 경건 일지 참여, 상점 판매 현황을 한눈에 확인합니다.
        </p>
      </header>

      <AdminDashboardCharts stats={stats} />

      <footer className="flex flex-wrap gap-3 border-t border-border/50 pt-6">
        <Link href="/more" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          마이페이지
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          홈으로
        </Link>
      </footer>
    </div>
  );
}
