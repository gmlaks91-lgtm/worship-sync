"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadQtImage } from "@/features/qt-share/lib/storage-server";
import { createClient } from "@/utils/supabase/server";

const createSchema = z.object({
  message: z.string().max(4000).default(""),
});

export type QtShareActionResult =
  | {
      ok: true;
      share: {
        id: string;
        userId: string | null;
        authorName: string;
        authorAvatarUrl: string | null;
        message: string;
        imageUrl: string | null;
        createdAt: string;
      };
    }
  | { ok: false; message: string };

export async function createQtShare(formData: FormData): Promise<QtShareActionResult> {
  const message = String(formData.get("message") ?? "").trim();
  const parsed = createSchema.safeParse({ message });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const fileRaw = formData.get("image");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;

  if (!parsed.data.message && !file) {
    return { ok: false, message: "나눔 글이나 QT 이미지를 입력해 주세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await uploadQtImage(file);
    }

    const { data: inserted, error } = await supabase
      .from("qt_shares")
      .insert({
        user_id: user.id,
        author_name: profile?.username?.trim() || "팀원",
        author_avatar_url: profile?.avatar_url ?? null,
        message: parsed.data.message,
        image_url: imageUrl,
      })
      .select("id,user_id,author_name,author_avatar_url,message,image_url,created_at")
      .single();

    if (error || !inserted) {
      return { ok: false, message: error?.message ?? "저장에 실패했습니다." };
    }

    revalidatePath("/qt");

    return {
      ok: true,
      share: {
        id: inserted.id,
        userId: inserted.user_id,
        authorName: inserted.author_name,
        authorAvatarUrl: inserted.author_avatar_url,
        message: inserted.message ?? "",
        imageUrl: inserted.image_url,
        createdAt: inserted.created_at,
      },
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}
