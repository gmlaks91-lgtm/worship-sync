"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { createPost } from "@/features/board/actions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import type { PostCategory } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CreatePostFormProps = {
  category: PostCategory;
};

export function CreatePostForm({ category }: CreatePostFormProps) {
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurTimer = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  };

  const onSubmit = () => {
    const body = text.trim();
    if (!body) {
      toastError("내용을 입력해 주세요.");
      return;
    }
    clearBlurTimer();
    startTransition(async () => {
      const res = await createPost(category, body);
      if (!res.ok) return toastError(res.message);
      setText("");
      setExpanded(false);
      toastSuccess(res.awardedPoints ? `게시글 작성 보상 +${res.awardedPoints}P` : "게시글을 올렸습니다.");
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-1.5 transition-colors duration-200",
        expanded && "border-primary/25",
      )}
    >
      <div className="rounded-[0.9rem] bg-background p-3 sm:p-4">
        <label className="sr-only" htmlFor={`create-post-${category}`}>
          새 글 작성
        </label>
        <textarea
          id={`create-post-${category}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            clearBlurTimer();
            setExpanded(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => {
              if (!text.trim()) setExpanded(false);
            }, 160);
          }}
          disabled={pending}
          placeholder="무슨 이야기를 나누고 싶나요?"
          rows={expanded ? 5 : 2}
          className={cn(
            "w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none transition-[min-height] duration-300 ease-out",
            expanded ? "min-h-[132px]" : "min-h-[52px]",
            "placeholder:text-muted-foreground",
            "disabled:opacity-50",
          )}
        />
        <div
          className={cn(
            "flex justify-end overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
            expanded || text.trim() ? "max-h-14 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <Button
            type="button"
            size="sm"
            className="mt-2 gap-1.5"
            disabled={pending || !text.trim()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSubmit}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            게시
          </Button>
        </div>
      </div>
    </div>
  );
}
