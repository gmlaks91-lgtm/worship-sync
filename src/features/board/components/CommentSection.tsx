"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import { useState, useTransition } from "react";

import { addComment } from "@/features/board/actions";
import { CommentItem } from "@/features/board/components/CommentItem";
import type { BoardComment } from "@/features/board/queries/getBoardFeed";
import { toastPromise, toastError } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CommentSectionProps = {
  postId: string;
  comments: BoardComment[];
  currentUserId: string | null;
  className?: string;
};

export function CommentSection({ postId, comments, currentUserId, className }: CommentSectionProps) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    const body = text.trim();
    if (!body) {
      toastError("댓글 내용을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await toastPromise(
          addComment(postId, body).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "댓글을 등록하는 중이에요…",
        ).unwrap();
        setText("");
      } catch {
        /* handled */
      }
    });
  };

  return (
    <div className={cn("space-y-3 pt-1", className)}>
      <ul className="space-y-3">
        {comments.length === 0 ? (
          <li className="text-xs text-muted-foreground">아직 댓글이 없습니다.</li>
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} currentUserId={currentUserId} />
          ))
        )}
      </ul>

      <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/15 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
          placeholder="댓글을 입력하세요…"
          rows={2}
          className={cn(
            "min-h-[52px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none",
            "placeholder:text-muted-foreground focus-visible:ring-0",
            "disabled:opacity-50",
          )}
        />
        <Button
          type="button"
          size="icon-sm"
          className="shrink-0 self-end"
          disabled={pending || !text.trim()}
          onClick={onSubmit}
          aria-label="댓글 등록"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
