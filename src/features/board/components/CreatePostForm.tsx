"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { createPost } from "@/features/board/actions";
import { MentionTextarea, type MentionMember } from "@/features/board/components/MentionText";
import {
  defaultTopicForCategory,
  getTopicsForCategory,
  type BoardTopic,
} from "@/features/board/lib/topics";
import { syncPointsAfterMutation } from "@/features/points/lib/sync-points-client";
import { toastError, toastSuccess } from "@/lib/app-toast";
import type { PostCategory } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CreatePostFormProps = {
  category: PostCategory;
  members?: MentionMember[];
};

export function CreatePostForm({ category, members = [] }: CreatePostFormProps) {
  const router = useRouter();
  const topics = useMemo(() => getTopicsForCategory(category), [category]);
  const [topic, setTopic] = useState<BoardTopic | null>(() => defaultTopicForCategory(category));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurTimer = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  };

  const hasDraft = Boolean(title.trim() || body.trim() || mentionedIds.length);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setMentionedIds([]);
    setTopic(defaultTopicForCategory(category));
    setExpanded(false);
  };

  const onSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!topic && topics.length > 0) {
      toastError("말머리를 선택해 주세요.");
      return;
    }
    if (!trimmedTitle) {
      toastError("제목을 입력해 주세요.");
      return;
    }
    if (!trimmedBody) {
      toastError("내용을 입력해 주세요.");
      return;
    }
    clearBlurTimer();
    startTransition(async () => {
      const res = await createPost({
        category,
        title: trimmedTitle,
        content: trimmedBody,
        topic,
        mentionedUserIds: mentionedIds,
      });
      if (!res.ok) return toastError(res.message);
      resetForm();
      toastSuccess(res.awardedPoints ? `게시글 작성 보상 +${res.awardedPoints}P` : "게시글을 올렸습니다.");
      if (res.awardedPoints) {
        await syncPointsAfterMutation(router, res.totalPoints);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-1.5 transition-colors duration-200",
        expanded && "border-primary/25",
      )}
    >
      <div className="space-y-3 rounded-[0.9rem] bg-background p-3 sm:p-4">
        {topics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={pending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  clearBlurTimer();
                  setExpanded(true);
                  setTopic(t.value);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                  topic === t.value
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-border/70 text-muted-foreground hover:border-sky-300 hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="sr-only" htmlFor={`create-post-title-${category}`}>
            제목
          </label>
          <Input
            id={`create-post-title-${category}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => {
              clearBlurTimer();
              setExpanded(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => {
                if (!hasDraft) setExpanded(false);
              }, 160);
            }}
            disabled={pending}
            maxLength={80}
            placeholder="제목을 입력하세요"
            className="h-10 border-border/50 bg-transparent shadow-none"
          />

          <label className="sr-only" htmlFor={`create-post-${category}`}>
            본문
          </label>
          <MentionTextarea
            id={`create-post-${category}`}
            value={body}
            members={members}
            disabled={pending}
            placeholder="내용을 입력하세요 (@로 사람 태그)"
            rows={expanded ? 5 : 2}
            onFocus={() => {
              clearBlurTimer();
              setExpanded(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => {
                if (!hasDraft) setExpanded(false);
              }, 160);
            }}
            onChange={(nextBody, ids) => {
              setBody(nextBody);
              setMentionedIds(ids);
            }}
            className={cn(
              "w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none transition-[min-height] duration-300 ease-out",
              expanded ? "min-h-[132px]" : "min-h-[52px]",
              "placeholder:text-muted-foreground",
              "disabled:opacity-50",
            )}
          />
        </div>

        <div
          className={cn(
            "flex justify-end overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
            expanded || hasDraft ? "max-h-14 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <Button
            type="button"
            size="sm"
            className="mt-1 gap-1.5"
            disabled={pending || !title.trim() || !body.trim() || (topics.length > 0 && !topic)}
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

