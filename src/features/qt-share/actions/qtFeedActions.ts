"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadQtImage } from "@/features/qt-share/lib/storage-server";
import { createClient } from "@/utils/supabase/server";

const commentSchema = z.object({
  postId: z.string().uuid(),
  quotedVerse: z.string().max(2000).default(""),
  content: z.string().trim().min(1, "묵상 내용을 입력해 주세요.").max(8000),
});

const postSchema = z.object({
  bibleVerses: z.string().trim().min(1, "본문 말씀을 입력해 주세요.").max(20000),
});

const postIdSchema = z.string().uuid();

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

export type QtCommentPayload = {
  id: string;
  postId: string;
  userId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  quotedVerse: string;
  content: string;
  createdAt: string;
};

export type QtPostPayload = {
  id: string;
  imageUrl: string;
  bibleVerses: string;
  createdAt: string;
  userId: string | null;
  authorName: string;
};

export async function createQtComment(raw: z.infer<typeof commentSchema>): Promise<ActionResult<QtCommentPayload>> {
  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("username,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("qt_comments")
      .insert({
        post_id: parsed.data.postId,
        user_id: user.id,
        quoted_verse: parsed.data.quotedVerse.trim(),
        content: parsed.data.content,
      })
      .select("id,post_id,user_id,quoted_verse,content,created_at")
      .single();

    if (error || !inserted) {
      return { ok: false, message: error?.message ?? "댓글 저장에 실패했습니다." };
    }

    revalidatePath("/qt");

    return {
      ok: true,
      data: {
        id: inserted.id,
        postId: inserted.post_id,
        userId: inserted.user_id,
        authorName: profile?.username ?? "팀원",
        authorAvatarUrl: profile?.avatar_url ?? null,
        quotedVerse: inserted.quoted_verse ?? "",
        content: inserted.content ?? "",
        createdAt: inserted.created_at,
      },
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}

export async function createQtPost(formData: FormData): Promise<ActionResult<QtPostPayload>> {
  const bibleVerses = String(formData.get("bibleVerses") ?? "").trim();
  const parsed = postSchema.safeParse({ bibleVerses });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const fileRaw = formData.get("image");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;
  if (!file) return { ok: false, message: "QT 이미지를 첨부해 주세요." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const imageUrl = await uploadQtImage(file);

    const { data: inserted, error } = await supabase
      .from("qt_posts")
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        bible_verses: parsed.data.bibleVerses,
      })
      .select("id,image_url,bible_verses,created_at,user_id")
      .single();

    if (error || !inserted) {
      return { ok: false, message: error?.message ?? "말씀 등록에 실패했습니다." };
    }

    revalidatePath("/qt");

    return {
      ok: true,
      data: {
        id: inserted.id,
        imageUrl: inserted.image_url,
        bibleVerses: inserted.bible_verses ?? "",
        createdAt: inserted.created_at,
        userId: inserted.user_id,
        authorName: profile?.username ?? "팀원",
      },
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}

export async function updateQtPost(formData: FormData): Promise<ActionResult<QtPostPayload>> {
  const postId = String(formData.get("postId") ?? "");
  const parsedId = postIdSchema.safeParse(postId);
  if (!parsedId.success) {
    return { ok: false, message: "잘못된 요청입니다." };
  }

  const bibleVerses = String(formData.get("bibleVerses") ?? "").trim();
  const parsed = postSchema.safeParse({ bibleVerses });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const fileRaw = formData.get("image");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: existing, error: fetchError } = await supabase
      .from("qt_posts")
      .select("id,image_url,user_id")
      .eq("id", parsedId.data)
      .maybeSingle();

    if (fetchError) return { ok: false, message: fetchError.message };
    if (!existing) return { ok: false, message: "게시글을 찾을 수 없습니다." };
    if (existing.user_id !== user.id) {
      return { ok: false, message: "본인이 올린 QT만 수정할 수 있습니다." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const imageUrl = file ? await uploadQtImage(file) : existing.image_url;

    const { data: updated, error } = await supabase
      .from("qt_posts")
      .update({
        image_url: imageUrl,
        bible_verses: parsed.data.bibleVerses,
      })
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id,image_url,bible_verses,created_at,user_id")
      .single();

    if (error || !updated) {
      return { ok: false, message: error?.message ?? "말씀 수정에 실패했습니다." };
    }

    revalidatePath("/qt");

    return {
      ok: true,
      data: {
        id: updated.id,
        imageUrl: updated.image_url,
        bibleVerses: updated.bible_verses ?? "",
        createdAt: updated.created_at,
        userId: updated.user_id,
        authorName: profile?.username ?? "팀원",
      },
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}
