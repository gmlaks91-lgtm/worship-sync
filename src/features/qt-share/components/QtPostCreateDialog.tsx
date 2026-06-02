"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { createQtPost, type QtPostPayload } from "@/features/qt-share/actions/qtFeedActions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QtPostCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (post: QtPostPayload) => void;
};

export function QtPostCreateDialog({ open, onOpenChange, onCreated }: QtPostCreateDialogProps) {
  const [bibleVerses, setBibleVerses] = useState("");
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("bibleVerses", bibleVerses);

    startTransition(async () => {
      const result = await createQtPost(fd);
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      if (result.data) onCreated(result.data);
      toastSuccess("오늘의 QT가 등록되었습니다.");
      form.reset();
      setBibleVerses("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>오늘의 QT 올리기</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            QT 이미지와 성경 본문을 등록하면 청년들이 나눔을 남길 수 있습니다. 누구나 올릴 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <form id="qt-post-form" onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">QT 이미지</span>
            <input
              name="image"
              type="file"
              accept="image/*"
              required
              disabled={pending}
              className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">성경 본문</span>
            <textarea
              name="bibleVerses"
              value={bibleVerses}
              required
              disabled={pending}
              rows={10}
              placeholder="오늘 QT 본문 전체를 입력하세요."
              className="min-h-[12rem] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-100"
              onChange={(event) => setBibleVerses(event.target.value)}
            />
          </label>
        </form>

        <DialogFooter className="border-t-0 bg-transparent p-0 sm:flex-col">
          <Button
            type="submit"
            form="qt-post-form"
            className="min-h-11 h-11 w-full gap-2"
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
            등록하기
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 h-11 w-full"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
