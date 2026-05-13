"use client";

import { useRouter } from "next/navigation";

import { CreatePostForm } from "@/features/board/components/CreatePostForm";
import { PostCard } from "@/features/board/components/PostCard";
import type { BoardPost } from "@/features/board/queries/getBoardFeed";
import type { PostCategory } from "@/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type BoardFeedProps = {
  category: PostCategory;
  posts: BoardPost[];
  currentUserId: string | null;
};

const tabs: { value: PostCategory; label: string; emoji: string; short: string }[] = [
  { value: "prayer", label: "공지사항", emoji: "📢", short: "공지" },
  { value: "feedback", label: "합주 피드백", emoji: "🎸", short: "피드백" },
  { value: "general", label: "자유 게시판", emoji: "💬", short: "자유" },
];

export function BoardFeed({ category, posts, currentUserId }: BoardFeedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-8">
      <Tabs
        value={category}
        onValueChange={(v) => {
          const next = v as PostCategory;
          router.push(`/board?category=${next}`);
        }}
        className="gap-6"
      >
        <TabsList variant="line" className="h-auto w-full justify-between gap-1 p-0 sm:justify-start">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className={cn(
                "flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold sm:flex-none sm:px-4 sm:text-sm",
                "data-active:after:opacity-100",
              )}
            >
              <span className="mr-1" aria-hidden>
                {t.emoji}
              </span>
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-0 flex flex-col gap-6 outline-none">
            {t.value === category ? <CreatePostForm category={category} /> : null}
            {t.value === category && posts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/80 bg-muted/25 px-5 py-12 text-center text-sm text-muted-foreground">
                아직 글이 없습니다. 첫 글을 남겨 보세요.
              </p>
            ) : null}
            {t.value === category ? (
              <div className="flex flex-col gap-6">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} currentUserId={currentUserId} />
                ))}
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
