"use client";

import { useState, useTransition } from "react";
import { BellRing, Loader2, Megaphone } from "lucide-react";

import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminPushAnnouncementsProps = {
  subscriberCount: number;
};

export function AdminPushAnnouncements({ subscriberCount }: AdminPushAnnouncementsProps) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [boardContent, setBoardContent] = useState("");
  const [publishToBoard, setPublishToBoard] = useState(true);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      try {
        const res = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            url: "/announcements",
            publishToBoard,
            boardContent: publishToBoard ? boardContent.trim() || undefined : undefined,
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          sent?: number;
        };

        if (!res.ok || !data.ok) {
          toastError(data.message ?? "푸시 발송에 실패했습니다.");
          return;
        }

        toastSuccess(data.message ?? `${data.sent ?? 0}건 발송했습니다.`);
        setTitle("");
        setBody("");
        setBoardContent("");
      } catch (e) {
        toastError(e instanceof Error ? e.message : "푸시 발송에 실패했습니다.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-6 p-6">
      <SubscriberSummary subscriberCount={subscriberCount} />

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">푸시 제목</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 이번 주 예배 안내"
            maxLength={120}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">푸시 본문</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="알림에 표시될 짧은 메시지"
            maxLength={500}
            required
            rows={3}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus-visible:border-sky-300 focus-visible:ring-3 focus-visible:ring-sky-100"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={publishToBoard}
            onChange={(e) => setPublishToBoard(e.target.checked)}
            className="size-4 rounded border-slate-300 text-sky-500 focus:ring-sky-200"
          />
          공지사항 게시판에도 함께 게시
        </label>

        {publishToBoard ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">게시판 본문 (선택)</span>
            <textarea
              value={boardContent}
              onChange={(e) => setBoardContent(e.target.value)}
              placeholder="비우면 푸시 제목·본문으로 게시됩니다"
              maxLength={8000}
              rows={5}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus-visible:border-sky-300 focus-visible:ring-3 focus-visible:ring-sky-100"
            />
          </label>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            발송 중…
          </>
        ) : (
          <>
            <BellRing className="mr-2 h-4 w-4" />
            푸시 알림 보내기
          </>
        )}
      </Button>
    </form>
  );
}

function SubscriberSummary({ subscriberCount }: { subscriberCount: number }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-sky-50/80 px-4 py-3">
      <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
      <div>
        <p className="text-sm font-medium text-slate-800">전체 푸시 구독</p>
        <p className="mt-0.5 text-sm text-slate-600">
          현재 <span className="font-semibold text-sky-700">{subscriberCount}</span>개 기기가 구독
          중이에요.
        </p>
      </div>
    </div>
  );
}
