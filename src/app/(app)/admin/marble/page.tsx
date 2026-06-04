import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminMarbleManager } from "@/features/marble/components/AdminMarbleManager";
import { getBlueMarbleTeams } from "@/features/marble/queries/getBlueMarbleTeams";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// ⚠️ 임시 개발용 우회 스위치.
//  - true 로 두면 role 과 무관하게 관리 UI(입력창/버튼)가 보입니다.
//  - 단, 실제 저장/일괄반영은 requireLeader + DB RLS(is_leader) 가 다시 막으므로
//    기능 테스트까지 하려면 profiles.role 을 'leader'/'admin' 으로 바꿔야 합니다.
//  - 배포 전 반드시 false 로 되돌리세요. (운영에서는 항상 무시)
const DEV_BYPASS_ADMIN_CHECK = false;

export default async function AdminMarblePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/marble");
  }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const hasRole = me?.role === "leader" || me?.role === "admin";
  const bypassActive = DEV_BYPASS_ADMIN_CHECK && process.env.NODE_ENV !== "production";
  const canManage = hasRole || bypassActive;

  if (!canManage) {
    return (
      <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        <p>접근 권한이 없습니다. 리더/관리자만 접근할 수 있습니다.</p>
        {/* 디버그: 현재 감지된 role 을 표시해 권한 문제를 바로 진단할 수 있게 함 */}
        <p className="text-xs opacity-80">
          현재 감지된 role: <code>{me?.role ?? "없음(프로필 미생성)"}</code> · 필요한 값:{" "}
          <code>leader</code> 또는 <code>admin</code>
        </p>
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
            목장별 추가 점수를 입력해 두었다가, 주일에 일괄 반영하면 50점 = 1칸 룰에 따라 말이 자동 이동합니다.
          </p>
        </div>
        <Link href="/marble" className={buttonVariants({ variant: "outline", size: "sm" })}>
          보드판 보기
        </Link>
      </header>

      {bypassActive && !hasRole ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ 개발용 권한 우회가 켜져 있습니다 (DEV_BYPASS_ADMIN_CHECK). UI만 표시되며, 실제
          저장/일괄반영은 DB 권한(RLS) 때문에 실패합니다. 정상 동작하려면 <code>profiles.role</code>을{" "}
          <code>leader</code>/<code>admin</code>으로 변경하세요.
        </div>
      ) : null}

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
