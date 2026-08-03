import "server-only";

import { addDaysYmdKst, todayYmdKst } from "@/lib/date-kst";
import { createClient } from "@/utils/supabase/server";

export type GratitudePost = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  author_username: string;
};

/** 오늘(KST) 올라온 '감사' 글 — 메인 히어로용 */
export async function getTodayGratitudePosts(limit = 12): Promise<{
  posts: GratitudePost[];
  error: string | null;
  todayLabel: string;
}> {
  const today = todayYmdKst();
  const tomorrow = addDaysYmdKst(today, 1);
  const startIso = `${today}T00:00:00+09:00`;
  const endIso = `${tomorrow}T00:00:00+09:00`;

  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(startIso));

  try {
    const supabase = await createClient();
    const { data: postsRaw, error } = await supabase
      .from("posts")
      .select("id, user_id, title, content, created_at")
      .eq("category", "general")
      .eq("topic", "gratitude")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { posts: [], error: error.message, todayLabel };
    }

    if (!postsRaw?.length) {
      return { posts: [], error: null, todayLabel };
    }

    const authorIds = [...new Set(postsRaw.map((p) => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", authorIds);
    const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.username] as const));

    return {
      posts: postsRaw.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        title: p.title ?? "",
        content: p.content,
        created_at: p.created_at,
        author_username: nameByUser.get(p.user_id) ?? "알 수 없음",
      })),
      error: null,
      todayLabel,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { posts: [], error: message, todayLabel };
  }
}
