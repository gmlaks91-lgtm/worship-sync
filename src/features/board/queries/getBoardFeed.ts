import "server-only";

import type { PostCategory } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type BoardComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_username: string;
};

export type BoardPost = {
  id: string;
  user_id: string;
  category: PostCategory;
  title: string;
  topic: string | null;
  content: string;
  mentioned_user_ids: string[];
  is_pinned: boolean;
  created_at: string;
  author_username: string;
  comments: BoardComment[];
};

const CATEGORIES: PostCategory[] = ["prayer", "feedback", "general"];

export function normalizeCategory(raw: string | undefined): PostCategory {
  if (raw && CATEGORIES.includes(raw as PostCategory)) return raw as PostCategory;
  return "prayer";
}

export async function getBoardFeed(category: PostCategory): Promise<{
  posts: BoardPost[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: postsRaw, error: postsError } = await supabase
      .from("posts")
      .select("id, user_id, category, title, topic, content, mentioned_user_ids, is_pinned, created_at")
      .eq("category", category)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) {
      return { posts: [], error: postsError.message };
    }

    if (!postsRaw?.length) {
      return { posts: [], error: null };
    }

    const authorIds = [...new Set(postsRaw.map((p) => p.user_id))];
    const postIds = postsRaw.map((p) => p.id);

    const [{ data: profiles }, { data: commentsRaw }] = await Promise.all([
      supabase.from("profiles").select("id, username").in("id", authorIds),
      supabase
        .from("comments")
        .select("id, post_id, user_id, content, created_at")
        .in("post_id", postIds)
        .order("created_at", { ascending: true }),
    ]);

    const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.username] as const));
    const commentAuthorIds = [...new Set((commentsRaw ?? []).map((c) => c.user_id))];
    const missing = commentAuthorIds.filter((id) => !nameByUser.has(id));

    if (missing.length) {
      const { data: extra } = await supabase.from("profiles").select("id, username").in("id", missing);
      for (const p of extra ?? []) nameByUser.set(p.id, p.username);
    }

    const commentsByPost = new Map<string, BoardComment[]>();
    for (const c of commentsRaw ?? []) {
      const list = commentsByPost.get(c.post_id) ?? [];
      list.push({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        author_username: nameByUser.get(c.user_id) ?? "알 수 없음",
      });
      commentsByPost.set(c.post_id, list);
    }

    const posts: BoardPost[] = postsRaw.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      category: p.category as PostCategory,
      title: p.title ?? "",
      topic: p.topic ?? null,
      content: p.content,
      mentioned_user_ids: p.mentioned_user_ids ?? [],
      is_pinned: p.is_pinned ?? false,
      created_at: p.created_at,
      author_username: nameByUser.get(p.user_id) ?? "알 수 없음",
      comments: commentsByPost.get(p.id) ?? [],
    }));

    return { posts, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { posts: [], error: message };
  }
}
