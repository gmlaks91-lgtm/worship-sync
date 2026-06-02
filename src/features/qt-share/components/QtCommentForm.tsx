"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";

import { createQtComment, type QtCommentPayload } from "@/features/qt-share/actions/qtFeedActions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";

type QtCommentFormProps = {
  postId: string;
  bibleVerses: string;
  onCreated: (comment: QtCommentPayload) => void;
};

export function QtCommentForm({ postId, bibleVerses, onCreated }: QtCommentFormProps) {
  const [quotedVerse, setQuotedVerse] = useState("");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    startTransition(async () => {
      const result = await createQtComment({
        postId,
        quotedVerse,
        content,
      });
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      if (result.data) onCreated(result.data);
      setQuotedVerse("");
      setContent("");
      toastSuccess("나눔이 등록되었습니다.");
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-slate-800">나눔 남기기</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        인용할 말씀을 적고, 그 아래에 오늘의 묵상을 길게 나눠 주세요.
      </p>

      <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700">오늘 본문 보기</summary>
        <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">{bibleVerses}</p>
      </details>

      <div className="mt-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">인용할 말씀</span>
          <input
            type="text"
            value={quotedVerse}
            disabled={pending}
            placeholder="예: 요한복음 3:16 — 하나님이 세상을 이처럼 사랑하사..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-100"
            onChange={(event) => setQuotedVerse(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">묵상 나눔</span>
          <textarea
            value={content}
            disabled={pending}
            rows={6}
            placeholder="오늘 말씀을 통해 받은 묵상과 적용을 나눠 주세요."
            className="min-h-[9rem] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-100"
            onChange={(event) => setContent(event.target.value)}
          />
        </label>

        <Button
          type="button"
          className="min-h-11 h-11 w-full gap-2 sm:w-auto"
          disabled={pending || !content.trim()}
          onClick={onSubmit}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          나눔 등록
        </Button>
      </div>
    </section>
  );
}
