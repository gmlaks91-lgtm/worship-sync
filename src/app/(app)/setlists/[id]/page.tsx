import { notFound } from "next/navigation";

import { EditSetlistDialog } from "@/features/setlist/components/EditSetlistDialog";
import { SetlistChordSection } from "@/features/setlist/components/SetlistChordSection";
import { StaffNotesEditor } from "@/features/setlist/components/StaffNotesEditor";
import type { SetlistChordSongItem } from "@/features/setlist/components/SetlistViewer";
import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import { getLatestSheetsBySongIds } from "@/features/sheets/queries/getSheets";
import { TEAM_ROLE_OPTIONS, type TeamRoleCode } from "@/lib/team-roles";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function SetlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      id,title,event_date,staff_notes,
      setlist_songs(order_index,songs(id,title,youtube_url)),
      setlist_lineups(role_code,member_id,profiles(username))
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  let canManageSetlist = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    canManageSetlist = profile?.role === "leader" || profile?.role === "admin";
  }

  const { data: membersRaw } = await supabase
    .from("profiles")
    .select("id, username")
    .order("username", { ascending: true });
  const teamMembers = (membersRaw ?? []) as Array<{ id: string; username: string }>;

  const lineupMap = new Map<TeamRoleCode, string[]>();
  for (const role of TEAM_ROLE_OPTIONS) lineupMap.set(role.code, []);
  for (const row of data.setlist_lineups ?? []) {
    const existing = lineupMap.get(row.role_code as TeamRoleCode) ?? [];
    lineupMap.set(row.role_code as TeamRoleCode, [...existing, row.member_id]);
  }
  const initialLineup = TEAM_ROLE_OPTIONS.map((role) => ({
    roleCode: role.code,
    memberIds: lineupMap.get(role.code) ?? [],
  }));
  const initialTracks = (data.setlist_songs ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      title: row.songs?.title ?? "",
      youtubeUrl: row.songs?.youtube_url ?? "",
    }))
    .filter((row) => !!row.youtubeUrl);

  const orderedSongs = (data.setlist_songs ?? [])
    .filter((row) => row.songs?.id)
    .sort((a, b) => a.order_index - b.order_index) as Array<{
    order_index: number;
    songs: { id: string; title: string; youtube_url: string | null };
  }>;

  const songIds = orderedSongs.map((r) => r.songs.id);
  const sheetMap = await getLatestSheetsBySongIds(songIds);

  const { data: docs } = await supabase.from("chord_sheet_documents").select("*").in("song_id", songIds);

  const docBySong = new Map((docs ?? []).map((d) => [d.song_id, d]));
  const docIds = (docs ?? []).map((d) => d.id);

  const { data: blocksRaw } =
    docIds.length > 0
      ? await supabase.from("chord_sheet_blocks").select("*").in("document_id", docIds)
      : { data: [] as const };

  const blocksByDoc = new Map<string, ChordSheetBlockRow[]>();
  for (const b of blocksRaw ?? []) {
    const list = blocksByDoc.get(b.document_id) ?? [];
    list.push(b);
    blocksByDoc.set(b.document_id, list);
  }

  const chordSongs: SetlistChordSongItem[] = orderedSongs.map((row) => {
    const sid = row.songs.id;
    const doc = docBySong.get(sid) ?? null;
    const blocks = doc ? (blocksByDoc.get(doc.id) ?? []).sort((a, b) => a.order_index - b.order_index) : [];
    return {
      songId: sid,
      title: row.songs.title,
      document: doc,
      blocks,
      imageUrls: sheetMap[sid]?.image_urls ?? [],
    };
  });

  const pdfSongs = orderedSongs.map((row) => ({
    songId: row.songs.id,
    title: row.songs.title,
    imageUrls: sheetMap[row.songs.id]?.image_urls ?? [],
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
            <p className="text-sm text-muted-foreground">{data.event_date}</p>
          </div>
          {canManageSetlist ? (
            <EditSetlistDialog
              setlistId={data.id}
              initialTitle={data.title}
              initialEventDate={data.event_date}
              initialTracks={initialTracks}
              initialLineup={initialLineup}
              members={teamMembers}
            />
          ) : null}
        </div>
      </header>

      <SetlistChordSection
        setlistId={data.id}
        title={data.title}
        eventDate={data.event_date}
        songs={chordSongs}
        pdfSongs={pdfSongs}
      />

      <section className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-4 print:hidden">
        <h2 className="text-sm font-semibold">수록곡</h2>
        <ul className="space-y-1 text-sm">
          {(data.setlist_songs ?? [])
            .sort((a, b) => a.order_index - b.order_index)
            .map((row) => (
              <li key={`${data.id}-${row.order_index}`}>{row.songs?.title ?? "알 수 없음"}</li>
            ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-border/60 bg-card/60 p-4 print:hidden">
        <h2 className="text-sm font-semibold">라인업</h2>
        <ul className="space-y-1 text-sm">
          {(data.setlist_lineups ?? []).map((row, idx) => (
            <li key={`${data.id}-${row.role_code}-${idx}`}>
              {row.role_code} · {row.profiles?.username ?? "미배정"}
            </li>
          ))}
        </ul>
      </section>

      <div className="print:hidden">
        <StaffNotesEditor setlistId={data.id} initialValue={data.staff_notes} />
      </div>
    </div>
  );
}
