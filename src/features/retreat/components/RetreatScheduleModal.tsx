"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { todayYmdKst } from "@/lib/date-kst";
import {
  isRetreatScheduleActive,
  RETREAT_SCHEDULE_IMAGE_SRC,
  RETREAT_SCHEDULE_SESSION_KEY,
} from "@/lib/retreat-schedule";

export function RetreatScheduleModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isRetreatScheduleActive(todayYmdKst())) return;
    try {
      if (sessionStorage.getItem(RETREAT_SCHEDULE_SESSION_KEY) === "1") return;
    } catch {
      /* private mode 등 — 계속 표시 시도 */
    }
    setOpen(true);
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(RETREAT_SCHEDULE_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!isRetreatScheduleActive(todayYmdKst()) && !open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent
        showCloseButton
        className="max-h-[90vh] w-[min(100vw-1.5rem,28rem)] max-w-md gap-3 overflow-hidden p-3 sm:p-4"
      >
        <DialogHeader className="gap-1 px-1 pt-1">
          <DialogTitle className="text-base">수련회 시간표</DialogTitle>
          <DialogDescription className="text-xs">
            8월 6일(목) ~ 8월 8일(토) · 이번 수련회 기간에만 표시됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="relative max-h-[min(70vh,36rem)] overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
          <Image
            src={RETREAT_SCHEDULE_IMAGE_SRC}
            alt="하계 수련회 시간표 — 8월 6일부터 8일까지"
            width={720}
            height={1280}
            className="h-auto w-full object-contain"
            priority
          />
        </div>

        <div className="flex justify-end px-1 pb-1">
          <Button type="button" size="sm" onClick={dismiss}>
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
