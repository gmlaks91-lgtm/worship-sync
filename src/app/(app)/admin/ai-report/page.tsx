import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminAiReportPanel } from "@/features/ai-report/components/AdminAiReportPanel";
import { getAiReportAdminPreview } from "@/features/ai-report/queries/getLatestAiReport";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAiReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/ai-report");
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

  const { currentWeekLabel, latestReport } = await getAiReportAdminPreview();

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI 주간 리포트</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          청년부원의 경건 일지와 기도 제목을 익명으로 분석해, 공동체 전체가 읽을 주간 요약을
          생성합니다.
        </p>
      </header>

      <AdminAiReportPanel currentWeekLabel={currentWeekLabel} latestReport={latestReport} />

      <footer className="flex flex-wrap gap-3 border-t border-border/50 pt-6">
        <Link href="/journal" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          경건 일지 보기
        </Link>
        <Link href="/more" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          마이페이지
        </Link>
      </footer>
    </div>
  );
}
