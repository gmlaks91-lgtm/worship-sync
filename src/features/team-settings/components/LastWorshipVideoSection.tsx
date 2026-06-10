"use client";

import { useState } from "react";

import { updateLastWorshipVideo } from "@/features/team-settings/actions/teamSettingsActions";
import { toastPromise } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LastWorshipVideoSectionProps = {
  videoUrl: string | null;
  embedUrl: string | null;
  canEdit: boolean;
};

export function LastWorshipVideoSection({ videoUrl, embedUrl, canEdit }: LastWorshipVideoSectionProps) {
  const [input, setInput] = useState(videoUrl ?? "");
  const [pending, setPending] = useState(false);

  const onSave = async () => {
    if (pending) return;
    setPending(true);
    try {
      await toastPromise(
        updateLastWorshipVideo({ videoInput: input }).then((res) => {
          if (!res.ok) throw new Error(res.message);
        }),
        "예배 영상을 저장하는 중입니다...",
      ).unwrap();
    } catch {
      // handled by toastPromise
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">지난주 예배 영상</CardTitle>
        <CardDescription>팀원들이 바로 시청할 수 있는 주간 예배 영상입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {embedUrl ? (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/15">
            <iframe
              title="지난주 예배 영상"
              src={embedUrl}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-[260px] w-full sm:h-[360px]"
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            아직 등록된 예배 영상이 없습니다.
          </p>
        )}

        {canEdit ? (
          <div className="space-y-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={pending}
            />
            <Button type="button" onClick={onSave} disabled={pending}>
              {pending ? "저장 중..." : "예배 영상 저장"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
