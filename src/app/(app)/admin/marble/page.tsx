import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminMarbleManager } from "@/features/marble/components/AdminMarbleManager";
import { getBlueMarbleTeams } from "@/features/marble/queries/getBlueMarbleTeams";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminMarblePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/marble");
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

  const { teams, error } = await getBlueMarbleTeams();

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">부루마블 목장 관리</h1>
          <p className="text-sm text-muted-foreground">
            각 목장의 점수·위치(칸 수)를 수정하고 목자 얼굴 이미지를 업로드하세요.
          </p>
        </div>
        <Link href="/marble" className={buttonVariants({ variant: "outline", size: "sm" })}>
          보드판 보기
        </Link>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          목장 정보를 불러오지 못했습니다: {error}
        </div>
      ) : (
        <AdminMarbleManager teams={teams} />
      )}
    </div>
  );
}
