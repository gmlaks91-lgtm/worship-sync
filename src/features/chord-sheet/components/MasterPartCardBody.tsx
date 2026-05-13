"use client";

import type { ButtonHTMLAttributes, CSSProperties, RefCallback } from "react";
import { GripVertical } from "lucide-react";

import { CHORD_SECTION_TAGS, formatSectionBadge } from "@/features/chord-sheet/constants";
import { InlineChordLine } from "@/features/chord-sheet/components/InlineChordLine";
import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import type { LinesJson } from "@/features/chord-sheet/lib/lines-json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ChordSheetSectionTag } from "@/types/database";

export type MasterPartCardBodyProps = {
  block: ChordSheetBlockRow;
  canReorder: boolean;
  sortableRootRef?: RefCallback<HTMLDivElement>;
  sortableRootStyle?: CSSProperties;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  dragHandlePlaceholder?: boolean;
  onPatchMeta: (blockId: string, patch: Partial<ChordSheetBlockRow>) => void;
  onLinesJsonChange: (blockId: string, linesJson: LinesJson) => void;
  onDelete: () => void;
};

export function MasterPartCardBody({
  block,
  canReorder,
  sortableRootRef,
  sortableRootStyle,
  dragHandleProps,
  isDragging,
  dragHandlePlaceholder,
  onPatchMeta,
  onLinesJsonChange,
  onDelete,
}: MasterPartCardBodyProps) {
  const badge = formatSectionBadge(block.section_tag, block.custom_label);

  return (
    <div
      ref={sortableRootRef}
      style={sortableRootStyle}
      className={cn(
        "rounded-xl border border-border/60 bg-card/95 p-4 shadow-sm",
        isDragging && "z-10 ring-2 ring-primary/20",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {dragHandlePlaceholder ? (
          <div
            className="flex size-9 shrink-0 animate-pulse items-center justify-center rounded-md border border-border/40 bg-muted/30"
            aria-hidden
          />
        ) : canReorder && dragHandleProps ? (
          <button
            type="button"
            className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground active:cursor-grabbing"
            aria-label="마스터 파트 순서"
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/15 text-[10px] text-muted-foreground">
            파트
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">{badge}</span>
            <span className="text-[11px] text-muted-foreground">마스터 파트</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">파트 태그</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={block.section_tag}
                onChange={(e) =>
                  onPatchMeta(block.id, { section_tag: e.target.value as ChordSheetSectionTag })
                }
              >
                {CHORD_SECTION_TAGS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">간주 등 표시 (예: 4마디)</Label>
              <Input
                value={block.custom_label ?? ""}
                placeholder='예: 4마디 → 뱃지 "간주(4마디)"'
                onChange={(e) => onPatchMeta(block.id, { custom_label: e.target.value || null })}
              />
            </div>
          </div>

          <div className="grid max-w-xs gap-1.5">
            <Label className="text-xs">키업 (반음)</Label>
            <Input
              type="number"
              min={-12}
              max={12}
              value={block.transpose_semitones}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(n)) return;
                const clamped = Math.min(12, Math.max(-12, n));
                onPatchMeta(block.id, { transpose_semitones: clamped });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">가사 · 코드 (인라인)</Label>
            <InlineChordLine linesJson={block.lines_json} onChange={(next) => onLinesJsonChange(block.id, next)} />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
              마스터 파트 삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
