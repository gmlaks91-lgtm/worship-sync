"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadMarbleFace } from "@/features/marble/lib/storage";
import { MARBLE_BOARD_SIZE } from "@/features/marble/types";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

const updateSchema = z.object({
  id: z.string().uuid({ message: "잘못된 목장 식별자입니다." }),
  score: z.coerce.number().int("점수는 정수여야 합니다.").min(0, "점수는 0 이상이어야 합니다.").max(1_000_000),
  position: z.coerce
    .number()
    .int("칸 수는 정수여야 합니다.")
    .min(0, "칸 수는 0 이상이어야 합니다.")
    .max(MARBLE_BOARD_SIZE - 1, `칸 수는 0 ~ ${MARBLE_BOARD_SIZE - 1} 사이여야 합니다.`),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function revalidateMarble() {
  revalidatePath("/admin/marble");
  revalidatePath("/marble");
}

/** 목장 점수·위치(칸 수) 업데이트 */
export async function updateMarbleTeam(formData: FormData): Promise<ActionResult> {
  const parsed = updateSchema.safeParse({
    id: formData.get("id")?.toString(),
    score: formData.get("score")?.toString(),
    position: formData.get("position")?.toString(),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase
      .from("blue_marble")
      .update({ score: parsed.data.score, position: parsed.data.position })
      .eq("id", parsed.data.id);

    if (error) return { ok: false, message: error.message };

    revalidateMarble();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
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
