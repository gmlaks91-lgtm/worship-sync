"use client";

import { SheetMusicViewButton } from "@/features/songs/components/SheetMusicViewButton";
import { SongSheetMusicEditor } from "@/features/songs/components/SongSheetMusicEditor";

export type SetlistSongItem = {
  id: string;
  title: string;
  sheetMusicUrl: string | null;
};

type SetlistSongsSectionProps = {
  setlistId: string;
  songs: SetlistSongItem[];
  canManage: boolean;
};

export function SetlistSongsSection({ setlistId, songs, canManage }: SetlistSongsSectionProps) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-border/60 bg-white p-5 shadow-sm  print:hidden">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">수록곡</h2>
        <p className="text-xs text-muted-foreground">등록된 악보가 있으면 바로 확인할 수 있어요.</p>
      </div>
      <ul className="space-y-3">
        {songs.map((song, index) => (
          <li
            key={song.id}
            className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-slate-50/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{index + 1}번 곡</p>
              <p className="truncate text-base font-semibold text-foreground">{song.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SheetMusicViewButton title={song.title} sheetMusicUrl={song.sheetMusicUrl} />
              {canManage ? (
                <SongSheetMusicEditor
                  setlistId={setlistId}
                  songId={song.id}
                  songTitle={song.title}
                  initialUrl={song.sheetMusicUrl}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
