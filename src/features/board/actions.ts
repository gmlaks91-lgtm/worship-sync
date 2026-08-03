"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { PostCategory } from "@/types/database";
import { isValidTopicForCategory } from "@/features/board/lib/topics";
import { awardPointsForEvent } from "@/features/points/server/awardPoints";
import { sendPushToSubscriptions } from "@/lib/push/send-notifications";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const categorySchema = z.enum(["prayer", "feedback", "general"]);

const postFieldsSchema = z.object({
  category: categorySchema,
  title: z.string().trim().min(1, "제목을 입력하세요.").max(80, "제목은 80자 이내로 입력하세요."),
  content: z.string().trim().min(1, "내용을 입력하세요.").max(8000),
  topic: z.string().trim().nullable().optional(),
  mentionedUserIds: z.array(z.string().uuid()).max(20).optional(),
});

const updatePostSchema = z.object({
  postId: z.string().uuid(),
  title: z.string().trim().min(1, "제목을 입력하세요.").max(80),
  content: z.string().trim().min(1, "내용을 입력하세요.").max(8000),
  topic: z.string().trim().nullable().optional(),
  mentionedUserIds: z.array(z.string().uuid()).max(20).optional(),
});

const addCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글을 입력하세요.").max(4000),
});

const postIdSchema = z.object({ postId: z.string().uuid() });

const togglePinSchema = z.object({
  postId: z.string().uuid(),
  pinned: z.boolean(),
});

const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글을 입력하세요.").max(4000),
});

const commentIdSchema = z.object({ commentId: z.string().uuid() });

export type BoardActionResult =
  | { ok: true; awardedPoints?: number; totalPoints?: number | null }
  | { ok: false; message: string };

export type CreatePostInput = {
  category: PostCategory;
  title: string;
  content: string;
  topic?: string | null;
  mentionedUserIds?: string[];
};

export type UpdatePostInput = {
  postId: string;
  title: string;
  content: string;
  topic?: string | null;
  mentionedUserIds?: string[];
};

/** 게시글/댓글 변경 시 공지가 노출되는 모든 화면(홈 위젯 포함)을 갱신한다. */
function revalidateBoardSurfaces() {
  for (const path of ["/", "/journal", "/announcements", "/free-board"]) {
    revalidatePath(path);
  }
}

function formatFeedbackTitle(songTitle: string) {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `[${mm}월 ${dd}일] ${songTitle.trim()} 악보 피드백`;
}

function validateTopic(
  category: PostCategory,
  topic: string | null | undefined,
): { ok: true; topic: string | null } | { ok: false; message: string } {
  if (category === "feedback") {
    return { ok: true, topic: null };
  }
  if (!topic || !isValidTopicForCategory(category, topic)) {
    return { ok: false, message: "말머리를 선택해 주세요." };
  }
  return { ok: true, topic };
}

async function sanitizeMentionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[] | undefined,
  authorId: string,
): Promise<string[]> {
  const unique = [...new Set((ids ?? []).filter((id) => id !== authorId))];
  if (unique.length === 0) return [];

  const { data } = await supabase.from("profiles").select("id").in("id", unique);
  const existing = new Set((data ?? []).map((p) => p.id));
  return unique.filter((id) => existing.has(id));
}

async function notifyMentionedUsers(input: {
  mentionedUserIds: string[];
  authorUsername: string;
  title: string;
  category: PostCategory;
}) {
  if (input.mentionedUserIds.length === 0) return;

  try {
    const admin = createAdminClient();
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .in("user_id", input.mentionedUserIds);

    const rows = subscriptions ?? [];
    if (rows.length === 0) return;

    const url = input.category === "general" ? "/free-board" : "/announcements";
    await sendPushToSubscriptions(
      rows,
      {
        title: `${input.authorUsername}님이 회원님을 언급했습니다`,
        body: input.title.slice(0, 120),
        url,
      },
      async (subscriptionId) => {
        await admin.from("push_subscriptions").delete().eq("id", subscriptionId);
      },
    );
  } catch {
    // 멘션 푸시 실패는 글 작성을 막지 않음
  }
}

/** 로그인 세션 확인 후 게시글 저장 */
export async function createPost(input: CreatePostInput): Promise<BoardActionResult> {
  const parsed = postFieldsSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인하세요." };
  }

  const topicResult = validateTopic(parsed.data.category, parsed.data.topic);
  if (!topicResult.ok) return topicResult;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const mentionedUserIds = await sanitizeMentionIds(
      supabase,
      parsed.data.mentionedUserIds,
      user.id,
    );

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      category: parsed.data.category,
      title: parsed.data.title.trim(),
      topic: topicResult.topic,
      content: parsed.data.content.trim(),
      mentioned_user_ids: mentionedUserIds,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    await notifyMentionedUsers({
      mentionedUserIds,
      authorUsername: profile?.username?.trim() || "누군가",
      title: parsed.data.title.trim(),
      category: parsed.data.category,
    });

    const reward = await awardPointsForEvent({
      eventType: "board_post",
      points: 10,
    });

    revalidateBoardSurfaces();
    return {
      ok: true,
      awardedPoints: reward.awardedPoints,
      totalPoints: reward.totalPoints,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

export async function createSheetFeedbackPost(
  songTitle: string,
  feedbackContent: string,
): Promise<BoardActionResult> {
  return createPost({
    category: "feedback",
    title: formatFeedbackTitle(songTitle),
    content: feedbackContent.trim(),
    topic: null,
  });
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

    revalidateBoardSurfaces();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

/** 본인 글만 수정 (RLS + 존재 여부 확인) */
export async function updatePost(input: UpdatePostInput): Promise<BoardActionResult> {
  const parsed = updatePostSchema.safeParse(input);
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

    const { data: existing } = await supabase
      .from("posts")
      .select("id, category")
      .eq("id", parsed.data.postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return { ok: false, message: "글을 찾을 수 없거나 수정 권한이 없습니다." };
    }

    const topicResult = validateTopic(existing.category as PostCategory, parsed.data.topic);
    if (!topicResult.ok) return topicResult;

    const mentionedUserIds = await sanitizeMentionIds(
      supabase,
      parsed.data.mentionedUserIds,
      user.id,
    );

    const { data, error } = await supabase
      .from("posts")
      .update({
        title: parsed.data.title.trim(),
        content: parsed.data.content.trim(),
        topic: topicResult.topic,
        mentioned_user_ids: mentionedUserIds,
      })
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

    revalidateBoardSurfaces();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

/** 공지 고정/해제 — 리더·관리자만 가능 */
export async function togglePinPost(postId: string, pinned: boolean): Promise<BoardActionResult> {
  const parsed = togglePinSchema.safeParse({ postId, pinned });
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      return { ok: false, message: "공지 고정 권한이 없습니다." };
    }

    const { data, error } = await supabase
      .from("posts")
      .update({ is_pinned: parsed.data.pinned })
      .eq("id", parsed.data.postId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "글을 찾을 수 없습니다." };
    }

    revalidateBoardSurfaces();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}

/** 본인 글 또는 리더/관리자 삭제 — 댓글은 DB ON DELETE CASCADE */
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const canModerate = profile?.role === "leader" || profile?.role === "admin";

    let query = supabase.from("posts").delete().eq("id", parsed.data.postId);
    if (!canModerate) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.select("id").maybeSingle();

    if (error) {
      return { ok: false, message: error.message };
    }
    if (!data) {
      return { ok: false, message: "글을 찾을 수 없거나 삭제 권한이 없습니다." };
    }

    revalidateBoardSurfaces();
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

    revalidateBoardSurfaces();
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

    revalidateBoardSurfaces();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류입니다.";
    return { ok: false, message };
  }
}
