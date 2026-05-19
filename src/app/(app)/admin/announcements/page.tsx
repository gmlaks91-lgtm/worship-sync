import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPushAnnouncements } from "@/features/push/components/AdminPushAnnouncements";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/announcements");
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

  let subscriberCount = 0;
  try {
    const admin = createAdminClient();
    const { data: generalProfiles } = await admin.from("profiles").select("id").eq("role", "general");
    const generalIds = (generalProfiles ?? []).map((p) => p.id);

    if (generalIds.length > 0) {
      const { count } = await admin
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .in("user_id", generalIds);
      subscriberCount = count ?? 0;
    }
  } catch {
    subscriberCount = 0;
  }

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">공지 푸시 알림</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          청년부원(general)에게 웹 푸시로 공지를 보냅니다. 필요하면 공지사항 게시판에도 함께 올릴 수
          있어요.
        </p>
      </header>

      <AdminPushAnnouncements subscriberCount={subscriberCount} />

      <footer className="flex flex-wrap gap-3 border-t border-border/50 pt-6">
        <Link href="/announcements" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          공지사항 보기
        </Link>
        <Link href="/more" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          마이페이지
        </Link>
      </footer>
    </div>
  );
}
