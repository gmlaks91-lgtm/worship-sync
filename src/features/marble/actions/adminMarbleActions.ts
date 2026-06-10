"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadMarbleFace } from "@/features/marble/lib/storage";
import { parsePendingScoreInput } from "@/features/marble/lib/parse-pending-score";
import { MARBLE_BOARD_SIZE } from "@/features/marble/types";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

const marbleScoreDeltaSchema = z.object({
  id: z.string().uuid(),
  delta: z.number().int().min(-1_000_000).max(1_000_000),
});

const applyMarbleScoreDeltasSchema = z.object({
  deltas: z.array(marbleScoreDeltaSchema),
});

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

export type ApplyMarbleScoreDeltasInput = z.infer<typeof applyMarbleScoreDeltasSchema>;

/**
 * 주간 결과 일괄 반영:
 *  목장별 delta를 DB RPC로 한 번에 반영한다 (50점 = 1칸 자동 이동).
 */
export async function applyMarbleScoreDeltas(
  raw: ApplyMarbleScoreDeltasInput,
): Promise<ActionResult> {
  const parsed = applyMarbleScoreDeltasSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "입력값을 다시 확인해 주세요." };
  }

  const nonZeroDeltas = parsed.data.deltas.filter((item) => item.delta !== 0);
  if (nonZeroDeltas.length === 0) {
    return { ok: false, message: "반영할 점수 변경이 없습니다. 추가 점수를 입력해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { data, error } = await supabase.rpc("apply_marble_score_deltas", {
      p_deltas: nonZeroDeltas,
    });

    if (error) return { ok: false, message: error.message };

    const row = Array.isArray(data) ? data[0] : null;
    const updatedCount = Number(row?.updated_count ?? 0);
    if (updatedCount === 0) {
      return {
        ok: false,
        message:
          row?.message ??
          "점수가 반영되지 않았습니다. 리더/관리자 권한과 DB 마이그레이션 적용 여부를 확인해 주세요.",
      };
    }

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "일괄 반영 중 오류가 발생했습니다." };
  }
}

/** @deprecated FormData 대신 applyMarbleScoreDeltas 사용 */
export async function applyAllPendingMoves(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { data: teams, error: fetchError } = await supabase
      .from("blue_marble")
      .select("id");

    if (fetchError) return { ok: false, message: fetchError.message };
    if (!teams?.length) return { ok: false, message: "반영할 목장이 없습니다." };

    const deltas: ApplyMarbleScoreDeltasInput["deltas"] = [];
    for (const team of teams) {
      const raw = formData.get(`score_${team.id}`);
      const parsed = parsePendingScoreInput(raw);
      if (!parsed.ok) return { ok: false, message: parsed.message };
      if (parsed.value !== 0) {
        deltas.push({ id: team.id, delta: parsed.value });
      }
    }

    return applyMarbleScoreDeltas({ deltas });
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
