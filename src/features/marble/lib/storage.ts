import "server-only";

import { createClient } from "@/utils/supabase/server";

export const MARBLE_FACES_BUCKET = "marble_faces";

/**
 * 목자 얼굴 이미지를 marble_faces 버킷에 업로드하고 public URL을 반환한다.
 * Storage RLS(is_leader + name like 'marble/%')에 의해 리더/관리자만 업로드 가능.
 */
export async function uploadMarbleFace(file: File): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `marble/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(MARBLE_FACES_BUCKET).upload(path, buffer, {
    contentType: file.type || "image/webp",
    upsert: false,
  });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  const { data } = supabase.storage.from(MARBLE_FACES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
