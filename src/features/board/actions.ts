"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { PostCategory } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

const categorySchema = z.enum(["prayer", "feedback", "general"]);

const createPostSchema = z.object({
  category: categorySchema,
  content: z.string().trim().min(1, "내용을 입력하세요.").max(8000),
});

const addCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글을 입력하세요.").max(4000),
});

const updatePostSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "내용을 입력하세요.").max(8000),
});

const postIdSchema = z.object({ postId: z.string().uuid() });

const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글을 입력하세요.").max(4000),
});

const commentIdSchema = z.object({ commentId: z.string().uuid() });

export type BoardActionResult = { ok: true } | { ok: false; message: string };

function formatFeedbackTitle(songTitle: string) {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `[${mm}월 ${dd}일] ${songTitle.trim()} 악보 피드백`;
}

/** 로그인 세션 확인 후 게시글 저장 */
export async function createPost(
  category: PostCategory,
  content: string,
): Promise<BoardActionResult> {
  const parsed = createPostSchema.safeParse({ category, content });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      category: parsed.data.category,
      content: parsed.data.content.trim(),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/board");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function createSheetFeedbackPost(
  songTitle: string,
  feedbackContent: string,
): Promise<BoardActionResult> {
  const title = formatFeedbackTitle(songTitle);
  const mergedContent = `${title}\n\n${feedbackContent.trim()}`;
  return createPost("feedback", mergedContent);
}

/** 특정 게시글에 댓글 저장 */
export async function addComment(postId: string, content: string): Promise<BoardActionResult> {
  const parsed = addCommentSchema.safeParse({ postId, content });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase.from("comments").insert({
      post_id: parsed.data.postId,
      user_id: user.id,
      content: parsed.data.content.trim(),
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/board");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

/** 본인 글만 수정 (RLS + 존재 여부 확인) */
export async function updatePost(postId: string, content: string): Promise<BoardActionResult> {
  const parsed = updatePostSchema.safeParse({ postId, content });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data, error } = await supabase
      .from("posts")
      .update({ content: parsed.data.content.trim() })
      .eq("id", parsed.data.postId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "글을 찾을 수 없거나 수정 권한이 없습니다." };
    }

    revalidatePath("/board");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

/** 본인 글만 삭제 — 댓글은 DB ON DELETE CASCADE */
export async function deletePost(postId: string): Promise<BoardActionResult> {
  const parsed = postIdSchema.safeParse({ postId });
  if (!parsed.success) {
    return { ok: false, message: "잘못된 요청입니다." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", parsed.data.postId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "글을 찾을 수 없거나 삭제 권한이 없습니다." };
    }

    revalidatePath("/board");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function updateComment(commentId: string, content: string): Promise<BoardActionResult> {
  const parsed = updateCommentSchema.safeParse({ commentId, content });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data, error } = await supabase
      .from("comments")
      .update({ content: parsed.data.content.trim() })
      .eq("id", parsed.data.commentId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "댓글을 찾을 수 없거나 수정 권한이 없습니다." };
    }

    revalidatePath("/board");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function deleteComment(commentId: string): Promise<BoardActionResult> {
  const parsed = commentIdSchema.safeParse({ commentId });
  if (!parsed.success) {
    return { ok: false, message: "잘못된 요청입니다." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", parsed.data.commentId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "댓글을 찾을 수 없거나 삭제 권한이 없습니다." };
    }

    revalidatePath("/board");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}
