import { SheetsLibrarySection } from "@/features/sheets/components/SheetsLibrarySection";
import { getSongsForSheetLibrary } from "@/features/sheets/queries/getSongsForSheetLibrary";
import { getLatestSheetsBySongIds } from "@/features/sheets/queries/getSheets";
import { getSongUsageStats } from "@/features/setlist/queries/getSongUsageStats";

export const dynamic = "force-dynamic";

export default async function SheetsPage() {
  const { songs, error: listError } = await getSongsForSheetLibrary();
  const songIds = songs.map((s) => s.id);
  const [sheetMap, usageMap] = await Promise.all([
    getLatestSheetsBySongIds(songIds),
    getSongUsageStats(songIds),
  ]);
  const songsWithStats = songs.map((song) => ({
    ...song,
    yearly_count: usageMap[song.id]?.yearly_count ?? 0,
    last_played_at: usageMap[song.id]?.last_played_at ?? null,
  }));

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">자료실</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">악보 라이브러리</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          여러 장의 이미지 악보를 Supabase Storage에 올리면, 목록에 바로 반영됩니다. 곡을 고른 뒤 파일만
          선택하면 끝입니다.
        </p>
      </header>

      <SheetsLibrarySection songs={songsWithStats} sheetMap={sheetMap} listError={listError} />
    </div>
  );
}
