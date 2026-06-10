"use client";

import { PdfExportButton } from "@/features/setlist/components/PdfExportButton";
import { SetlistViewer, type SetlistChordSongItem } from "@/features/setlist/components/SetlistViewer";

type SetlistChordSectionProps = {
  setlistId: string;
  title: string;
  eventDate: string;
  songs: SetlistChordSongItem[];
  pdfSongs: Array<{
    songId: string;
    title: string;
    imageUrls: string[];
  }>;
};

export function SetlistChordSection({ setlistId, title, eventDate, songs, pdfSongs }: SetlistChordSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-sm font-semibold">송리스트 코드 악보</h2>
          <p className="text-xs text-muted-foreground">등록된 악보 이미지를 한 PDF로 묶어 다운로드할 수 있어요.</p>
        </div>
        <PdfExportButton setlistTitle={title} songs={pdfSongs} />
      </div>

      <div className="rounded-xl border border-border/50 bg-background p-4 print:border-0 print:p-0">
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
