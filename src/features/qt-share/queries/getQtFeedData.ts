import "server-only";

import { unstable_noStore } from "next/cache";

import { getKstTodayYmd, toKstYmdFromIso } from "@/features/qt-share/lib/dates";
import { createClient } from "@/utils/supabase/server";

export type QtPostRow = {
  id: string;
  imageUrl: string;
  bibleVerses: string;
  createdAt: string;
  userId: string | null;
  authorName: string;
  isToday: boolean;
};

export type QtCommentRow = {
  id: string;
  postId: string;
  userId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  quotedVerse: string;
  content: string;
  createdAt: string;
};

export type QtFeedData = {
  post: QtPostRow | null;
  comments: QtCommentRow[];
  /** 현재 사용자가 리더/관리자라 모든 글을 수정·삭제할 수 있는지 */
  canManage: boolean;
  error: string | null;
};

async function mapComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<{
    id: string;
    post_id: string;
    user_id: string | null;
    quoted_verse: string;
    content: string;
    created_at: string;
  }>,
): Promise<QtCommentRow[]> {
  const authorIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
  const profilesById = new Map<string, { username: string; avatar_url: string | null }>();

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .in("id", authorIds);
    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, {
        username: profile.username,
        avatar_url: profile.avatar_url,
      });
    }
  }

  return rows.map((row) => {
    const profile = row.user_id ? profilesById.get(row.user_id) : null;
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      authorName: profile?.username ?? "팀원",
      authorAvatarUrl: profile?.avatar_url ?? null,
      quotedVerse: row.quoted_verse ?? "",
      content: row.content ?? "",
      createdAt: row.created_at,
    };
  });
}

export async function getQtFeedData(): Promise<QtFeedData> {
  unstable_noStore();

  const empty: QtFeedData = {
    post: null,
    comments: [],
    canManage: false,
    error: null,
  };

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let canManage = false;
    if (user) {
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      canManage = me?.role === "leader" || me?.role === "admin";
    }

    const { data: posts, error: postsErr } = await supabase
      .from("qt_posts")
      .select("id,image_url,bible_verses,created_at,user_id")
      .order("created_at", { ascending: false })
      .limit(1);

    if (postsErr) throw new Error(postsErr.message);

    const postRow = posts?.[0] ?? null;
    if (!postRow) return { ...empty, canManage };

    let authorName = "팀원";
    if (postRow.user_id) {
      const { data: author } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", postRow.user_id)
        .maybeSingle();
      if (author?.username) authorName = author.username;
    }

    const todayYmd = getKstTodayYmd();
    const post: QtPostRow = {
      id: postRow.id,
      imageUrl: postRow.image_url,
      bibleVerses: postRow.bible_verses ?? "",
      createdAt: postRow.created_at,
      userId: postRow.user_id,
      authorName,
      isToday: toKstYmdFromIso(postRow.created_at) === todayYmd,
    };

    const { data: commentRows, error: commentsErr } = await supabase
      .from("qt_comments")
      .select("id,post_id,user_id,quoted_verse,content,created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (commentsErr) throw new Error(commentsErr.message);

    const comments = await mapComments(supabase, commentRows ?? []);

    return {
      post,
      comments,
      canManage,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { ...empty, error: message };
  }
}
