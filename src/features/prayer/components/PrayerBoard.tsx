"use client";

import { useState, useTransition } from "react";

import { createPrayerRequest, togglePrayerReaction } from "@/features/prayer/actions/prayerActions";
import type { PrayerCardRow } from "@/features/prayer/queries/getPrayerPageData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";

export function PrayerBoard({ prayers }: { prayers: PrayerCardRow[] }) {
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [pending, start] = useTransition();

  const onCreate = () => {
    start(async () => {
      const res = await createPrayerRequest({ content, isAnonymous: anonymous });
      if (!res.ok) return toastError(res.message);
      toastSuccess();
      setContent("");
      setAnonymous(false);
    });
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기도제목 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="함께 기도받고 싶은 내용을 적어 주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            익명으로 올리기
          </label>
          <Button type="button" disabled={pending || !content.trim()} onClick={onCreate}>
            작성하기
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {prayers.map((item) => (
          <Card key={item.id} className="border-border/70">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{item.author_name}</span>
                <span>{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
              <Button
                type="button"
                variant={item.reacted_by_me ? "secondary" : "outline"}
                className="gap-2"
                onClick={() =>
                  start(async () => {
                    const res = await togglePrayerReaction({ requestId: item.id });
                    if (!res.ok) return toastError(res.message);
                    toastSuccess();
                  })
                }
                disabled={pending}
              >
                기도할게요 🙏 <span className="text-xs">{item.reaction_count}</span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
