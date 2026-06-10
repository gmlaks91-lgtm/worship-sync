import { PageIntro } from "@/components/layout/page-intro";
import { BoardFeed } from "@/features/board/components/BoardFeed";
import { getBoardFeed } from "@/features/board/queries/getBoardFeed";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManage = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    canManage = profile?.role === "leader" || profile?.role === "admin";
  }

  const { posts, error } = await getBoardFeed("prayer");

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageIntro
        eyebrow="소통"
        title="공지사항"
        description="청년부와 찬양팀의 중요한 소식을 확인하세요."
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          게시글을 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <BoardFeed
        category="prayer"
        posts={posts}
        currentUserId={user?.id ?? null}
        showTabs={false}
        canManage={canManage}
      />
    </div>
  );
}
