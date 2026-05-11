"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const registerSheetSchema = z.object({
  songId: z.string().uuid(),
  imageUrls: z.array(z.string().url()).min(1, "악보 이미지를 1장 이상 업로드해 주세요."),
  memo: z.string().max(4000).optional(),
});

export type RegisterSheetResult = { ok: true } | { ok: false; message: string };

export async function registerSheet(
  raw: z.infer<typeof registerSheetSchema>,
): Promise<RegisterSheetResult> {
  const parsed = registerSheetSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  const { songId, imageUrls } = parsed.data;
  const memo =
    parsed.data.memo === undefined
      ? null
      : parsed.data.memo.trim().length > 0
        ? parsed.data.memo.trim()
        : null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id")
      .eq("id", songId)
      .maybeSingle();

    if (songError || !song) {
      return { ok: false, message: "곡을 찾을 수 없습니다." };
    }

    const { error: insertError } = await supabase.from("sheets").insert({
      song_id: songId,
      image_urls: imageUrls,
      memo,
    });

    if (insertError) {
      return { ok: false, message: insertError.message };
    }

    revalidatePath("/");
    revalidatePath("/sheets");
    revalidatePath(`/sheets/${songId}`);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
