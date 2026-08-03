import { PageIntro } from "@/components/layout/page-intro";
import { BoardFeed } from "@/features/board/components/BoardFeed";
import { getBoardFeed } from "@/features/board/queries/getBoardFeed";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function FreeBoardPage() {
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

  const [{ posts, error }, { data: memberRows }] = await Promise.all([
    getBoardFeed("general"),
    supabase.from("profiles").select("id, username").order("username", { ascending: true }),
  ]);

  const members = (memberRows ?? [])
    .filter((m) => m.id !== user?.id)
    .map((m) => ({ id: m.id, username: m.username }));

  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageIntro
        eyebrow="소통"
        title="자유 게시판"
        description="청년부원들과 자유롭게 나누고 소통해 보세요."
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          게시글을 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <BoardFeed
        category="general"
        posts={posts}
        currentUserId={user?.id ?? null}
        members={members}
        showTabs={false}
        canManage={canManage}
      />
    </div>
  );
}
