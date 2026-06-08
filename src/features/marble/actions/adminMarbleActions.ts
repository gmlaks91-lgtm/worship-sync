"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadMarbleFace } from "@/features/marble/lib/storage";
import { parsePendingScoreInput } from "@/features/marble/lib/parse-pending-score";
import { MARBLE_BOARD_SIZE, positionFromScore } from "@/features/marble/types";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

const SCORE_FIELD_PREFIX = "score_";

const missionUpsertSchema = z.object({
  tileIndex: z.coerce
    .number()
    .int()
    .min(0)
    .max(MARBLE_BOARD_SIZE - 1, `칸 번호는 0~${MARBLE_BOARD_SIZE - 1} 사이여야 합니다.`),
  missionText: z.string().trim().min(1, "미션 내용을 입력해 주세요.").max(500),
});

const missionDeleteSchema = z.object({
  tileIndex: z.coerce.number().int().min(0).max(MARBLE_BOARD_SIZE - 1),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function revalidateMarble() {
  revalidatePath("/admin/marble");
  revalidatePath("/marble");
}

/**
 * 주간 결과 일괄 반영:
 *  FormData의 score_{목장ID} 값을 읽어 기존 score에 더하고,
 *  position = floor(score / 50) % 24 로 자동 갱신한다. 빈칸은 0점.
 */
export async function applyAllPendingMoves(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { data: teams, error: fetchError } = await supabase
      .from("blue_marble")
      .select("id, score");

    if (fetchError) return { ok: false, message: fetchError.message };
    if (!teams?.length) return { ok: false, message: "반영할 목장이 없습니다." };

    for (const team of teams) {
      const raw = formData.get(`${SCORE_FIELD_PREFIX}${team.id}`);
      const parsed = parsePendingScoreInput(raw);
      if (!parsed.ok) {
        return { ok: false, message: parsed.message };
      }

      const newScore = Math.max(0, team.score + parsed.value);
      const newPosition = positionFromScore(newScore);

      const { error } = await supabase
        .from("blue_marble")
        .update({
          score: newScore,
          position: newPosition,
          pending_score: 0,
          pending_move: 0,
        })
        .eq("id", team.id);

      if (error) return { ok: false, message: error.message };
    }

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "일괄 반영 중 오류가 발생했습니다." };
  }
}

/** 목자 얼굴 이미지 업로드 + image_url 갱신 */
export async function updateMarbleFace(formData: FormData): Promise<ActionResult> {
  const id = formData.get("id")?.toString();
  if (!id || !z.string().uuid().safeParse(id).success) {
    return { ok: false, message: "잘못된 목장 식별자입니다." };
  }

  const fileRaw = formData.get("image");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;
  if (!file) {
    return { ok: false, message: "업로드할 이미지를 선택해 주세요." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: "PNG, JPEG, WEBP, GIF 이미지만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "이미지 용량은 5MB 이하여야 합니다." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const imageUrl = await uploadMarbleFace(file);

    const { error } = await supabase
      .from("blue_marble")
      .update({ image_url: imageUrl })
      .eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "이미지 업로드 중 오류가 발생했습니다." };
  }
}

/** 미션(별) 칸 추가 또는 수정 (tile_index 기준 upsert) */
export async function upsertMarbleMission(formData: FormData): Promise<ActionResult> {
  const parsed = missionUpsertSchema.safeParse({
    tileIndex: formData.get("tileIndex")?.toString(),
    missionText: formData.get("missionText")?.toString(),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase.from("blue_marble_missions").upsert(
      {
        tile_index: parsed.data.tileIndex,
        mission_text: parsed.data.missionText,
      },
      { onConflict: "tile_index" },
    );

    if (error) return { ok: false, message: error.message };

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "미션 저장 중 오류가 발생했습니다." };
  }
}

/** 미션(별) 칸 삭제 */
export async function deleteMarbleMission(formData: FormData): Promise<ActionResult> {
  const parsed = missionDeleteSchema.safeParse({
    tileIndex: formData.get("tileIndex")?.toString(),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "잘못된 칸 번호입니다." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase
      .from("blue_marble_missions")
      .delete()
      .eq("tile_index", parsed.data.tileIndex);

    if (error) return { ok: false, message: error.message };

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "미션 삭제 중 오류가 발생했습니다." };
  }
}
