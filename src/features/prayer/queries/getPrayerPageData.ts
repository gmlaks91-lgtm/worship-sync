import "server-only";

import { createClient } from "@/utils/supabase/server";

export type PrayerCardRow = {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author_name: string;
  reaction_count: number;
  reacted_by_me: boolean;
  /** 현재 사용자가 이 글의 작성자인지 (익명이어도 본인 수정/삭제용) */
  is_owner: boolean;
};

export async function getPrayerPageData(): Promise<{
  currentUserId: string | null;
  canManage: boolean;
  prayers: PrayerCardRow[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id ?? null;

    let canManage = false;
    if (user) {
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      canManage = me?.role === "leader" || me?.role === "admin";
    }

    const { data: requests, error: requestErr } = await supabase
      .from("prayer_requests")
      .select("id, content, user_id, is_anonymous, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (requestErr) return { currentUserId, canManage, prayers: [], error: requestErr.message };

    const ids = (requests ?? []).map((r) => r.id);
    const userIds = [...new Set((requests ?? []).map((r) => r.user_id))];

    const [{ data: reactions }, { data: profiles }] = await Promise.all([
      ids.length
        ? supabase.from("prayer_reactions").select("request_id, user_id").in("request_id", ids)
        : Promise.resolve({ data: [] as Array<{ request_id: string; user_id: string }> }),
      userIds.length
        ? supabase.from("profiles").select("id, username").in("id", userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; username: string }> }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
    const reactionMap = new Map<string, Array<{ user_id: string }>>();
    for (const r of reactions ?? []) {
      const list = reactionMap.get(r.request_id) ?? [];
      list.push({ user_id: r.user_id });
      reactionMap.set(r.request_id, list);
    }

    const prayers: PrayerCardRow[] = (requests ?? []).map((row) => {
      const reactionRows = reactionMap.get(row.id) ?? [];
      return {
        id: row.id,
        content: row.content,
        is_anonymous: row.is_anonymous,
        created_at: row.created_at,
        author_name: row.is_anonymous ? "익명" : profileMap.get(row.user_id) ?? "알 수 없음",
        reaction_count: reactionRows.length,
        reacted_by_me: currentUserId ? reactionRows.some((r) => r.user_id === currentUserId) : false,
        is_owner: currentUserId ? row.user_id === currentUserId : false,
      };
    });

    return { currentUserId, canManage, prayers, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { currentUserId: null, canManage: false, prayers: [], error: message };
  }
}
