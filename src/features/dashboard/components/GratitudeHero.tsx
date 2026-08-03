import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Heart } from "lucide-react";

import { getTodayGratitudePosts } from "@/features/board/queries/getTodayGratitudePosts";
import { GratitudeComposer } from "@/features/dashboard/components/GratitudeComposer";
import { cn } from "@/lib/utils";

export async function GratitudeHero() {
  const { posts, error, todayLabel } = await getTodayGratitudePosts();

  return (
    <section id="today-gratitude" className="scroll-mt-6 space-y-4">
      <div className="rounded-2xl border border-border bg-card px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-2 border-b border-border pb-6 text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">오늘의 나눔</p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">오늘에 감사</h1>
          <p className="text-sm text-muted-foreground">
            {todayLabel} · 작은 감사도 함께 나누면 하루가 더 밝아져요.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <GratitudeComposer />

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
              감사 글을 불러오지 못했습니다: {error}
            </div>
          ) : null}

          {!error && posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
              <Heart className="mx-auto size-6 text-amber-400" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">아직 오늘의 감사 글이 없어요.</p>
              <p className="mt-1 text-sm text-muted-foreground">첫 번째로 감사한 마음을 남겨 보세요.</p>
            </div>
          ) : null}

          {posts.length > 0 ? (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className={cn(
                    "rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50/60 to-sky-50/40 px-4 py-4 sm:px-5",
                  )}
                >
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{post.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {post.author_username} ·{" "}
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
