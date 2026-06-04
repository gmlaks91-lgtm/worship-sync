"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadMarbleFace } from "@/features/marble/lib/storage";
import { parsePendingScoreInput } from "@/features/marble/lib/parse-pending-score";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

/** 라이브 이벤트: 주중에 모아두는 대기 점수 (칸 이동은 50점 룰로 자동 계산) */
const pendingIdSchema = z.object({
  id: z.string().uuid({ message: "잘못된 목장 식별자입니다." }),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function revalidateMarble() {
  revalidatePath("/admin/marble");
  revalidatePath("/marble");
}

/** 목장의 '이번 주 대기 점수'만 업데이트 (position은 일괄 반영 시 점수로 자동 계산) */
export async function updateMarblePending(formData: FormData): Promise<ActionResult> {
  const idParsed = pendingIdSchema.safeParse({
    id: formData.get("id")?.toString(),
  });

  if (!idParsed.success) {
    return { ok: false, message: idParsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  const scoreParsed = parsePendingScoreInput(formData.get("pendingScore"));
  if (!scoreParsed.ok) {
    return { ok: false, message: scoreParsed.message };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase
      .from("blue_marble")
      .update({
        pending_score: scoreParsed.value,
        pending_move: 0,
      })
      .eq("id", idParsed.data.id);

    if (error) return { ok: false, message: error.message };

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}

/**
 * 주간 결과 일괄 반영:
 *  score += pending_score 후 position = floor(score / 50) % 24 로 자동 갱신.
 *  DB RPC(apply_all_pending_marble_moves)에서 원자적으로 처리한다.
 */
export async function applyAllPendingMoves(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase.rpc("apply_all_pending_marble_moves");
    if (error) return { ok: false, message: error.message };

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
