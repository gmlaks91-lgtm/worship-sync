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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { MasterPartCard } from "@/features/chord-sheet/components/MasterPartCard";
import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import type { LinesJson } from "@/features/chord-sheet/lib/lines-json";
import { useIsClientMounted } from "@/hooks/use-is-client-mounted";
import { cn } from "@/lib/utils";

export type { ChordSheetBlockRow };

type MasterPartsPanelProps = {
  blocks: ChordSheetBlockRow[];
  canReorder: boolean;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onPatchBlockMeta: (blockId: string, patch: Partial<ChordSheetBlockRow>) => void;
  onLinesJsonChange: (blockId: string, linesJson: LinesJson) => void;
  onDeleteBlock: (blockId: string) => Promise<void>;
};

function MasterPartsSkeleton({ count }: { count: number }) {
  const n = Math.max(1, Math.min(count, 6));
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-36 animate-pulse rounded-xl border border-border/40 bg-muted/20",
            i === 0 && "opacity-100",
            i > 0 && "opacity-80",
          )}
        />
      ))}
    </div>
  );
}

export function MasterPartsPanel({
  blocks,
  canReorder,
  onReorder,
  onPatchBlockMeta,
  onLinesJsonChange,
  onDeleteBlock,
}: MasterPartsPanelProps) {
  const isMounted = useIsClientMounted();

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

  if (!isMounted) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground">순서 편집 영역을 불러오는 중…</p>
        <MasterPartsSkeleton count={blocks.length} />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <MasterPartCard
              key={block.id}
              block={block}
              canReorder={canReorder}
              onPatchMeta={onPatchBlockMeta}
              onLinesJsonChange={onLinesJsonChange}
              onDelete={() => void onDeleteBlock(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
