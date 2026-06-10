"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateSongSheetMusicUrl } from "@/features/songs/actions/songActions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SongSheetMusicEditorProps = {
  setlistId: string;
  songId: string;
  songTitle: string;
  initialUrl: string | null;
};

export function SongSheetMusicEditor({
  setlistId,
  songId,
  songTitle,
  initialUrl,
}: SongSheetMusicEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        악보 URL
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 sm:min-w-[280px] sm:max-w-md">
      <p className="text-xs font-medium text-muted-foreground">{songTitle} · 악보 URL</p>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://... (PNG, JPG, PDF)"
        className="h-10 border-neutral-200 bg-white"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const res = await updateSongSheetMusicUrl({
                setlistId,
                songId,
                sheetMusicUrl: url.trim() || null,
              });
              if (!res.ok) {
                toastError(res.message);
                return;
              }
              toastSuccess("악보 URL을 저장했습니다.");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          저장
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            setUrl(initialUrl ?? "");
            setOpen(false);
          }}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
