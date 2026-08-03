"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDown, Loader2, MessageCircle, Pin, PinOff } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { CommentSection } from "@/features/board/components/CommentSection";
import {
  MentionPicker,
  MentionText,
  type MentionMember,
} from "@/features/board/components/MentionText";
import { PostActions } from "@/features/board/components/PostActions";
import { togglePinPost, updatePost } from "@/features/board/actions";
import { resolvePostTitleBody } from "@/features/board/lib/announcement";
import { getTopicsForCategory, topicLabel, type BoardTopic } from "@/features/board/lib/topics";
import type { BoardPost } from "@/features/board/queries/getBoardFeed";
import { toastPromise, toastError } from "@/lib/app-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  members?: MentionMember[];
};

export function PostCard({
  post,
  currentUserId,
  canManage = false,
  members = [],
}: PostCardProps) {
  const topics = useMemo(() => getTopicsForCategory(post.category), [post.category]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTopic, setDraftTopic] = useState<BoardTopic | null>(null);
  const [draftMentions, setDraftMentions] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [pinPending, startPinTransition] = useTransition();
  const count = post.comments.length;
  const isOwner = Boolean(currentUserId && post.user_id === currentUserId);
  const { title, body } = resolvePostTitleBody(post.title, post.content);
  const label = topicLabel(post.topic);

  const startEdit = () => {
    const resolved = resolvePostTitleBody(post.title, post.content);
    setDraftTitle(resolved.title ?? "");
    setDraftBody(resolved.body);
    setDraftTopic((post.topic as BoardTopic | null) ?? topics[0]?.value ?? null);
    setDraftMentions([...post.mentioned_user_ids]);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftTitle("");
    setDraftBody("");
    setDraftTopic(null);
    setDraftMentions([]);
  };

  const saveEdit = () => {
    const nextTitle = draftTitle.trim();
    const nextBody = draftBody.trim();
    if (topics.length > 0 && !draftTopic) {
      toastError("말머리를 선택해 주세요.");
      return;
    }
    if (!nextTitle) {
      toastError("제목을 입력해 주세요.");
      return;
    }
    if (!nextBody) {
      toastError("내용을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await toastPromise(
          updatePost({
            postId: post.id,
            title: nextTitle,
            content: nextBody,
            topic: draftTopic,
            mentionedUserIds: draftMentions,
          }).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "저장하는 중이에요…",
        ).unwrap();
        cancelEdit();
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
              {canManage && post.category === "prayer" ? (
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
              {(isOwner || canManage) && !editing ? (
                <PostActions
                  postId={post.id}
                  onEdit={isOwner ? startEdit : undefined}
                  canEdit={isOwner}
                  canDelete={isOwner || canManage}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {post.is_pinned && !editing ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                <Pin className="size-3" aria-hidden />
                고정
              </span>
            ) : null}
            {label && !editing ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {label}
              </span>
            ) : null}
          </div>

          {editing ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-4 sm:p-5">
              {topics.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      disabled={pending}
                      onClick={() => setDraftTopic(t.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                        draftTopic === t.value
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-border/70 text-muted-foreground hover:border-sky-300",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                disabled={pending}
                maxLength={80}
                placeholder="제목"
              />
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                disabled={pending}
                rows={6}
                className={cn(
                  "w-full resize-none rounded-lg bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none",
                  "ring-1 ring-border/60 focus-visible:ring-ring",
                  "disabled:opacity-50",
                )}
              />
              <MentionPicker
                members={members}
                selectedIds={draftMentions}
                body={draftBody}
                disabled={pending}
                onChange={(ids, nextBody) => {
                  setDraftMentions(ids);
                  setDraftBody(nextBody);
                }}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={cancelEdit}>
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={pending || !draftTitle.trim() || !draftBody.trim()}
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
              <MentionText text={body} members={members} />
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
