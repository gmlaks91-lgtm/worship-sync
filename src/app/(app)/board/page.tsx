import { BoardFeed } from "@/features/board/components/BoardFeed";
import { getBoardFeed, normalizeCategory } from "@/features/board/queries/getBoardFeed";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: raw } = await searchParams;
  const category = normalizeCategory(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { posts, error } = await getBoardFeed(category);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">소통</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">공지사항</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          팀 공지사항과 중요한 소식을 확인하세요. 리더의 공지사항을 놓치지 않도록 주의해주세요.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          게시글을 불러오지 못했습니다: {error}
        </div>
      ) : null}

      <BoardFeed category={category} posts={posts} currentUserId={user?.id ?? null} />
    </div>
  );
}
