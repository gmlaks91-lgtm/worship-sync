"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FileMusic, Play } from "lucide-react";

import type { SetlistSongWithSheet } from "@/features/setlist/types";
import { useSetlistStore } from "@/features/setlist/store/useSetlistStore";
import { getYoutubeThumbnailUrl, getYoutubeVideoId } from "@/features/setlist/utils/youtube";
import { SheetViewerDialog } from "@/features/sheets/components/SheetViewerDialog";
import { UploadSheetTriggerButton } from "@/features/sheets/components/UploadSheetModal";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SongListCardProps = {
  song: SetlistSongWithSheet;
  className?: string;
};

export function SongListCard({ song, className }: SongListCardProps) {
  const playSong = useSetlistStore((s) => s.playSong);
  const currentId = useSetlistStore((s) => s.current?.songId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const videoId = getYoutubeVideoId(song.youtube_url);
  const thumb = videoId ? getYoutubeThumbnailUrl(videoId) : null;
  const isPlaying = currentId === song.id;
  const sheet = song.sheet;

  return (
    <Card
      size="sm"
      className={cn(
        "border-border/60 transition-[ring] duration-200",
        isPlaying && "ring-2 ring-primary/40",
        className,
      )}
    >
      <CardHeader className="gap-4 border-b border-border/50 pb-4 sm:flex-row sm:items-center">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60 sm:aspect-[16/9] sm:h-[72px] sm:w-[128px] sm:shrink-0">
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 128px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
              No preview
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="truncate text-base sm:text-sm">{song.title}</CardTitle>
          <CardDescription className="line-clamp-2 text-xs leading-relaxed">
            {song.description?.trim() || "설명이 없습니다."}
          </CardDescription>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:min-w-[9rem]">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!videoId}
            onClick={() =>
              playSong({
                songId: song.id,
                title: song.title,
                youtubeUrl: song.youtube_url,
              })
            }
          >
            <Play className="mr-1.5 h-4 w-4" aria-hidden />
            재생
          </Button>
          <div className="flex flex-col gap-3 sm:flex-col">
            <UploadSheetTriggerButton songId={song.id} songTitle={song.title} className="w-full" />
            {sheet ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setSheetOpen(true)}
                >
                  <FileMusic className="size-4" aria-hidden />
                  악보 보기
                </Button>
                <SheetViewerDialog
                  open={sheetOpen}
                  onOpenChange={setSheetOpen}
                  songId={song.id}
                  songTitle={song.title}
                  fileUrls={sheet.image_urls}
                  memo={sheet.memo}
                />
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" className="w-full" disabled>
                악보 보기
              </Button>
            )}
            {sheet ? (
              <Link
                href={`/sheets/${song.id}`}
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "w-full justify-center text-xs font-normal",
                })}
              >
                전용 페이지
              </Link>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="truncate text-[11px] text-muted-foreground">
          {videoId ? `YouTube · ${videoId}` : "유효한 YouTube 링크가 없습니다."}
        </p>
      </CardContent>
    </Card>
  );
}
