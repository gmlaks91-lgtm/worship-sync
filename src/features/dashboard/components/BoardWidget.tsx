import Link from "next/link";
import { ArrowRight, Megaphone, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

import { getBoardFeed } from "@/features/board/queries/getBoardFeed";
import { announcementHeadline } from "@/features/board/lib/announcement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function BoardWidget() {
  const { posts } = await getBoardFeed("prayer");

  // getBoardFeed가 고정(is_pinned) 우선, 최신순으로 정렬해 반환한다.
  const recentPosts = posts.slice(0, 4);

  return (
    <Card className="surface-card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="inline-flex items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" aria-hidden />
            공지사항
          </span>
          <Link
            href="/announcements"
            className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
          >
            더보기
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 공지사항이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {recentPosts.map((post) => (
              <li key={post.id}>
                <Link
                  href="/announcements"
                  className="flex items-start gap-3 py-3 transition-colors hover:bg-muted/30 -mx-2 rounded-lg px-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                      post.is_pinned
                        ? "bg-sky-100 text-sky-700"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {post.is_pinned ? (
                      <Pin className="size-3" />
                    ) : (
                      <Megaphone className="size-3" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="flex items-center gap-2">
                      {post.is_pinned ? (
                        <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                          고정
                        </span>
                      ) : null}
                      <span className="truncate text-sm font-medium text-foreground">
                        {announcementHeadline(post.content)}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {post.author_username} ·{" "}
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
