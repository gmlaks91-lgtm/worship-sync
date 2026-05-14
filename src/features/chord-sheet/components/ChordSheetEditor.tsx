"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, History, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrangementBuilder } from "@/features/chord-sheet/components/ArrangementBuilder";
import { HighlightSectionBuilder } from "@/features/chord-sheet/components/HighlightSectionBuilder";
import { HistoryTimeline } from "@/features/chord-sheet/components/HistoryTimeline";
import { formatSectionBadge } from "@/features/chord-sheet/constants";
import type { ChordSheetBlockRow, ChordSheetDocumentRow, ChordSheetHistoryRow } from "@/features/chord-sheet/domain";
import { ARRANGEMENT_POSITION_OPTIONS, type StructureBlockInput } from "@/features/chord-sheet/lib/editor-structure";
import { normalizeLinesJson, parseArrangement, type LinesJson } from "@/features/chord-sheet/lib/lines-json";
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
import type { ChordSheetArrangementPosition, Json } from "@/types/database";

export type ChordSheetEditorProps = {
  songTitle: string;
  document: ChordSheetDocumentRow;
  initialBlocks: ChordSheetBlockRow[];
  canReorder: boolean;
};

export function ChordSheetEditor({
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
  const [busy, setBusy] = useState(false);
  const arrangement = useMemo(() => parseArrangement(document.arrangement), [document.arrangement]);

  const blocksById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);

  const [historyEntries, setHistoryEntries] = useState<ChordSheetHistoryRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const handleApplyStructure = useCallback(
    async (nextBlocks: StructureBlockInput[], arrangementPosition: ChordSheetArrangementPosition) => {
      setBusy(true);
      try {
        const { error } = await supabase.rpc("replace_chord_sheet_structure", {
          p_document_id: document.id,
          p_blocks: nextBlocks as unknown as Json,
          p_arrangement_position: arrangementPosition,
        });

        if (error) {
          toastError(error.message);
          return;
        }

        await refetchBlocks();
        await refetchDocument();
        setHistoryRefreshKey((current) => current + 1);
        toastSuccess("파트 구조가 다시 정리되었습니다.");
      } finally {
        setBusy(false);
      }
    },
    [document.id, refetchBlocks, refetchDocument, supabase],
  );

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
  const arrangementPosition =
    document.arrangement_position ?? ARRANGEMENT_POSITION_OPTIONS[0]?.value ?? "below_title";
  const arrangementPositionLabel =
    ARRANGEMENT_POSITION_OPTIONS.find((option) => option.value === arrangementPosition)?.label ?? "제목 아래";
  const arrangementSummaryText = arrangement
    .map((entry) => {
      const block = blocksById.get(entry.block_id);
      return block ? formatSectionBadge(block.section_tag, block.custom_label) : "?";
    })
    .join(" -> ");
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
            href="/"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0")}
            aria-label="홈으로"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">협업 코드 악보</p>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{songTitle}</h1>
            {updatedLabel ? (
              <p className="text-xs text-muted-foreground">문서 마지막 수정: {updatedLabel}</p>
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
        {!canReorder ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            진행 순서 수정은 리더·관리자만 가능합니다. 팀원은 저장된 순서만 읽기 전용으로 확인할 수 있습니다.
          </p>
        ) : null}

        {canReorder ? (
          <>
            <HighlightSectionBuilder
              blocks={blocks}
              arrangementPosition={arrangementPosition}
              disabled={busy}
              onApplyStructure={handleApplyStructure}
            />

            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-100/80">
              <div className="mb-4">
                <p className="text-base font-semibold text-neutral-900">진행 순서</p>
                <p className="mt-1 text-sm text-neutral-500">
                  추출된 마스터 파트를 반복 순서로 배치하고, 표시 위치는 위 설정을 따라갑니다.
                </p>
              </div>
              <ArrangementBuilder
                documentId={document.id}
                arrangement={arrangement}
                blocksById={blocksById}
                canReorder={canReorder}
                onCommit={handleArrangementCommit}
              />
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-100/80">
            <div className="space-y-2">
              <p className="text-base font-semibold text-neutral-900">진행 순서</p>
              <p className="text-sm text-neutral-500">표시 위치: {arrangementPositionLabel}</p>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-sm leading-relaxed text-neutral-800">
                  {arrangementSummaryText || "저장된 진행 순서가 없습니다."}
                </p>
              </div>
            </div>
          </section>
        )}

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
