"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BookOpen, ChevronRight, FileMusic, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { SheetLibrarySongRow } from "@/features/sheets/queries/getSongsForSheetLibrary";
import type { SheetSummary } from "@/features/sheets/types";
import { UploadSheetModal } from "@/features/sheets/components/UploadSheetModal";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SheetsLibrarySectionProps = {
  songs: SheetLibrarySongRow[];
  sheetMap: Record<string, SheetSummary | undefined>;
  listError: string | null;
};

export function SheetsLibrarySection({ songs, sheetMap, listError }: SheetsLibrarySectionProps) {
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [libraryDialogKey, setLibraryDialogKey] = useState(0);
  const [quickUpload, setQuickUpload] = useState<{ id: string; title: string } | null>(null);
  const [quickDialogKey, setQuickDialogKey] = useState(0);

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          곡마다 PDF·이미지 악보를 올리고, 전용 뷰어에서 볼 수 있습니다.
        </p>
        <Button
          type="button"
          size="default"
          className="h-11 w-full gap-2 sm:h-10 sm:w-auto sm:min-w-[11rem]"
          onClick={() => {
            setLibraryDialogKey((k) => k + 1);
            setLibraryModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          악보 추가
        </Button>
      </div>

      {listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          곡 목록을 불러오지 못했습니다: {listError}
        </div>
      ) : null}

      {!listError && songs.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/15">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">등록된 곡이 없습니다</CardTitle>
            <CardDescription>
              홈 화면에서 리더가 송리스트를 추가하면 곡이 생깁니다. 그 후 이 페이지에서 악보를 올릴 수
              있어요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!listError && songs.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {songs.map((song) => {
            const latest = sheetMap[song.id];
            return (
              <li key={song.id}>
                <Card className="overflow-hidden border-border/55 transition-colors hover:border-border">
                  <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30",
                        )}
                        aria-hidden
                      >
                        {latest ? (
                          <FileMusic className="size-5 text-primary" />
                        ) : (
                          <BookOpen className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold leading-snug tracking-tight">{song.title}</p>
                        {latest ? (
                          <p className="text-xs text-muted-foreground">
                            최신 악보 ·{" "}
                            {format(new Date(latest.created_at), "PPP p", { locale: ko })}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-800/90">
                            아직 올라온 악보가 없습니다. 아래에서 추가해 보세요.
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          올해 누적 {song.yearly_count ?? 0}회 찬양
                          {song.last_played_at ? ` · 최근 찬양일: ${song.last_played_at}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full gap-1 sm:w-auto"
                        onClick={() => {
                          setQuickDialogKey((k) => k + 1);
                          setQuickUpload({ id: song.id, title: song.title });
                        }}
                      >
                        악보 올리기
                      </Button>
                      <Link
                        href={`/sheets/${song.id}`}
                        className={cn(
                          buttonVariants({ variant: "default" }),
                          "h-10 w-full justify-center gap-1 px-4 sm:w-auto",
                        )}
                      >
                        뷰어로 보기
                        <ChevronRight className="size-4 opacity-80" aria-hidden />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}

      <UploadSheetModal
        key={`lib-${libraryDialogKey}`}
        open={libraryModalOpen}
        onOpenChange={setLibraryModalOpen}
        mode="library"
        songs={songs}
      />

      {quickUpload ? (
        <UploadSheetModal
          key={`q-${quickUpload.id}-${quickDialogKey}`}
          open
          onOpenChange={(o) => {
            if (!o) setQuickUpload(null);
          }}
          mode="song"
          songId={quickUpload.id}
          songTitle={quickUpload.title}
        />
      ) : null}
    </>
  );
}
