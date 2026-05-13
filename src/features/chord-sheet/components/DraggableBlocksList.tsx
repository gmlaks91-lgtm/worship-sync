"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { CHORD_SECTION_TAGS } from "@/features/chord-sheet/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ChordSheetSectionTag, Tables } from "@/types/database";

export type ChordSheetBlockRow = Tables<"chord_sheet_blocks">;

type DraggableBlocksListProps = {
  blocks: ChordSheetBlockRow[];
  canReorder: boolean;
  /** 드래그 완료 후 새 순서의 블록 id 배열 (길이·구성은 기존과 동일해야 함) */
  onReorder: (orderedIds: string[]) => Promise<void>;
  onPatchBlock: (blockId: string, patch: Partial<ChordSheetBlockRow>) => void;
  onDeleteBlock: (blockId: string) => Promise<void>;
};

function SortableBlockRow({
  block,
  canReorder,
  onPatchBlock,
  onDeleteBlock,
}: {
  block: ChordSheetBlockRow;
  canReorder: boolean;
  onPatchBlock: (blockId: string, patch: Partial<ChordSheetBlockRow>) => void;
  onDeleteBlock: (blockId: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border/60 bg-card/90 p-4 shadow-sm ring-1 ring-transparent",
        isDragging && "z-10 opacity-95 ring-primary/25 shadow-md",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {canReorder ? (
          <button
            type="button"
            className={cn(
              "flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground active:cursor-grabbing",
              "touch-none",
            )}
            aria-label="블록 순서 변경"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/15 text-[10px] text-muted-foreground"
            title="순서 변경은 리더·관리자만 가능합니다"
          >
            고정
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">섹션 태그</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={block.section_tag}
                onChange={(e) =>
                  onPatchBlock(block.id, { section_tag: e.target.value as ChordSheetSectionTag })
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
              <Label className="text-xs">표시 라벨 (선택)</Label>
              <Input
                value={block.custom_label ?? ""}
                placeholder="예: V2, 후렴 반복"
                onChange={(e) => onPatchBlock(block.id, { custom_label: e.target.value || null })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,5rem)]">
            <div className="space-y-1.5">
              <Label className="text-xs">가사</Label>
              <textarea
                className="min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={block.lyrics}
                placeholder="가사를 입력하세요"
                onChange={(e) => onPatchBlock(block.id, { lyrics: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
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
                  onPatchBlock(block.id, { transpose_semitones: clamped });
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">코드 (ChordPro·텍스트 등)</Label>
            <textarea
              className="min-h-[72px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              value={block.chords}
              placeholder="예: [G]찬양하세 [D/F#]주 이름을"
              onChange={(e) => onPatchBlock(block.id, { chords: e.target.value })}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void onDeleteBlock(block.id)}
            >
              블록 삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DraggableBlocksList({
  blocks,
  canReorder,
  onReorder,
  onPatchBlock,
  onDeleteBlock,
}: DraggableBlocksListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = blocks.map((b) => b.id);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(blocks, oldIndex, newIndex);
    const orderedIds = reordered.map((b) => b.id);
    await onReorder(orderedIds);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {blocks.map((block) => (
            <SortableBlockRow
              key={block.id}
              block={block}
              canReorder={canReorder}
              onPatchBlock={onPatchBlock}
              onDeleteBlock={onDeleteBlock}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
