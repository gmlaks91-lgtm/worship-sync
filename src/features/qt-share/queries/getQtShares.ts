import "server-only";

import { unstable_noStore } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export type QtShareRow = {
  id: string;
  userId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  message: string;
  imageUrl: string | null;
  createdAt: string;
};

export async function getQtShares(): Promise<{ shares: QtShareRow[]; error: string | null }> {
  unstable_noStore();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("qt_shares")
      .select("id,user_id,author_name,author_avatar_url,message,image_url,created_at")
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) throw new Error(error.message);

    const shares: QtShareRow[] = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url,
      message: row.message ?? "",
      imageUrl: row.image_url,
      createdAt: row.created_at,
    }));

    return { shares, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { shares: [], error: message };
  }
}
