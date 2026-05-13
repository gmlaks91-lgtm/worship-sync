"use client";

import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { useEffect } from "react";

import { rewardSheetView } from "@/features/sheets/actions/sheetRewardActions";
import { SheetFeedbackForm } from "@/features/sheets/components/SheetFeedbackForm";
import { SheetMedia } from "@/features/sheets/components/SheetMedia";
import { Button, buttonVariants } from "@/components/ui/button";
import { toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type SheetViewerScaffoldProps = {
  songId: string;
  songTitle: string;
  fileUrls: string[];
  memo: string | null;
  mode: "dialog" | "page";
  onClose?: () => void;
};

export function SheetViewerScaffold({
  songId,
  songTitle,
  fileUrls,
  memo,
  mode,
  onClose,
}: SheetViewerScaffoldProps) {
  useEffect(() => {
    let mounted = true;
    void rewardSheetView().then((res) => {
      if (!mounted) return;
      if (res.awardedPoints > 0) {
        toastSuccess(`악보 확인 보상 +${res.awardedPoints}P`);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-start gap-2 border-b border-border/70 bg-background px-3 py-3 sm:px-4">
        {mode === "dialog" ? (
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={onClose} aria-label="닫기">
            <X className="size-4" />
          </Button>
        ) : (
          <Link href="/sheets" aria-label="악보 목록으로" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0")}>
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold leading-tight sm:text-base">{songTitle}</p>
          {memo ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{memo}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">리더 메모가 없습니다.</p>
          )}
          {mode === "dialog" ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link
                href={`/sheets/${songId}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline"
              >
                전용 페이지로 열기
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-[55vh] flex-1 flex-col overflow-y-auto">
        <SheetMedia fileUrls={fileUrls} className="min-h-[45vh]" />
        <div className="px-3 py-4 sm:px-4">
          <SheetFeedbackForm songTitle={songTitle} />
        </div>
      </div>
    </div>
  );
}
