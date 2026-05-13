"use client";

import type { ButtonHTMLAttributes } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { MasterPartCardBody } from "@/features/chord-sheet/components/MasterPartCardBody";
import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import type { LinesJson } from "@/features/chord-sheet/lib/lines-json";

type MasterPartCardProps = {
  block: ChordSheetBlockRow;
  canReorder: boolean;
  onPatchMeta: (blockId: string, patch: Partial<ChordSheetBlockRow>) => void;
  onLinesJsonChange: (blockId: string, linesJson: LinesJson) => void;
  onDelete: () => void;
};

/** 클라이언트에서만 마운트 — DnD(sortable) 훅 사용 */
export function MasterPartCard(props: MasterPartCardProps) {
  const { block, canReorder } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <MasterPartCardBody
      {...props}
      sortableRootRef={setNodeRef}
      sortableRootStyle={style}
      dragHandleProps={
        canReorder
          ? ({ ...attributes, ...listeners } as ButtonHTMLAttributes<HTMLButtonElement>)
          : undefined
      }
      isDragging={isDragging}
    />
  );
}
