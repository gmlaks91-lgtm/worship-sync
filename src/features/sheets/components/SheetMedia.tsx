"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { isImageUrl, isPdfUrl } from "@/features/sheets/lib/file-kind";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SheetMediaProps = {
  fileUrls: string[];
  className?: string;
};

/**
 * 다중 악보 URL을 캐러셀로 표시합니다.
 */
export function SheetMedia({ fileUrls, className }: SheetMediaProps) {
  const [index, setIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "stack">("stack");
  const total = fileUrls.length;
  const currentIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const fileUrl = fileUrls[currentIndex] ?? "";

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <p>등록된 악보 이미지가 없습니다.</p>
      </div>
    );
  }

  if (viewMode === "stack") {
    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        {total > 1 ? (
          <div className="sticky top-0 z-10 flex justify-end gap-1 border-b border-border/60 bg-background/90 px-2 py-2 backdrop-blur">
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewMode("stack")}>
              세로 보기
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setViewMode("carousel")}>
              넘겨 보기
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 p-3">
          {fileUrls.map((url, idx) => {
            if (isPdfUrl(url)) {
              return (
                <iframe
                  key={`${url}-${idx}`}
                  title={`악보 PDF ${idx + 1}`}
                  src={url}
                  className="h-[80vh] w-full rounded-lg border border-border/60 bg-muted/30"
                />
              );
            }
            if (isImageUrl(url)) {
              return (
                <div key={`${url}-${idx}`} className="relative min-h-[60vh] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                  <Image src={url} alt={`악보 ${idx + 1}`} fill sizes="100vw" className="object-contain" />
                </div>
              );
            }
            return (
              <a
                key={`${url}-${idx}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border/60 p-4 text-sm text-primary underline underline-offset-4"
              >
                지원하지 않는 형식 파일 열기 ({idx + 1}/{total})
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  if (isPdfUrl(fileUrl)) {
    return (
      <div className={cn("relative flex h-full w-full flex-col", className)}>
        {total > 1 ? (
          <div className="sticky top-0 z-10 flex justify-end gap-1 border-b border-border/60 bg-background/90 px-2 py-2 backdrop-blur">
            <Button type="button" variant="ghost" size="sm" onClick={() => setViewMode("stack")}>
              세로 보기
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewMode("carousel")}>
              넘겨 보기
            </Button>
          </div>
        ) : null}
        <iframe
          title="악보 PDF"
          src={fileUrl}
          className="h-full w-full border-0 bg-muted/30"
        />
        {total > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-2 py-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIndex((prev) => (prev - 1 + total) % total)}
                aria-label="이전 악보"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {total}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIndex((prev) => (prev + 1) % total)}
                aria-label="다음 악보"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (isImageUrl(fileUrl)) {
    return (
      <div
        className={cn(
          "relative min-h-0 w-full flex-1 bg-gradient-to-b from-muted/40 to-background",
          className,
        )}
      >
        {total > 1 ? (
          <div className="pointer-events-auto absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-sm">
            <Button type="button" variant="ghost" size="sm" onClick={() => setViewMode("stack")}>
              세로 보기
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewMode("carousel")}>
              넘겨 보기
            </Button>
          </div>
        ) : null}
        <Image
          src={fileUrl}
          alt={`악보 ${currentIndex + 1}`}
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
        {total > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-2 py-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIndex((prev) => (prev - 1 + total) % total)}
                aria-label="이전 악보"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {total}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIndex((prev) => (prev + 1) % total)}
                aria-label="다음 악보"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      <p>지원하지 않는 형식입니다. PDF 또는 이미지(PNG, JPG, WebP, GIF)를 사용해 주세요.</p>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-4"
      >
        새 탭에서 열기
      </a>
    </div>
  );
}
