"use client";

import { Heart, Loader2, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPost } from "@/features/board/actions";
import { syncPointsAfterMutation } from "@/features/points/lib/sync-points-client";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GratitudeComposerProps = {
  className?: string;
};

export function GratitudeComposer({ className }: GratitudeComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toastError("감사한 마음을 한 줄이라도 적어 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await createPost({
        category: "general",
        title: "오늘에 감사",
        content: trimmed,
        topic: "gratitude",
      });
      if (!res.ok) return toastError(res.message);
      setBody("");
      toastSuccess(res.awardedPoints ? `감사 나눔 보상 +${res.awardedPoints}P` : "감사 글을 올렸습니다.");
      if (res.awardedPoints) {
        await syncPointsAfterMutation(router, res.totalPoints);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className={cn("rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 sm:p-5", className)}>
      <label htmlFor="gratitude-body" className="sr-only">
        오늘 감사한 일
      </label>
      <textarea
        id="gratitude-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
        rows={3}
        maxLength={8000}
        placeholder="오늘 감사한 일을 짧게 나눠 주세요…"
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600"
          disabled={pending || !body.trim()}
          onClick={onSubmit}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          나누기
        </Button>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Heart className="size-3 text-amber-500" aria-hidden />
        말머리 없이 바로 올릴 수 있어요. 자유게시판에도 &apos;감사&apos;로 함께 표시됩니다.
      </p>
    </div>
  );
}
