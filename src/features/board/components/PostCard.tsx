"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDown, Loader2, MessageCircle, Pin, PinOff } from "lucide-react";
import { useState, useTransition } from "react";

import { CommentSection } from "@/features/board/components/CommentSection";
import { PostActions } from "@/features/board/components/PostActions";
import { togglePinPost, updatePost } from "@/features/board/actions";
import { splitTitleBody } from "@/features/board/lib/announcement";
import type { BoardPost } from "@/features/board/queries/getBoardFeed";
import { toastPromise, toastError } from "@/lib/app-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 2);
}

type PostCardProps = {
  post: BoardPost;
  currentUserId: string | null;
  canManage?: boolean;
};

export function PostCard({ post, currentUserId, canManage = false }: PostCardProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [pinPending, startPinTransition] = useTransition();
  const count = post.comments.length;
  const isOwner = Boolean(currentUserId && post.user_id === currentUserId);
  const isAnnouncement = post.category === "prayer";
  const { title, body } = isAnnouncement
    ? splitTitleBody(post.content)
    : { title: null, body: post.content };

  const startEdit = () => {
    setDraft(post.content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
  };

  const saveEdit = () => {
    const value = draft.trim();
    if (!value) {
      toastError("내용을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await toastPromise(
          updatePost(post.id, value).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "저장하는 중이에요…",
        ).unwrap();
        setEditing(false);
        setDraft("");
      } catch {
        /* handled */
      }
    });
  };

  const togglePin = () => {
    startPinTransition(async () => {
      try {
        await toastPromise(
          togglePinPost(post.id, !post.is_pinned).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          post.is_pinned ? "고정을 해제하는 중이에요…" : "상단에 고정하는 중이에요…",
        ).unwrap();
      } catch {
        /* handled */
      }
    });
  };

  return (
    <article
      className={cn(
        "rounded-lg border px-5 py-7 transition-colors sm:px-6",
        post.is_pinned
          ? "border-sky-200 bg-sky-50/50 ring-1 ring-sky-100"
          : "border-border/60 bg-card",
      )}
    >
      <div className="flex gap-4">
        <Avatar className="mt-0.5 size-10 border border-border/70">
          <AvatarFallback className="text-xs font-semibold">
            {initials(post.author_username)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold tracking-tight">{post.author_username}</span>
              <time
                className="text-[11px] text-muted-foreground"
                dateTime={post.created_at}
                title={format(new Date(post.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
              >
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </time>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pinPending}
                  onClick={togglePin}
                  aria-label={post.is_pinned ? "고정 해제" : "상단 고정"}
                  title={post.is_pinned ? "고정 해제" : "상단 고정"}
                  className={cn(
                    "text-muted-foreground hover:text-sky-600",
                    post.is_pinned && "text-sky-600",
                  )}
                >
                  {pinPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : post.is_pinned ? (
                    <PinOff className="size-4" aria-hidden />
                  ) : (
                    <Pin className="size-4" aria-hidden />
                  )}
                </Button>
              ) : null}
              {isOwner && !editing ? <PostActions postId={post.id} onEdit={startEdit} /> : null}
            </div>
          </div>

          {post.is_pinned && !editing ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
              <Pin className="size-3" aria-hidden />
              고정된 공지
            </span>
          ) : null}

          {editing ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4 sm:p-5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={pending}
                rows={6}
                className={cn(
                  "w-full resize-none rounded-lg bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none",
                  "ring-1 ring-border/60 focus-visible:ring-ring",
                  "disabled:opacity-50",
                )}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={cancelEdit}>
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={pending || !draft.trim()}
                  onClick={saveEdit}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {title ? (
                <h3 className="text-base font-bold leading-snug tracking-tight text-foreground">
                  {title}
                </h3>
              ) : null}
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">
                {body}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <MessageCircle className="size-3.5" aria-hidden />
              댓글 {count}
              <ChevronDown
                className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
                aria-hidden
              />
            </Button>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]",
              open ? "max-h-[2200px]" : "max-h-0",
            )}
          >
            <div
              className={cn(
                "border-t border-border/45 pt-4 transition-[opacity,transform] duration-300 ease-out",
                open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
              )}
              style={{ transitionDelay: open ? "40ms" : "0ms" }}
            >
              <CommentSection postId={post.id} comments={post.comments} currentUserId={currentUserId} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
