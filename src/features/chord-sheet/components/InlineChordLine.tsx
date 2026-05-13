"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { ChordPickerDialog } from "@/features/chord-sheet/components/ChordPickerDialog";
import type { ChordLineRow, LinesJson } from "@/features/chord-sheet/lib/lines-json";
import {
  addEmptyLine,
  normalizeLinesJson,
  removeChordAt,
  removeLine,
  updateLineText,
  upsertChordAt,
} from "@/features/chord-sheet/lib/lines-json";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CHAR_PX = 8.2;

type PickTarget = { lineIndex: number; at: number; existing?: string };

export type InlineChordLineProps = {
  linesJson: unknown;
  readOnly?: boolean;
  onChange?: (next: LinesJson) => void;
};

export function InlineChordLine({ linesJson, readOnly, onChange }: InlineChordLineProps) {
  const lines = useMemo(() => normalizeLinesJson(linesJson), [linesJson]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const rulerRefs = useRef<Array<HTMLDivElement | null>>([]);

  const emit = useCallback(
    (next: LinesJson) => {
      onChange?.(next);
    },
    [onChange],
  );

  const openPicker = (t: PickTarget) => {
    if (readOnly) return;
    setPickTarget(t);
    setPickerOpen(true);
  };

  const handlePick = (symbol: string) => {
    if (!pickTarget || readOnly) return;
    const next = upsertChordAt(lines, pickTarget.lineIndex, pickTarget.at, symbol);
    emit(next);
    setPickTarget(null);
  };

  const rulerClick = (lineIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const el = rulerRefs.current[lineIndex];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const row = lines.lines[lineIndex];
    if (!row) return;
    const x = e.clientX - rect.left;
    const at = Math.min(row.text.length, Math.max(0, Math.floor(x / CHAR_PX)));
    openPicker({ lineIndex, at });
  };

  return (
    <div className="space-y-4">
      {lines.lines.map((line, lineIndex) => (
        <ChordLineRowView
          key={lineIndex}
          line={line}
          lineIndex={lineIndex}
          readOnly={readOnly}
          rulerRef={(el) => {
            rulerRefs.current[lineIndex] = el;
          }}
          onRulerClick={(e) => rulerClick(lineIndex, e)}
          onTextChange={(text) => emit(updateLineText(lines, lineIndex, text))}
          onChordClick={(at, symbol) => openPicker({ lineIndex, at, existing: symbol })}
          onChordRemove={(at) => emit(removeChordAt(lines, lineIndex, at))}
        />
      ))}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => emit(addEmptyLine(lines))}>
            <Plus className="size-3.5" />
            가사 줄 추가
          </Button>
          {lines.lines.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive"
              onClick={() => emit(removeLine(lines, lines.lines.length - 1))}
            >
              마지막 줄 삭제
            </Button>
          ) : null}
        </div>
      ) : null}

      <ChordPickerDialog
        open={pickerOpen}
        onOpenChange={(o) => {
          setPickerOpen(o);
          if (!o) setPickTarget(null);
        }}
        initialSymbol={pickTarget?.existing}
        onPick={handlePick}
      />
    </div>
  );
}

function ChordLineRowView({
  line,
  lineIndex,
  readOnly,
  rulerRef,
  onRulerClick,
  onTextChange,
  onChordClick,
  onChordRemove,
}: {
  line: ChordLineRow;
  lineIndex: number;
  readOnly?: boolean;
  rulerRef: (el: HTMLDivElement | null) => void;
  onRulerClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTextChange: (text: string) => void;
  onChordClick: (at: number, symbol: string) => void;
  onChordRemove: (at: number) => void;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-muted-foreground">줄 {lineIndex + 1}</Label>
        {!readOnly && line.chords.length > 0 ? (
          <p className="text-[10px] text-muted-foreground">코드를 탭하면 수정 · 휴지통은 삭제</p>
        ) : null}
      </div>

      <div
        ref={rulerRef}
        className={cn(
          "relative min-h-[2.25rem] rounded-md border border-dashed border-border/50 bg-background/80",
          !readOnly && "cursor-text hover:border-primary/35",
        )}
        onClick={readOnly ? undefined : onRulerClick}
        title={readOnly ? undefined : "줄 위 빈 곳을 눌러 코드 추가"}
      >
        <div className="absolute inset-x-2 top-1 font-mono text-xs leading-none">
          {line.chords.map((c) => (
            <span
              key={`${c.at}-${c.symbol}`}
              className="pointer-events-auto absolute flex items-center gap-0.5"
              style={{ left: `${c.at * CHAR_PX}px`, top: 0 }}
            >
              {!readOnly ? (
                <button
                  type="button"
                  className="rounded bg-primary/15 px-1.5 py-0.5 font-semibold text-primary hover:bg-primary/25"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChordClick(c.at, c.symbol);
                  }}
                >
                  {c.symbol}
                </button>
              ) : (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{c.symbol}</span>
              )}
              {!readOnly ? (
                <button
                  type="button"
                  className="pointer-events-auto rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label="코드 삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChordRemove(c.at);
                  }}
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <textarea
        readOnly={readOnly}
        className="min-h-[3rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        value={line.text}
        placeholder="가사 (코드는 위 눈금을 클릭)"
        onChange={(e) => onTextChange(e.target.value)}
      />
    </div>
  );
}
