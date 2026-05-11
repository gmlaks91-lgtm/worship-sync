import { notFound } from "next/navigation";

import { SheetViewerScaffold } from "@/features/sheets/components/SheetViewerScaffold";
import { getLatestSheetForSong } from "@/features/sheets/queries/getSheets";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function SheetForSongPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;
  const supabase = await createClient();

  const [sheet, songRes] = await Promise.all([
    getLatestSheetForSong(songId),
    supabase.from("songs").select("title").eq("id", songId).maybeSingle(),
  ]);

  const song = songRes.data;

  if (!song || !sheet) {
    notFound();
  }

  return (
    <SheetViewerScaffold
      mode="page"
      songId={songId}
      songTitle={song.title}
      fileUrls={sheet.image_urls}
      memo={sheet.memo}
    />
  );
}
