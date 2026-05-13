"use client";

import { useEffect, useState } from "react";

import { CHORD_QUALITIES, CHORD_ROOTS, buildChordSymbol } from "@/features/chord-sheet/lib/chord-symbol";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ChordPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSymbol?: string;
  title?: string;
  onPick: (symbol: string) => void;
};

function parseInitial(initialSymbol: string | undefined): { root: string; quality: string } {
  if (!initialSymbol?.trim()) return { root: "C", quality: "" };
  const s = initialSymbol.trim();
  for (const q of [...CHORD_QUALITIES].sort((a, b) => b.value.length - a.value.length)) {
    if (q.value && s.endsWith(q.value)) {
      const root = s.slice(0, -q.value.length);
      if (CHORD_ROOTS.includes(root as (typeof CHORD_ROOTS)[number])) {
        return { root, quality: q.value };
      }
    }
  }
  if (CHORD_ROOTS.includes(s as (typeof CHORD_ROOTS)[number])) return { root: s, quality: "" };
  return { root: "C", quality: "" };
}

export function ChordPickerDialog({
  open,
  onOpenChange,
  initialSymbol,
  title = "코드 선택",
  onPick,
}: ChordPickerDialogProps) {
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState("");

  useEffect(() => {
    if (!open) return;
    const p = parseInitial(initialSymbol);
    setRoot(p.root);
    setQuality(p.quality);
  }, [open, initialSymbol]);

  const preview = buildChordSymbol(root, quality);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md gap-4 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>루트와 품질을 눌러 코드를 만든 뒤 적용하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-center font-mono text-lg font-semibold tracking-tight">
            {preview || "—"}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">루트</Label>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-6">
              {CHORD_ROOTS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={root === r ? "default" : "outline"}
                  className="h-8 min-w-0 px-0 font-mono text-[11px]"
                  onClick={() => setRoot(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">품질</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHORD_QUALITIES.map((q) => (
                <Button
                  key={q.value || "maj"}
                  type="button"
                  size="sm"
                  variant={quality === q.value ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setQuality(q.value)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => {
              const sym = buildChordSymbol(root, quality);
              if (sym) onPick(sym);
              onOpenChange(false);
            }}
          >
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
