"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useEffect } from "react";

import { useSetlistStore } from "@/features/setlist/store/useSetlistStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ReactYouTube = dynamic(() => import("react-youtube"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full items-center justify-center bg-muted text-xs text-muted-foreground">
      플레이어 로드 중…
    </div>
  ),
});

type YouTubePlayerProps = {
  className?: string;
};

/**
 * 하단 고정 미니 플레이어. AppShell의 BottomNav 위에 겹쳐 표시됩니다.
 */
export function YouTubePlayer({ className }: YouTubePlayerProps) {
  const current = useSetlistStore((s) => s.current);
  const stop = useSetlistStore((s) => s.stop);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, stop]);

  if (!current) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[45] border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md",
        "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
        className,
      )}
      role="region"
      aria-label="YouTube 재생기"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-3 py-3 sm:px-6">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{current.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">재생 중</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={stop}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg ring-1 ring-border/60">
          <ReactYouTube
            key={current.videoId}
            videoId={current.videoId}
            className="aspect-video w-full"
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 1,
                loop: 1,
                playlist: current.videoId,
                modestbranding: 1,
                rel: 0,
              },
            }}
            iframeClassName="h-full w-full min-h-[180px] sm:min-h-[220px]"
          />
        </div>
      </div>
    </div>
  );
}
