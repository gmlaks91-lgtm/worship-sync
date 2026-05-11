"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveTrackSongIds } from "@/features/setlist/actions/setlistActions";
import { addSetlistTrackSchema } from "@/features/setlist/schemas/addSetlist";
import { getYoutubeVideoId, toYoutubeWatchUrl } from "@/features/setlist/utils/youtube";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

export type WeeklySetlistActionResult = { ok: true } | { ok: false; message: string };

const setlistIdSchema = z.string().uuid();

async function assertSongInSetlist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setlistId: string,
  songId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("setlist_songs")
    .select("song_id")
    .eq("setlist_id", setlistId)
    .eq("song_id", songId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

async function compactOrderIndices(supabase: Awaited<ReturnType<typeof createClient>>, setlistId: string) {
  const { data: rows, error } = await supabase
    .from("setlist_songs")
    .select("song_id")
    .eq("setlist_id", setlistId)
    .order("order_index", { ascending: true });
  if (error || !rows?.length) return;
  for (let i = 0; i < rows.length; i++) {
    await supabase
      .from("setlist_songs")
      .update({ order_index: i })
      .eq("setlist_id", setlistId)
      .eq("song_id", rows[i].song_id);
  }
}

export async function appendTrackToPrepSetlist(raw: unknown): Promise<WeeklySetlistActionResult> {
  const parsed = z
    .object({
      setlistId: setlistIdSchema,
      track: addSetlistTrackSchema,
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { setlistId, track } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const resolved = await resolveTrackSongIds(supabase, [track]);
    if (!resolved.ok) return { ok: false, message: resolved.message };
    const songId = resolved.songIds[0];

    const { data: existing } = await supabase
      .from("setlist_songs")
      .select("song_id")
      .eq("setlist_id", setlistId)
      .eq("song_id", songId)
      .maybeSingle();
    if (existing) {
      return { ok: false, message: "이미 이 송리스트에 포함된 곡입니다." };
    }

    const { data: maxRow } = await supabase
      .from("setlist_songs")
      .select("order_index")
      .eq("setlist_id", setlistId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.order_index ?? -1) + 1;

    const { error: insErr } = await supabase.from("setlist_songs").insert({
      setlist_id: setlistId,
      song_id: songId,
      order_index: nextOrder,
    });
    if (insErr) return { ok: false, message: insErr.message };

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

export async function removeTrackFromPrepSetlist(raw: unknown): Promise<WeeklySetlistActionResult> {
  const parsed = z
    .object({ setlistId: setlistIdSchema, songId: z.string().uuid() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값을 확인해 주세요." };

  const { setlistId, songId } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error: delErr } = await supabase
      .from("setlist_songs")
      .delete()
      .eq("setlist_id", setlistId)
      .eq("song_id", songId);
    if (delErr) return { ok: false, message: delErr.message };

    await compactOrderIndices(supabase, setlistId);

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

export async function movePrepSetlistSong(
  raw: unknown,
): Promise<WeeklySetlistActionResult> {
  const parsed = z
    .object({
      setlistId: setlistIdSchema,
      songId: z.string().uuid(),
      direction: z.enum(["up", "down"]),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값을 확인해 주세요." };

  const { setlistId, songId, direction } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { data: rows, error: readErr } = await supabase
      .from("setlist_songs")
      .select("song_id")
      .eq("setlist_id", setlistId)
      .order("order_index", { ascending: true });
    if (readErr || !rows?.length) return { ok: false, message: readErr?.message ?? "곡이 없습니다." };

    const orderedIds = rows.map((r) => r.song_id);
    const idx = orderedIds.indexOf(songId);
    if (idx < 0) return { ok: false, message: "곡을 찾을 수 없습니다." };
    const j = direction === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= orderedIds.length) return { ok: true };

    const next = [...orderedIds];
    [next[idx], next[j]] = [next[j], next[idx]];

    const { error: delErr } = await supabase.from("setlist_songs").delete().eq("setlist_id", setlistId);
    if (delErr) return { ok: false, message: delErr.message };

    const { error: insErr } = await supabase.from("setlist_songs").insert(
      next.map((id, order_index) => ({ setlist_id: setlistId, song_id: id, order_index })),
    );
    if (insErr) return { ok: false, message: insErr.message };

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

export async function updateSongInPrepSetlist(raw: unknown): Promise<WeeklySetlistActionResult> {
  const parsed = z
    .object({
      setlistId: setlistIdSchema,
      songId: z.string().uuid(),
      title: z.string().trim().min(1, "제목을 입력하세요"),
      youtubeUrl: z
        .string()
        .min(1, "YouTube URL을 입력하세요")
        .refine((u) => !!getYoutubeVideoId(u), "유효하지 않은 YouTube URL입니다"),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { setlistId, songId, title, youtubeUrl } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const inList = await assertSongInSetlist(supabase, setlistId, songId);
    if (!inList) return { ok: false, message: "이 송리스트에 없는 곡입니다." };

    const videoId = getYoutubeVideoId(youtubeUrl);
    if (!videoId) return { ok: false, message: "유효하지 않은 YouTube URL입니다." };
    const canonical = toYoutubeWatchUrl(videoId);

    const { error: upErr } = await supabase
      .from("songs")
      .update({ title, youtube_url: canonical })
      .eq("id", songId);
    if (upErr) return { ok: false, message: upErr.message };

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}

export async function updatePrepSetlistHeader(raw: unknown): Promise<WeeklySetlistActionResult> {
  const parsed = z
    .object({
      setlistId: setlistIdSchema,
      title: z.string().trim().min(1, "제목을 입력하세요"),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { setlistId, title, eventDate } = parsed.data;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase.from("setlists").update({ title, event_date: eventDate }).eq("id", setlistId);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/");
    revalidatePath(`/setlists/${setlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류" };
  }
}
