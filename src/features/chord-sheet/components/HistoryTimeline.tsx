"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { GitBranch, ListOrdered, Pencil, Plus, Trash2 } from "lucide-react";

import type { Tables } from "@/types/database";

type HistoryRow = Tables<"chord_sheet_history">;

function actionMeta(action: HistoryRow["action"]): { label: string; icon: typeof Pencil } {
  switch (action) {
    case "block_insert":
      return { label: "블록 추가", icon: Plus };
    case "block_update":
      return { label: "내용 수정", icon: Pencil };
    case "block_delete":
      return { label: "블록 삭제", icon: Trash2 };
    case "reorder":
      return { label: "순서 변경", icon: ListOrdered };
    default:
      return { label: action, icon: GitBranch };
  }
}

export type HistoryTimelineProps = {
  entries: HistoryRow[];
  actorNames: Record<string, string>;
};

export function HistoryTimeline({ entries, actorNames }: HistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
        아직 기록된 수정 내역이 없습니다.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-border/60 pl-4">
      {entries.map((row, idx) => {
        const meta = actionMeta(row.action);
        const Icon = meta.icon;
        const who = actorNames[row.actor_id] ?? "알 수 없음";
        const when = format(new Date(row.created_at), "M/d HH:mm", { locale: ko });
        const isLast = idx === entries.length - 1;

        return (
          <li key={row.id} className="relative pb-6 last:pb-0">
            <span
              className="absolute -left-[calc(0.25rem+1px)] top-1.5 flex size-2.5 -translate-x-1/2 rounded-full border border-background bg-primary ring-1 ring-primary/30"
              aria-hidden
            />
            <div
              className={
                isLast
                  ? "rounded-lg border border-border/50 bg-card/80 p-3 shadow-sm"
                  : "rounded-lg border border-border/50 bg-card/80 p-3 shadow-sm"
              }
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                    <span className="text-[11px] text-muted-foreground">{when}</span>
                  </div>
                  <p className="text-xs text-foreground/90">
                    <span className="font-medium">{who}</span>
                  </p>
                  {row.block_id ? (
                    <p className="text-[10px] text-muted-foreground">
                      블록 ID: <span className="font-mono">{row.block_id.slice(0, 8)}…</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
