"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };

const sheetUrlSchema = z
  .string()
  .trim()
  .url("올바른 URL 형식이 아닙니다.")
  .refine(
    (url) => /\.(png|jpe?g|webp|pdf)(\?|#|$)/i.test(url),
    "PNG, JPG, WEBP, PDF URL만 등록할 수 있습니다.",
  );

async function assertSongInSetlist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setlistId: string,
  songId: string,
) {
  const { data } = await supabase
    .from("setlist_songs")
    .select("song_id")
    .eq("setlist_id", setlistId)
    .eq("song_id", songId)
    .maybeSingle();
  return Boolean(data);
}

export async function updateSongSheetMusicUrl(raw: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      setlistId: z.string().uuid(),
      songId: z.string().uuid(),
      sheetMusicUrl: z.string().trim().nullable(),
    })
    .safeParse(raw);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { setlistId, songId, sheetMusicUrl } = parsed.data;

  if (sheetMusicUrl) {
    const urlCheck = sheetUrlSchema.safeParse(sheetMusicUrl);
    if (!urlCheck.success) {
      return { ok: false, message: urlCheck.error.issues[0]?.message ?? "URL 형식이 올바르지 않습니다." };
    }
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const inList = await assertSongInSetlist(supabase, setlistId, songId);
    if (!inList) return { ok: false, message: "이 송리스트에 없는 곡입니다." };

    const { error } = await supabase
      .from("songs")
      .update({ sheet_music_url: sheetMusicUrl })
      .eq("id", songId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}
