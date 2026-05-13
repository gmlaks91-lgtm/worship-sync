"use client";

import { Eraser } from "lucide-react";

import { CHORD_QUALITIES, CHORD_ROOTS, buildChordSymbol } from "@/features/chord-sheet/lib/chord-symbol";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClickableChordPaletteProps = {
  root: string;
  quality: string;
  disabled?: boolean;
  currentSymbol?: string | null;
  targetLabel?: string | null;
  onRootPick: (root: string) => void;
  onQualityPick: (quality: string) => void;
  onDelete: () => void;
};

export function ClickableChordPalette({
  root,
  quality,
  disabled,
  currentSymbol,
  targetLabel,
  onRootPick,
  onQualityPick,
  onDelete,
}: ClickableChordPaletteProps) {
  const preview = buildChordSymbol(root, quality);

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-100/80 lg:sticky lg:top-4">
      <div className="space-y-1">
        <p className="text-base font-semibold text-neutral-900">코드 팔레트</p>
        <p className="text-sm text-neutral-500">
          {targetLabel ? `${targetLabel} 위치에 적용 중` : "가사 위치나 기존 코드를 먼저 눌러 타겟을 선택하세요."}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">현재 코드</p>
        <p className="mt-1 font-mono text-xl font-semibold text-neutral-900">{currentSymbol || preview || "—"}</p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Root</p>
        <div className="grid grid-cols-4 gap-2">
          {CHORD_ROOTS.map((item) => (
            <Button
              key={item}
              type="button"
              variant={root === item ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              className={cn("h-9 font-mono", root === item && "bg-neutral-900 hover:bg-neutral-800")}
              onClick={() => onRootPick(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Quality</p>
        <div className="flex flex-wrap gap-2">
          {CHORD_QUALITIES.map((item) => (
            <Button
              key={item.value || "major"}
              type="button"
              variant={quality === item.value ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              className={cn("h-9", quality === item.value && "bg-neutral-900 hover:bg-neutral-800")}
              onClick={() => onQualityPick(item.value)}
            >
              {item.value || "M"}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !currentSymbol}
          className="h-9 w-full border-destructive/20 text-destructive hover:bg-destructive/5"
          onClick={onDelete}
        >
          <Eraser className="size-4" aria-hidden />
          선택한 코드 삭제
        </Button>
      </div>
    </aside>
  );
}
