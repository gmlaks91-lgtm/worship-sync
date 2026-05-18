"use client";

import { Minus, Plus, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type SheetMusicViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sheetMusicUrl: string;
};

function isPdfUrl(url: string) {
  return /\.pdf(\?|#|$)/i.test(url);
}

export function SheetMusicViewer({ open, onOpenChange, title, sheetMusicUrl }: SheetMusicViewerProps) {
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_STEPS[zoomIndex];
  const isPdf = useMemo(() => isPdfUrl(sheetMusicUrl), [sheetMusicUrl]);

  const zoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,900px)] max-w-[min(96vw,1100px)] flex-col gap-0 overflow-hidden border-border/70 bg-white p-0"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="truncate text-lg font-semibold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">악보 보기</DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-xl"
              onClick={() => onOpenChange(false)}
              aria-label="닫기"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={zoomOut} disabled={zoomIndex === 0}>
              <Minus className="size-4" aria-hidden />
              축소
            </Button>
            <span className="min-w-14 text-center text-sm font-medium text-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
            >
              <Plus className="size-4" aria-hidden />
              확대
            </Button>
          </div>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto bg-neutral-50/80 p-4 sm:p-6",
            isPdf && "p-2 sm:p-3",
          )}
        >
          {isPdf ? (
            <iframe
              title={`${title} 악보`}
              src={sheetMusicUrl}
              className="h-full min-h-[70vh] w-full rounded-xl border border-border/60 bg-white shadow-sm"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            />
          ) : (
            <div className="flex min-h-full justify-center">
              <RemoteImage
                src={sheetMusicUrl}
                alt={`${title} 악보`}
                width={1400}
                height={1800}
                variant="sheetMusic"
                className="h-auto max-w-none w-auto rounded-xl border border-border/60 bg-white shadow-sm shadow-neutral-100/80"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
