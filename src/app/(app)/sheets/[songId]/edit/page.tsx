import { notFound } from "next/navigation";

import { ChordSheetEditor } from "@/features/chord-sheet/components/ChordSheetEditor";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChordSheetEditPage({ params }: { params: Promise<{ songId: string }> }) {
  const { songId } = await params;
  const supabase = await createClient();

  const [{ data: song, error: songError }, userRes] = await Promise.all([
    supabase.from("songs").select("id, title").eq("id", songId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (songError || !song) {
    notFound();
  }

  let { data: document } = await supabase
    .from("chord_sheet_documents")
    .select("*")
    .eq("song_id", songId)
    .maybeSingle();

  if (!document) {
    const inserted = await supabase
      .from("chord_sheet_documents")
      .insert({ song_id: songId })
      .select("*")
      .maybeSingle();

    if (inserted.error?.code === "23505") {
      const again = await supabase
        .from("chord_sheet_documents")
        .select("*")
        .eq("song_id", songId)
        .maybeSingle();
      document = again.data;
    } else {
      document = inserted.data;
    }
  }

  if (!document) {
    notFound();
  }

  const { data: blocks } = await supabase
    .from("chord_sheet_blocks")
    .select("*")
    .eq("document_id", document.id)
    .order("order_index", { ascending: true });

  const uid = userRes.data.user?.id;
  let canReorder = false;
  if (uid) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
    canReorder = profile?.role === "leader" || profile?.role === "admin";
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ChordSheetEditor
        songTitle={song.title}
        document={document}
        initialBlocks={blocks ?? []}
        canReorder={canReorder}
      />
    </div>
  );
}
