"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { formatSectionBadge } from "@/features/chord-sheet/constants";
import type { ChordSheetBlockRow, ChordSheetDocumentRow } from "@/features/chord-sheet/domain";
import { InlineChordLine } from "@/features/chord-sheet/components/InlineChordLine";
import { parseArrangement } from "@/features/chord-sheet/lib/lines-json";
import { cn } from "@/lib/utils";

export type SetlistChordSongItem = {
  songId: string;
  title: string;
  document: ChordSheetDocumentRow | null;
  blocks: ChordSheetBlockRow[];
};

type SetlistViewerProps = {
  songs: SetlistChordSongItem[];
};

function blocksById(blocks: ChordSheetBlockRow[]) {
  return new Map(blocks.map((b) => [b.id, b]));
}

export function SetlistViewer({ songs }: SetlistViewerProps) {
  return (
    <div className="flex flex-col gap-10">
      {songs.map((song) => (
        <article
          key={song.songId}
          className="scroll-mt-6 rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm"
          id={`song-${song.songId}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">{song.title}</h2>
              {!song.document ? (
                <p className="text-sm text-muted-foreground">이 곡에는 아직 코드 악보 문서가 없습니다.</p>
              ) : (
                song.document.arrangement_position !== "after_lyrics" &&
                song.document.arrangement_position !== "top_right" ? (
                  <ArrangementBadgeRow document={song.document} blocksById={blocksById(song.blocks)} />
                ) : null
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {song.document?.arrangement_position === "top_right" ? (
                <ArrangementBadgeRow compact document={song.document} blocksById={blocksById(song.blocks)} />
              ) : null}
              <Link
                href={`/sheets/${song.songId}/edit`}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15",
                )}
              >
                편집 모드
                <ChevronRight className="size-3.5 opacity-80" />
              </Link>
            </div>
          </div>

          {song.document && song.blocks.length > 0 ? (
            <div className="mt-5 space-y-8 border-t border-border/50 pt-5">
              {resolvePlaybackOrder(song.document, song.blocks).map((block) => (
                <section key={`${song.songId}-${block.id}`} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {formatSectionBadge(block.section_tag, block.custom_label)}
                  </h3>
                  <InlineChordLine linesJson={block.lines_json} readOnly />
                </section>
              ))}
              {song.document.arrangement_position === "after_lyrics" ? (
                <div className="border-t border-border/40 pt-4">
                  <ArrangementBadgeRow document={song.document} blocksById={blocksById(song.blocks)} />
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ArrangementBadgeRow({
  document,
  blocksById,
  compact,
}: {
  document: ChordSheetDocumentRow;
  blocksById: Map<string, ChordSheetBlockRow>;
  compact?: boolean;
}) {
  const arr = parseArrangement(document.arrangement);
  if (arr.length === 0) {
    return <p className="text-xs text-muted-foreground">진행 순서가 비어 있습니다.</p>;
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-1 text-xs", compact && "justify-end")}>
      {arr.map((entry, idx) => {
        const b = blocksById.get(entry.block_id);
        const label = b ? formatSectionBadge(b.section_tag, b.custom_label) : "?";
        return (
          <span key={`${entry.block_id}-${idx}`} className="flex items-center gap-1">
            {idx > 0 ? <ChevronRight className="size-3 text-muted-foreground/80" aria-hidden /> : null}
            <span
              className={cn(
                "rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono font-semibold text-foreground/90",
                compact && "bg-background px-1.5 text-[11px]",
              )}
            >
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function resolvePlaybackOrder(document: ChordSheetDocumentRow, blocks: ChordSheetBlockRow[]) {
  const map = blocksById(blocks);
  const arr = parseArrangement(document.arrangement);
  const ordered: ChordSheetBlockRow[] = [];
  for (const e of arr) {
    const b = map.get(e.block_id);
    if (b) ordered.push(b);
  }
  if (ordered.length > 0) return ordered;
  return [...blocks].sort((a, b) => a.order_index - b.order_index);
}
