import { redirect } from "next/navigation";

import { AuthCodeManager } from "@/features/auth/components/AuthCodeManager";
import { getAuthCodeForAdmin } from "@/features/auth/actions/authCodeActions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAuthCodePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/auth-code");
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

  const { code, error } = await getAuthCodeForAdmin();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">인증 코드 설정</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          찬양팀 멤버 회원가입에 사용되는 인증 코드를 관리합니다.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          인증 코드를 불러오지 못했습니다: {error}
        </div>
      ) : (
        <AuthCodeManager initialCode={code ?? ""} />
      )}
    </div>
  );
}
