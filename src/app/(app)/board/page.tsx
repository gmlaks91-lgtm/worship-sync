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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">게시판</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          기도 제목, 합주 피드백, 가벼운 나눔까지 한곳에서 기록하세요. 댓글로 서로를 격려할 수 있습니다.
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
