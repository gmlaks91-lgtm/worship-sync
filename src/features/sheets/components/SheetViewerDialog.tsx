"use client";

import { SheetViewerScaffold } from "@/features/sheets/components/SheetViewerScaffold";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SheetViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  songTitle: string;
  fileUrls: string[];
  memo: string | null;
};

export function SheetViewerDialog({
  open,
  onOpenChange,
  songId,
  songTitle,
  fileUrls,
  memo,
}: SheetViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none",
          "data-open:zoom-in-100 data-closed:zoom-out-100",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{songTitle} 악보</DialogTitle>
          <DialogDescription>다중 이미지 악보 뷰어</DialogDescription>
        </DialogHeader>
        <SheetViewerScaffold
          mode="dialog"
          songId={songId}
          songTitle={songTitle}
          fileUrls={fileUrls}
          memo={memo}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
