"use client";

import { useState, useTransition } from "react";

import { createSheetFeedbackPost } from "@/features/board/actions";
import { toastError, toastPromise } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";

type SheetFeedbackFormProps = {
  songTitle: string;
};

export function SheetFeedbackForm({ songTitle }: SheetFeedbackFormProps) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toastError("수정 사항이나 요청 사항을 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      try {
        await toastPromise(
          createSheetFeedbackPost(songTitle, trimmed).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "피드백을 게시판에 등록하는 중입니다...",
        ).unwrap();
        setContent("");
      } catch {
        // handled by toast
      }
    });
  };

  return (
    <section className="space-y-2 rounded-lg border border-border/60 bg-card/50 p-4">
      <p className="text-sm font-semibold">수정 사항이나 요청 사항</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="예: 2페이지 코드 표기를 더 크게 바꿔 주세요."
        rows={4}
        disabled={pending}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={pending || !content.trim()} onClick={onSubmit}>
          {pending ? "등록 중..." : "피드백 등록"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        등록 시 게시판 피드백 탭에 자동으로 새 글이 생성됩니다.
      </p>
    </section>
  );
}
