"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fetchYoutubeOEmbedTitle } from "@/features/setlist/utils/youtube-meta";
import {
  createPrepSetlistPayloadSchema,
  type CreatePrepSetlistPayload,
} from "@/features/setlist/schemas/addSetlist";
import { getYoutubeVideoId, toYoutubeWatchUrl } from "@/features/setlist/utils/youtube";
import { requireLeader } from "@/lib/require-leader";
import type { TeamRoleCode } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type CreatePrepSetlistResult = { ok: true } | { ok: false; message: string };
const updatePrepSetlistSchema = z.object({
  setlistId: z.string().uuid(),
  title: z.string().min(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tracks: createPrepSetlistPayloadSchema.shape.tracks,
  lineup: createPrepSetlistPayloadSchema.shape.lineup,
});

function buildLineupRows(
  setlistId: string,
  lineup: Array<{ roleCode: TeamRoleCode; memberIds: string[] }>,
) {
  return lineup.flatMap((item) =>
    item.memberIds.map((memberId) => ({
      setlist_id: setlistId,
      role_code: item.roleCode,
      member_id: memberId,
    })),
  );
}

export async function createPrepSetlist(raw: CreatePrepSetlistPayload): Promise<CreatePrepSetlistResult> {
  const parsed = createPrepSetlistPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인해 주세요." };
  }

  const { title, eventDate, tracks, lineup } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { data: setlist, error: setlistError } = await supabase
      .from("setlists")
      .insert({ title, event_date: eventDate, status: "prep" })
      .select("id")
      .single();

    if (setlistError || !setlist) {
      return { ok: false, message: setlistError?.message ?? "콘티를 생성하지 못했습니다." };
    }

    const setlistId = setlist.id;

    const songIdsOrdered = await resolveTrackSongIds(supabase, tracks);
    if (!songIdsOrdered.ok) {
      await supabase.from("setlists").delete().eq("id", setlistId);
      return { ok: false, message: songIdsOrdered.message };
    }

    const songRows = songIdsOrdered.songIds.map((songId, index) => ({
      setlist_id: setlistId,
      song_id: songId,
      order_index: index,
    }));
    const { error: junctionError } = await supabase.from("setlist_songs").insert(songRows);
    if (junctionError) {
      await supabase.from("setlists").delete().eq("id", setlistId);
      return { ok: false, message: junctionError.message };
    }

    const lineupRows = buildLineupRows(
      setlistId,
      lineup.map((item) => ({ roleCode: item.roleCode, memberIds: item.memberIds })),
    );

    if (lineupRows.length > 0) {
      const { error: lineupErr } = await supabase.from("setlist_lineups").insert(lineupRows);
      if (lineupErr) {
        await supabase.from("setlists").delete().eq("id", setlistId);
        return { ok: false, message: lineupErr.message };
      }
    }

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function resolveTrackSongIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tracks: Array<{ title: string; youtubeUrl: string }>,
): Promise<{ ok: true; songIds: string[] } | { ok: false; message: string }> {
  const { data: existingSongs, error: songsReadError } = await supabase.from("songs").select("id, youtube_url");
  if (songsReadError) {
    return { ok: false, message: songsReadError.message };
  }

  const byVideoId = new Map<string, string>();
  for (const row of existingSongs ?? []) {
    const vid = getYoutubeVideoId(row.youtube_url);
    if (vid) byVideoId.set(vid, row.id);
  }

  const songIdsOrdered: string[] = [];
  for (const track of tracks) {
    const videoId = getYoutubeVideoId(track.youtubeUrl);
    if (!videoId) {
      return { ok: false, message: "유효하지 않은 YouTube URL이 포함되어 있습니다." };
    }

    let songId = byVideoId.get(videoId);
    const preferredTitle = track.title.trim();
    if (!songId) {
      const canonical = toYoutubeWatchUrl(videoId);
      const oembedTitle = await fetchYoutubeOEmbedTitle(canonical);
      const songTitle = preferredTitle || oembedTitle || `YouTube - ${videoId}`;

      const { data: inserted, error: insertSongError } = await supabase
        .from("songs")
        .insert({ title: songTitle, youtube_url: canonical, description: null })
        .select("id")
        .single();

      if (insertSongError || !inserted) {
        return { ok: false, message: insertSongError?.message ?? "곡을 생성하지 못했습니다." };
      }

      songId = inserted.id;
      byVideoId.set(videoId, songId);
    } else if (preferredTitle) {
      // 같은 URL의 기존 곡이 있어도 리더가 제목을 명시적으로 수정할 수 있게 동기화
      await supabase.from("songs").update({ title: preferredTitle }).eq("id", songId);
    }

    songIdsOrdered.push(songId);
  }

  return { ok: true, songIds: songIdsOrdered };
}

export async function updatePrepSetlist(raw: z.infer<typeof updatePrepSetlistSchema>): Promise<CreatePrepSetlistResult> {
  const parsed = updatePrepSetlistSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return { ok: false, message: msg || "입력값을 확인해 주세요." };
  }

  const { setlistId, title, eventDate, tracks, lineup } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error: updateSetlistErr } = await supabase
      .from("setlists")
      .update({ title, event_date: eventDate })
      .eq("id", setlistId);
    if (updateSetlistErr) return { ok: false, message: updateSetlistErr.message };

    const songIdsOrdered = await resolveTrackSongIds(supabase, tracks);
    if (!songIdsOrdered.ok) return { ok: false, message: songIdsOrdered.message };

    const { error: delSongsErr } = await supabase.from("setlist_songs").delete().eq("setlist_id", setlistId);
    if (delSongsErr) return { ok: false, message: delSongsErr.message };

    const songRows = songIdsOrdered.songIds.map((songId, index) => ({
      setlist_id: setlistId,
      song_id: songId,
      order_index: index,
    }));
    const { error: insSongsErr } = await supabase.from("setlist_songs").insert(songRows);
    if (insSongsErr) return { ok: false, message: insSongsErr.message };

    const { error: delLineupErr } = await supabase.from("setlist_lineups").delete().eq("setlist_id", setlistId);
    if (delLineupErr) return { ok: false, message: delLineupErr.message };

    const lineupRows = buildLineupRows(
      setlistId,
      lineup.map((item) => ({ roleCode: item.roleCode, memberIds: item.memberIds })),
    );
    if (lineupRows.length > 0) {
      const { error: insLineupErr } = await supabase.from("setlist_lineups").insert(lineupRows);
      if (insLineupErr) return { ok: false, message: insLineupErr.message };
    }

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function upsertSetlistLineup(raw: {
  setlistId: string;
  lineup: Array<{ roleCode: TeamRoleCode; memberIds: string[] }>;
}): Promise<CreatePrepSetlistResult> {
  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error: delErr } = await supabase
      .from("setlist_lineups")
      .delete()
      .eq("setlist_id", raw.setlistId);
    if (delErr) return { ok: false, message: delErr.message };

    const rows = buildLineupRows(raw.setlistId, raw.lineup);

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("setlist_lineups").insert(rows);
      if (insErr) return { ok: false, message: insErr.message };
    }

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
