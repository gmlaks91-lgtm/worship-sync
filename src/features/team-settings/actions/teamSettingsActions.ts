"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { extractYouTubePlaylistId } from "@/features/team-settings/lib/youtube-playlist";
import { extractYouTubeVideoId } from "@/features/team-settings/lib/youtube-video";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

const updatePlaylistSchema = z.object({
  playlistInput: z.string().trim().min(1, "유튜브 플레이리스트 링크를 입력해 주세요."),
});
const updateWorshipVideoSchema = z.object({
  videoInput: z.string().trim().min(1, "예배 영상 링크를 입력해 주세요."),
});

type ActionResult = { ok: true } | { ok: false; message: string };

export async function updateTeamPlaylist(raw: z.infer<typeof updatePlaylistSchema>): Promise<ActionResult> {
  const parsed = updatePlaylistSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 확인해 주세요." };
  }

  const playlistId = extractYouTubePlaylistId(parsed.data.playlistInput);
  if (!playlistId) {
    return { ok: false, message: "유효한 유튜브 플레이리스트 URL 또는 ID를 입력해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: "리더만 플레이리스트를 수정할 수 있습니다." };
    }

    const { error } = await supabase.from("team_settings").upsert(
      {
        id: true,
        playlist_id: playlistId,
        updated_by: leader.userId,
      },
      { onConflict: "id" },
    );

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function updateLastWorshipVideo(
  raw: z.infer<typeof updateWorshipVideoSchema>,
): Promise<ActionResult> {
  const parsed = updateWorshipVideoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 확인해 주세요." };
  }

  const videoId = extractYouTubeVideoId(parsed.data.videoInput);
  if (!videoId) {
    return { ok: false, message: "유효한 유튜브 영상 URL 또는 ID를 입력해 주세요." };
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) {
      return { ok: false, message: "리더만 예배 영상을 수정할 수 있습니다." };
    }

    const { error } = await supabase.from("team_settings").upsert(
      {
        id: true,
        last_worship_video_url: canonicalUrl,
        updated_by: leader.userId,
      },
      { onConflict: "id" },
    );

    if (error) return { ok: false, message: error.message };

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
