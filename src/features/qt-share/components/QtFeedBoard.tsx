"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteQtPost } from "@/features/qt-share/actions/qtFeedActions";
import type { QtPostPayload } from "@/features/qt-share/actions/qtFeedActions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { QtCommentCard } from "@/features/qt-share/components/QtCommentCard";
import { QtCommentForm } from "@/features/qt-share/components/QtCommentForm";
import {
  QtPostCreateDialog,
  type QtPostEditTarget,
} from "@/features/qt-share/components/QtPostCreateDialog";
import type { QtCommentRow, QtFeedData, QtPostRow } from "@/features/qt-share/queries/getQtFeedData";
import type { QtCommentPayload } from "@/features/qt-share/actions/qtFeedActions";
import { RemoteImage } from "@/components/ui/remote-image";
import { createClient } from "@/utils/supabase/client";
import { getKstTodayYmd, toKstYmdFromIso } from "@/features/qt-share/lib/dates";
import { cn } from "@/lib/utils";

type QtFeedBoardProps = QtFeedData & {
  currentUserId: string;
};

function formatPostDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return "";
  }
}

function mapRealtimeComment(row: Record<string, unknown>): QtCommentRow | null {
  if (!row.id || !row.post_id) return null;
  return {
    id: String(row.id),
    postId: String(row.post_id),
    userId: row.user_id ? String(row.user_id) : null,
    authorName: "팀원",
    authorAvatarUrl: null,
    quotedVerse: String(row.quoted_verse ?? ""),
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function payloadToPostRow(payload: QtPostPayload): QtPostRow {
  return {
    id: payload.id,
    imageUrl: payload.imageUrl,
    bibleVerses: payload.bibleVerses,
    createdAt: payload.createdAt,
    userId: payload.userId,
    authorName: payload.authorName,
    isToday: toKstYmdFromIso(payload.createdAt) === getKstTodayYmd(),
  };
}

export function QtFeedBoard({
  post: initialPost,
  comments: initialComments,
  canManage,
  error,
  currentUserId,
}: QtFeedBoardProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(initialComments);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QtPostEditTarget | null>(null);
  const [deletePending, startDelete] = useTransition();

  const isOwner = Boolean(post && post.userId && post.userId === currentUserId);
  const canModify = isOwner || canManage;

  useEffect(() => {
    setPost(initialPost);
    setComments(initialComments);
  }, [initialPost, initialComments]);

  useEffect(() => {
    if (!post) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`qt_comments_${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_comments",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          const row = mapRealtimeComment(payload.new as Record<string, unknown>);
          if (!row) return;
          setComments((current) => {
            if (current.some((item) => item.id === row.id)) return current;
            if (row.userId === currentUserId) return current;
            return [...current, row];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [post, currentUserId]);

  const onCommentCreated = (comment: QtCommentPayload) => {
    setComments((current) => {
      if (current.some((item) => item.id === comment.id)) return current;
      return [...current, comment];
    });
  };

  const onPostCreated = (payload: QtPostPayload) => {
    setPost(payloadToPostRow(payload));
    setComments([]);
    router.refresh();
  };

  const onPostUpdated = (payload: QtPostPayload) => {
    setPost((current) =>
      current
        ? { ...current, imageUrl: payload.imageUrl, bibleVerses: payload.bibleVerses }
        : payloadToPostRow(payload),
    );
    setEditTarget(null);
    router.refresh();
  };

  const openCreateDialog = () => {
    setEditTarget(null);
    setPostDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!post) return;
    setEditTarget({ id: post.id, bibleVerses: post.bibleVerses });
    setPostDialogOpen(true);
  };

  const handleDelete = () => {
    if (!post) return;
    if (!window.confirm("이 QT를 삭제할까요? 남겨진 나눔 댓글도 함께 삭제됩니다.")) return;
    startDelete(async () => {
      const res = await deleteQtPost(post.id);
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess("QT가 삭제되었습니다.");
      setPost(null);
      setComments([]);
      router.refresh();
    });
  };

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] bg-slate-50 pb-24">
      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:mx-6">
          {error}
        </div>
      ) : null}

      {!post ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
          <BookOpen className="mb-4 size-12 text-slate-300" aria-hidden />
          <p className="text-base font-semibold text-slate-800">아직 올라온 QT가 없습니다</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            오른쪽 아래 버튼을 눌러 오늘의 QT 이미지와 본문을 올려 보세요.
          </p>
        </div>
      ) : (
        <>
          <header className="bg-white">
            <div className="flex w-full justify-center bg-slate-100">
              <RemoteImage
                src={post.imageUrl}
                alt="오늘의 QT"
                width={1200}
                height={1600}
                priority
                variant="card"
                sizes="(max-width: 768px) 100vw, 768px"
                className="h-auto w-full max-w-2xl max-h-[80vh] object-contain"
              />
            </div>

            <div className="mx-auto max-w-2xl px-4 py-6 text-center sm:px-6 sm:text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-sky-600">오늘의 말씀</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatPostDate(post.createdAt)} · {post.authorName}
                  </p>
                </div>
                {canModify ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={openEditDialog}
                      disabled={deletePending}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600 disabled:opacity-50"
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deletePending}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletePending ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden />
                      )}
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 whitespace-pre-wrap break-words text-center text-[15px] leading-[1.75] text-slate-800 sm:text-left">
                {post.bibleVerses}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">나눔</h2>
              <span className="text-sm text-slate-500">{comments.length}개</span>
            </div>

            <QtCommentForm postId={post.id} bibleVerses={post.bibleVerses} onCreated={onCommentCreated} />

            <div
              className={cn(
                "space-y-4",
                comments.length === 0 &&
                  "rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center",
              )}
            >
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">첫 나눔을 남겨 보세요.</p>
              ) : (
                comments.map((comment) => <QtCommentCard key={comment.id} comment={comment} />)
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        className="fixed bottom-6 right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-sky-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98] hover:bg-sky-700 sm:right-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        onClick={openCreateDialog}
        aria-label="오늘의 QT 올리기"
      >
        <Plus className="size-5" aria-hidden />
        <span className="hidden sm:inline">오늘의 QT 올리기</span>
        <span className="sm:hidden">QT 올리기</span>
      </button>

      <QtPostCreateDialog
        open={postDialogOpen}
        onOpenChange={(next) => {
          setPostDialogOpen(next);
          if (!next) setEditTarget(null);
        }}
        onCreated={onPostCreated}
        editPost={editTarget}
        onUpdated={onPostUpdated}
      />
    </div>
  );
}
