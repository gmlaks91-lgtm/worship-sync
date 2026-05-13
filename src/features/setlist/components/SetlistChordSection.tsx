"use client";

import { PdfExportButton, SETLIST_PRINT_ROOT_ID } from "@/features/setlist/components/PdfExportButton";
import { SetlistViewer, type SetlistChordSongItem } from "@/features/setlist/components/SetlistViewer";

type SetlistChordSectionProps = {
  setlistId: string;
  title: string;
  eventDate: string;
  songs: SetlistChordSongItem[];
};

export function SetlistChordSection({ setlistId, title, eventDate, songs }: SetlistChordSectionProps) {
  const safeName = `${title}-${eventDate}`.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-sm font-semibold">콘티 코드 악보</h2>
          <p className="text-xs text-muted-foreground">아래로 스크롤하여 전곡을 확인하고, PDF로 저장할 수 있어요.</p>
        </div>
        <PdfExportButton fileName={`콘티-${safeName}`} />
      </div>

      <div id={SETLIST_PRINT_ROOT_ID} className="rounded-xl border border-border/50 bg-background p-4 print:border-0 print:p-0">
        <header className="mb-6 border-b border-border/60 pb-4 print:mb-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Setlist</p>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{eventDate}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">ID: {setlistId}</p>
        </header>
        <SetlistViewer songs={songs} />
      </div>
    </section>
  );
}
