"use client";

import { useDebouncedCallback } from "use-debounce";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, History, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrangementBuilder } from "@/features/chord-sheet/components/ArrangementBuilder";
import { HistoryTimeline } from "@/features/chord-sheet/components/HistoryTimeline";
import { MasterPartsPanel } from "@/features/chord-sheet/components/MasterPartsPanel";
import type { ChordSheetBlockRow, ChordSheetDocumentRow, ChordSheetHistoryRow } from "@/features/chord-sheet/domain";
import { emptyLinesJson, parseArrangement, type LinesJson } from "@/features/chord-sheet/lib/lines-json";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import type { Json } from "@/types/database";

export type ChordSheetEditorProps = {
  songId: string;
  songTitle: string;
  document: ChordSheetDocumentRow;
  initialBlocks: ChordSheetBlockRow[];
  canReorder: boolean;
};

export function ChordSheetEditor({
  songId,
  songTitle,
  document: initialDocument,
  initialBlocks,
  canReorder,
}: ChordSheetEditorProps) {
  const supabase = useMemo(() => createClient(), []);
  const [document, setDocument] = useState(initialDocument);
  const [blocks, setBlocks] = useState<ChordSheetBlockRow[]>(() =>
    [...initialBlocks].sort((a, b) => a.order_index - b.order_index),
  );
  const arrangement = useMemo(() => parseArrangement(document.arrangement), [document.arrangement]);

  const blocksById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);

  const [historyEntries, setHistoryEntries] = useState<ChordSheetHistoryRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const dirtyRef = useRef<Record<string, Partial<ChordSheetBlockRow>>>({});
  const dirtyIdsRef = useRef(new Set<string>());

  const refetchBlocks = useCallback(async () => {
    const { data, error } = await supabase
      .from("chord_sheet_blocks")
      .select("*")
      .eq("document_id", document.id)
      .order("order_index", { ascending: true });
    if (error) {
      toastError(error.message);
      return;
    }
    setBlocks(data ?? []);
  }, [document.id, supabase]);

  const refetchDocument = useCallback(async () => {
    const { data, error } = await supabase.from("chord_sheet_documents").select("*").eq("id", document.id).maybeSingle();
    if (error || !data) {
      if (error) toastError(error.message);
      return;
    }
    setDocument(data);
  }, [document.id, supabase]);

  const flushDirty = useDebouncedCallback(async () => {
    const snapshot = { ...dirtyRef.current };
    dirtyRef.current = {};
    for (const [blockId, patch] of Object.entries(snapshot)) {
      if (Object.keys(patch).length === 0) continue;
      const { error } = await supabase.from("chord_sheet_blocks").update(patch).eq("id", blockId);
      if (error) {
        toastError(error.message);
        dirtyRef.current[blockId] = { ...dirtyRef.current[blockId], ...patch };
        continue;
      }
      dirtyIdsRef.current.delete(blockId);
    }
    setHistoryRefreshKey((k) => k + 1);
  }, 900);

  const queuePatch = useCallback(
    (blockId: string, patch: Partial<ChordSheetBlockRow>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? ({ ...b, ...patch } as ChordSheetBlockRow) : b)),
      );
      dirtyRef.current[blockId] = { ...dirtyRef.current[blockId], ...patch };
      dirtyIdsRef.current.add(blockId);
      flushDirty();
    },
    [flushDirty],
  );

  const queueLinesJson = useCallback(
    (blockId: string, lines: LinesJson) => {
      queuePatch(blockId, { lines_json: lines as unknown as Json });
    },
    [queuePatch],
  );

  const handleMasterReorder = useCallback(
    async (orderedIds: string[]) => {
      setBlocks((prev) => {
        const m = new Map(prev.map((b) => [b.id, b]));
        const next = orderedIds
          .map((id) => m.get(id))
          .filter((b): b is ChordSheetBlockRow => b != null)
          .map((b, idx) => ({ ...b, order_index: idx }));
        return next.length === orderedIds.length ? next : prev;
      });

      const { error } = await supabase.rpc("reorder_chord_sheet_blocks", {
        p_document_id: document.id,
        p_block_ids: orderedIds,
      });

      if (error) {
        toastError(error.message);
        await refetchBlocks();
        return;
      }

      dirtyRef.current = {};
      dirtyIdsRef.current.clear();
      await refetchBlocks();
      await refetchDocument();
      setHistoryRefreshKey((k) => k + 1);
      toastSuccess("마스터 파트 순서가 저장되었습니다.");
    },
    [document.id, refetchBlocks, refetchDocument, supabase],
  );

  const handleArrangementCommit = useCallback(
    async (nextArr: ReturnType<typeof parseArrangement>) => {
      const { error } = await supabase.rpc("set_chord_sheet_arrangement", {
        p_document_id: document.id,
        p_arrangement: nextArr as unknown as Json,
      });
      if (error) {
        toastError(error.message);
        await refetchDocument();
        return;
      }
      setDocument((d) => ({ ...d, arrangement: nextArr as unknown as Json }));
      setHistoryRefreshKey((k) => k + 1);
      toastSuccess("진행 순서가 저장되었습니다.");
    },
    [document.id, refetchDocument, supabase],
  );

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      if (!window.confirm("이 마스터 파트를 삭제할까요? 진행 순서에서도 제거됩니다.")) return;
      const { error } = await supabase.from("chord_sheet_blocks").delete().eq("id", blockId);
      if (error) {
        toastError(error.message);
        return;
      }
      delete dirtyRef.current[blockId];
      dirtyIdsRef.current.delete(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      await refetchDocument();
      setHistoryRefreshKey((k) => k + 1);
      toastSuccess("파트가 삭제되었습니다.");
    },
    [refetchDocument, supabase],
  );

  const handleAddBlock = useCallback(async () => {
    setAdding(true);
    const nextIndex = blocks.length;
    const { data, error } = await supabase
      .from("chord_sheet_blocks")
      .insert({
        document_id: document.id,
        section_tag: "A",
        order_index: nextIndex,
        lines_json: emptyLinesJson() as unknown as Json,
        transpose_semitones: 0,
      })
      .select("*")
      .single();

    setAdding(false);
    if (error || !data) {
      toastError(error?.message);
      return;
    }
    setBlocks((prev) => [...prev, data].sort((a, b) => a.order_index - b.order_index));
    await refetchDocument();
    setHistoryRefreshKey((k) => k + 1);
    toastSuccess("마스터 파트가 추가되었습니다.");
  }, [blocks.length, document.id, refetchDocument, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setHistoryLoading(true);
      const { data: rows, error } = await supabase
        .from("chord_sheet_history")
        .select("*")
        .eq("document_id", document.id)
        .order("created_at", { ascending: false })
        .limit(120);

      if (cancelled) return;
      setHistoryLoading(false);

      if (error || !rows) {
        if (error) toastError(error.message);
        setHistoryEntries([]);
        setActorNames({});
        return;
      }

      setHistoryEntries(rows);
      const ids = [...new Set(rows.map((r) => r.actor_id))];
      if (ids.length === 0) {
        setActorNames({});
        return;
      }
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const p of profs ?? []) {
        map[p.id] = p.username;
      }
      setActorNames(map);
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [document.id, historyRefreshKey, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`chord-doc:${document.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chord_sheet_documents",
          filter: `id=eq.${document.id}`,
        },
        (payload) => {
          setDocument(payload.new as ChordSheetDocumentRow);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [document.id, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`chord-blocks:${document.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chord_sheet_blocks",
          filter: `document_id=eq.${document.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as ChordSheetBlockRow | undefined;
            if (oldRow?.id) {
              setBlocks((prev) => prev.filter((b) => b.id !== oldRow.id));
            }
            void refetchDocument();
            return;
          }

          if (payload.eventType === "INSERT") {
            const row = payload.new as ChordSheetBlockRow;
            setBlocks((prev) => {
              if (prev.some((b) => b.id === row.id)) {
                return prev.map((b) => (b.id === row.id ? row : b)).sort((a, b) => a.order_index - b.order_index);
              }
              return [...prev, row].sort((a, b) => a.order_index - b.order_index);
            });
            void refetchDocument();
            return;
          }

          if (payload.eventType === "UPDATE") {
            const row = payload.new as ChordSheetBlockRow;
            if (dirtyIdsRef.current.has(row.id)) {
              return;
            }
            setBlocks((prev) =>
              prev.map((b) => (b.id === row.id ? row : b)).sort((a, b) => a.order_index - b.order_index),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [document.id, refetchDocument, supabase]);

  const updatedLabel = document.updated_at
    ? format(new Date(document.updated_at), "PPP p", { locale: ko })
    : null;

  const historyPanel = (
    <div className="flex max-h-[min(70vh,32rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">최근 120건</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setHistoryRefreshKey((k) => k + 1)}
          disabled={historyLoading}
        >
          <RefreshCw className={cn("size-3.5", historyLoading && "animate-spin")} />
          새로고침
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <HistoryTimeline entries={historyEntries} actorNames={actorNames} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Link
            href={`/sheets/${songId}`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0")}
            aria-label="이미지 악보로"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">협업 코드 악보</p>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{songTitle}</h1>
            <ArrangementBuilder
              documentId={document.id}
              arrangement={arrangement}
              blocksById={blocksById}
              canReorder={canReorder}
              onCommit={handleArrangementCommit}
            />
            {updatedLabel ? (
              <p className="text-xs text-muted-foreground">문서 마지막 수정: {updatedLabel}</p>
            ) : null}
            {!canReorder ? (
              <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90">
                진행 순서 편집은 리더·관리자만 가능합니다. 가사·코드는 팀원 모두 인라인으로 편집할 수 있어요.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 gap-1.5 lg:hidden")}
            >
              <History className="size-3.5" />
              수정 내역
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-md gap-4 overflow-hidden sm:max-w-md">
              <DialogHeader>
                <DialogTitle>수정 내역</DialogTitle>
              </DialogHeader>
              {historyPanel}
            </DialogContent>
          </Dialog>

          <Button type="button" size="sm" className="h-9 gap-1.5" onClick={() => void handleAddBlock()} disabled={adding}>
            <Plus className="size-3.5" />
            마스터 파트 추가
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <MasterPartsPanel
            blocks={blocks}
            canReorder={canReorder}
            onReorder={handleMasterReorder}
            onPatchBlockMeta={queuePatch}
            onLinesJsonChange={queueLinesJson}
            onDeleteBlock={handleDeleteBlock}
          />
          {blocks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
              마스터 파트가 없습니다. 위 버튼으로 A/B/C 등 파트를 추가한 뒤, 진행 순서를 구성하세요.
            </p>
          ) : null}
        </div>

        <aside className="hidden w-full shrink-0 border-l border-border/60 pl-0 lg:block lg:w-[22rem] lg:pl-6">
          <div className="sticky top-4 space-y-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">수정 내역</h2>
            </div>
            {historyPanel}
          </div>
        </aside>
      </div>
    </div>
  );
}
