"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { CHORD_SECTION_TAGS, formatSectionBadge } from "@/features/chord-sheet/constants";
import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import {
  ARRANGEMENT_POSITION_OPTIONS,
  buildStructureBlocksFromSelection,
  flattenBlocksToSelectableLines,
  normalizeSelectionRange,
  type LineSelectionRange,
  type StructureBlockInput,
} from "@/features/chord-sheet/lib/editor-structure";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChordSheetArrangementPosition } from "@/types/database";

type HighlightSectionBuilderProps = {
  blocks: ChordSheetBlockRow[];
  arrangementPosition: ChordSheetArrangementPosition;
  disabled?: boolean;
  onApplyStructure: (nextBlocks: StructureBlockInput[], arrangementPosition: ChordSheetArrangementPosition) => Promise<void>;
};

export function HighlightSectionBuilder({
  blocks,
  arrangementPosition,
  disabled,
  onApplyStructure,
}: HighlightSectionBuilderProps) {
  const flatLines = useMemo(() => flattenBlocksToSelectableLines(blocks), [blocks]);
  const [selection, setSelection] = useState<LineSelectionRange | null>(null);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);
  const [localArrangementPosition, setLocalArrangementPosition] = useState(arrangementPosition);

  useEffect(() => {
    setLocalArrangementPosition(arrangementPosition);
  }, [arrangementPosition]);

  useEffect(() => {
    if (dragAnchor == null) return;

    const handleMouseUp = () => {
      setDragAnchor(null);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragAnchor]);

  const normalizedSelection = normalizeSelectionRange(selection);

  const onTagApply = async (sectionTag: (typeof CHORD_SECTION_TAGS)[number]["value"]) => {
    const nextBlocks = buildStructureBlocksFromSelection(flatLines, normalizedSelection, sectionTag);
    await onApplyStructure(nextBlocks, localArrangementPosition);
    setSelection(null);
    setDragAnchor(null);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-100/80">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-base font-semibold text-neutral-900">파트 지정 모드</p>
          <p className="mt-1 text-sm text-neutral-500">
            가사 줄을 드래그로 선택한 뒤 파트 태그를 누르면 독립된 마스터 파트로 재구성됩니다.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          구조 재적용 시 진행 순서는 현재 파트 순서 기준으로 다시 맞춰집니다.
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">진행 순서 배지 위치</p>
        <div className="grid gap-2 md:grid-cols-3">
          {ARRANGEMENT_POSITION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => setLocalArrangementPosition(option.value)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition",
                localArrangementPosition === option.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white",
              )}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className={cn("mt-1 text-xs", localArrangementPosition === option.value ? "text-neutral-300" : "text-neutral-500")}>
                {option.helper}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || flatLines.length === 0}
            className="h-9 border-neutral-200 bg-white"
            onClick={() =>
              void onApplyStructure(
                buildStructureBlocksFromSelection(flatLines, null, "A"),
                localArrangementPosition,
              )
            }
          >
            배지 위치만 저장
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">선택한 줄을 태그로 추출</p>
        <div className="flex flex-wrap gap-2">
          {CHORD_SECTION_TAGS.map((tag) => (
            <Button
              key={tag.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || flatLines.length === 0}
              className="h-9 border-neutral-200 bg-white"
              onClick={() => void onTagApply(tag.value)}
            >
              <Sparkles className="size-3.5" aria-hidden />
              {tag.value}
            </Button>
          ))}
        </div>
        <p className="text-[11px] text-neutral-500">
          선택이 없으면 현재 블록 경계를 유지한 채 구조를 다시 정리합니다.
        </p>
      </div>

      {flatLines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          아직 파트가 없습니다. 먼저 가사 텍스트 모드에서 초안을 만들거나, 기본 파트를 추가해 주세요.
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3">
          {flatLines.map((item) => {
            const selected =
              normalizedSelection != null &&
              item.globalIndex >= normalizedSelection.start &&
              item.globalIndex <= normalizedSelection.end;
            return (
              <div
                key={`${item.sourceBlockId}-${item.sourceLineIndex}`}
                onMouseDown={() => {
                  if (disabled) return;
                  setDragAnchor(item.globalIndex);
                  setSelection({ start: item.globalIndex, end: item.globalIndex });
                }}
                onMouseEnter={() => {
                  if (disabled || dragAnchor == null) return;
                  setSelection({ start: dragAnchor, end: item.globalIndex });
                }}
                className={cn(
                  "rounded-xl border px-4 py-3 transition select-none",
                  selected
                    ? "border-primary/40 bg-primary/10"
                    : "border-transparent bg-white hover:border-neutral-200",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                    {formatSectionBadge(item.section_tag, item.custom_label)}
                  </span>
                  <span className="text-[11px] text-neutral-400">줄 {item.globalIndex + 1}</span>
                </div>
                <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-neutral-900">
                  {item.line.text || " "}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
