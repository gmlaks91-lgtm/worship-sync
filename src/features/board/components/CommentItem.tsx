"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteComment, updateComment } from "@/features/board/actions";
import type { BoardComment } from "@/features/board/queries/getBoardFeed";
import { toastPromise, toastError } from "@/lib/app-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 2);
}

type CommentItemProps = {
  comment: BoardComment;
  currentUserId: string | null;
};

export function CommentItem({ comment, currentUserId }: CommentItemProps) {
  const isOwner = Boolean(currentUserId && comment.user_id === currentUserId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const startEdit = () => {
    setDraft(comment.content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
  };

  const saveEdit = () => {
    const body = draft.trim();
    if (!body) {
      toastError("댓글 내용을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await toastPromise(
          updateComment(comment.id, body).then((res) => {
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

  const onDelete = () => {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    startTransition(async () => {
      try {
        await toastPromise(
          deleteComment(comment.id).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "삭제하는 중이에요…",
        ).unwrap();
      } catch {
        /* handled */
      }
    });
  };

  return (
    <li className="flex gap-2.5">
      <Avatar className="mt-0.5 size-7 border border-border/60 shadow-sm">
        <AvatarFallback className="text-[9px] font-semibold">
          {initials(comment.author_username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-xs font-semibold">{comment.author_username}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          {isOwner && !editing ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                disabled={pending}
                aria-label="댓글 메뉴"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                  "outline-none hover:bg-muted hover:text-foreground",
                  "focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[9rem]">
                <DropdownMenuItem onClick={startEdit} className="gap-2">
                  <Pencil className="size-4" aria-hidden />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete} className="gap-2">
                  <Trash2 className="size-4" aria-hidden />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {editing ? (
          <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={pending}
              rows={3}
              className={cn(
                "w-full resize-none rounded-md bg-transparent px-2 py-1.5 text-sm outline-none",
                "ring-1 ring-border/60 focus-visible:ring-ring",
                "disabled:opacity-50",
              )}
            />
            <div className="flex justify-end gap-2">
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
                {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                저장
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {comment.content}
          </p>
        )}
      </div>
    </li>
  );
}
