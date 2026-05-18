import Link from "next/link";

import { getBoardFeed } from "@/features/board/queries/getBoardFeed";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export async function BoardWidget() {
  const { posts } = await getBoardFeed();

  // 최근 3개의 게시글만 표시
  const recentPosts = posts.slice(0, 3);

  return (
    <Card className="surface-card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>공지사항</span>
          <Link
            href="/board"
            className="text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            더보기 →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 공지사항이 없습니다.</p>
        ) : (
          recentPosts.map((post) => (
            <div key={post.id} className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/board/${post.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                  {post.category && (
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {post.author_username} •{" "}
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}