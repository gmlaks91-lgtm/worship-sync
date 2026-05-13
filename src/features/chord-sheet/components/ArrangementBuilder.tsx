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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatSectionBadge } from "@/features/chord-sheet/constants";
import type { ArrangementEntry } from "@/features/chord-sheet/lib/lines-json";
import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsClientMounted } from "@/hooks/use-is-client-mounted";

type ArrangementBuilderProps = {
  documentId: string;
  arrangement: ArrangementEntry[];
  blocksById: Map<string, ChordSheetBlockRow>;
  canReorder: boolean;
  onCommit: (next: ArrangementEntry[]) => Promise<void>;
};

function ArrangementSlot({
  id,
  label,
  canReorder,
}: {
  id: string;
  label: string;
  canReorder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !canReorder,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-1", isDragging && "z-20 opacity-90")}>
      {canReorder ? (
        <button
          type="button"
          className="flex cursor-grab touch-none items-center rounded-md border border-border/50 bg-muted/30 p-1 text-muted-foreground active:cursor-grabbing"
          aria-label="순서 변경"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <Badge variant="secondary" className="h-8 max-w-[12rem] truncate px-2.5 py-1 font-mono text-xs font-semibold">
        {label}
      </Badge>
    </div>
  );
}

type ArrangementDndStripProps = {
  local: ArrangementEntry[];
  slotIds: string[];
  blocksById: Map<string, ChordSheetBlockRow>;
  canReorder: boolean;
  labelFor: (entry: ArrangementEntry) => string;
  onDragEnd: (e: DragEndEvent) => void;
  onRemoveAt: (idx: number) => void;
  pickerOpen: boolean;
  setPickerOpen: (o: boolean) => void;
  onPickBlock: (blockId: string) => void;
};

/** 마운트된 클라이언트에서만 렌더 — 내부에서 dnd 훅 사용 */
function ArrangementDndStrip({
  local,
  slotIds,
  blocksById,
  canReorder,
  labelFor,
  onDragEnd,
  onRemoveAt,
  pickerOpen,
  setPickerOpen,
  onPickBlock,
}: ArrangementDndStripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(ev) => void onDragEnd(ev)}>
      <SortableContext items={slotIds} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-border/50 bg-muted/15 px-2 py-3">
          {local.length === 0 ? (
            <span className="text-xs text-muted-foreground">진행 순서가 비어 있습니다. 블록을 추가하세요.</span>
          ) : null}
          {local.map((entry, idx) => (
            <div key={`${entry.block_id}-${idx}`} className="flex items-center gap-0.5">
              {idx > 0 ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden /> : null}
              <ArrangementSlot id={slotIds[idx]!} label={labelFor(entry)} canReorder={canReorder} />
              {canReorder ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  aria-label="순서에서 제거"
                  onClick={() => onRemoveAt(idx)}
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}

          {canReorder ? (
            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
              <DialogTrigger
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-primary/40 bg-background/80 px-2 text-xs font-medium text-primary hover:bg-primary/10",
                )}
              >
                <Plus className="size-3.5" />
                추가
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>진행 순서에 넣을 파트</DialogTitle>
                </DialogHeader>
                <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                  {[...blocksById.values()]
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((b) => (
                      <li key={b.id}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-start py-2 font-mono text-xs"
                          onClick={() => onPickBlock(b.id)}
                        >
                          {formatSectionBadge(b.section_tag, b.custom_label)}
                        </Button>
                      </li>
                    ))}
                </ul>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ArrangementStripSkeleton({ slotCount }: { slotCount: number }) {
  const n = Math.max(2, Math.min(slotCount + 2, 10));
  return (
    <div
      className="flex min-h-[3.25rem] flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-muted/15 px-2 py-3"
      aria-hidden
    >
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-8 w-14 animate-pulse rounded-md bg-muted/40" />
      ))}
    </div>
  );
}

export function ArrangementBuilder({
  documentId: _documentId,
  arrangement,
  blocksById,
  canReorder,
  onCommit,
}: ArrangementBuilderProps) {
  void _documentId;
  const isMounted = useIsClientMounted();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [local, setLocal] = useState<ArrangementEntry[]>(arrangement);

  useEffect(() => {
    setLocal(arrangement);
  }, [arrangement]);

  const slotIds = local.map((_, i) => `arr-slot-${i}`);

  const labelFor = (entry: ArrangementEntry) => {
    const b = blocksById.get(entry.block_id);
    if (!b) return "?";
    return formatSectionBadge(b.section_tag, b.custom_label);
  };

  async function persist(next: ArrangementEntry[]) {
    setLocal(next);
    await onCommit(next);
  }

  function handleDragEnd(e: DragEndEvent) {
    void (async () => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const oldIndex = slotIds.indexOf(String(active.id));
      const newIndex = slotIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(local, oldIndex, newIndex);
      await persist(next);
    })();
  }

  async function removeAt(idx: number) {
    const next = local.filter((_, i) => i !== idx);
    await persist(next);
  }

  async function appendBlock(blockId: string) {
    const next = [...local, { block_id: blockId }];
    setPickerOpen(false);
    await persist(next);
  }

  const addDialog = canReorder ? (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-primary/40 bg-background/80 px-2 text-xs font-medium text-primary hover:bg-primary/10",
        )}
      >
        <Plus className="size-3.5" />
        추가
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>진행 순서에 넣을 파트</DialogTitle>
        </DialogHeader>
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {[...blocksById.values()]
            .sort((a, b) => a.order_index - b.order_index)
            .map((b) => (
              <li key={b.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start py-2 font-mono text-xs"
                  onClick={() => void appendBlock(b.id)}
                >
                  {formatSectionBadge(b.section_tag, b.custom_label)}
                </Button>
              </li>
            ))}
        </ul>
      </DialogContent>
    </Dialog>
  ) : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">진행 순서 (콘티)</p>

      {!isMounted ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">순서 편집 UI를 불러오는 중…</p>
          <ArrangementStripSkeleton slotCount={local.length} />
          {addDialog}
        </div>
      ) : (
        <ArrangementDndStrip
          local={local}
          slotIds={slotIds}
          blocksById={blocksById}
          canReorder={canReorder}
          labelFor={labelFor}
          onDragEnd={handleDragEnd}
          onRemoveAt={(idx) => void removeAt(idx)}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          onPickBlock={(id) => void appendBlock(id)}
        />
      )}

      {canReorder ? (
        <p className="text-[11px] text-muted-foreground">
          리더·관리자만 순서 변경·추가·제거가 가능합니다. 같은 파트를 반복하려면 &quot;추가&quot;에서 같은 블록을 여러 번 넣으세요.
        </p>
      ) : null}
    </div>
  );
}
