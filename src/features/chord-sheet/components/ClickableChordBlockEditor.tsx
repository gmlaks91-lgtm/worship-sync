"use client";

import { useMemo } from "react";

import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import { formatSectionBadge } from "@/features/chord-sheet/constants";
import { normalizeLinesJson } from "@/features/chord-sheet/lib/lines-json";
import { cn } from "@/lib/utils";

const CHAR_PX = 8.2;

export type ChordPaletteTarget = {
  blockId: string;
  lineIndex: number;
  at: number;
  existingSymbol?: string | null;
};

type ClickableChordBlockEditorProps = {
  block: ChordSheetBlockRow;
  target: ChordPaletteTarget | null;
  onPickTarget: (target: ChordPaletteTarget) => void;
};

export function ClickableChordBlockEditor({
  block,
  target,
  onPickTarget,
}: ClickableChordBlockEditorProps) {
  const normalized = useMemo(() => normalizeLinesJson(block.lines_json), [block.lines_json]);
  const badge = formatSectionBadge(block.section_tag, block.custom_label);

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-100/80">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
          {badge}
        </span>
        <span className="text-[11px] text-neutral-400">코드만 편집</span>
      </div>

      <div className="space-y-3">
        {normalized.lines.map((line, lineIndex) => {
          const activeTarget = target?.blockId === block.id && target.lineIndex === lineIndex ? target : null;
          return (
            <div key={`${block.id}-${lineIndex}`} className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
              <div className="relative min-h-[2.25rem] rounded-lg border border-dashed border-neutral-200 bg-white">
                <div className="absolute inset-x-2 top-1 font-mono text-xs leading-none">
                  {line.chords.map((chord) => {
                    const isSelected = activeTarget?.at === chord.at;
                    return (
                      <button
                        key={`${chord.at}-${chord.symbol}`}
                        type="button"
                        className={cn(
                          "absolute rounded px-1.5 py-0.5 font-semibold transition",
                          isSelected
                            ? "bg-neutral-900 text-white"
                            : "bg-primary/10 text-primary hover:bg-primary/20",
                        )}
                        style={{ left: `${chord.at * CHAR_PX}px`, top: 0 }}
                        onClick={() =>
                          onPickTarget({
                            blockId: block.id,
                            lineIndex,
                            at: chord.at,
                            existingSymbol: chord.symbol,
                          })
                        }
                      >
                        {chord.symbol}
                      </button>
                    );
                  })}
                  {activeTarget ? (
                    <span
                      className="absolute h-5 w-0.5 rounded-full bg-neutral-900/70"
                      style={{ left: `${activeTarget.at * CHAR_PX}px`, top: 0 }}
                    />
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                className={cn(
                  "mt-2 block w-full rounded-lg border px-3 py-2 text-left font-mono text-sm leading-relaxed transition",
                  activeTarget
                    ? "border-neutral-900 bg-neutral-100"
                    : "border-neutral-200 bg-white hover:border-neutral-300",
                )}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = event.clientX - rect.left - 12;
                  const at = Math.min(line.text.length, Math.max(0, Math.floor(x / CHAR_PX)));
                  const existing = line.chords.find((chord) => chord.at === at)?.symbol ?? null;
                  onPickTarget({
                    blockId: block.id,
                    lineIndex,
                    at,
                    existingSymbol: existing,
                  });
                }}
              >
                <span className="whitespace-pre-wrap text-neutral-900">{line.text || " "}</span>
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
