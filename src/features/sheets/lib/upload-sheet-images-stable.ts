"use client";

import { registerSheet } from "@/features/sheets/actions/sheetActions";
import { extensionFromFile } from "@/features/sheets/lib/file-kind";
import { createClient } from "@/utils/supabase/client";

const BUCKET = "sheets";
const MAX_FILES = 20;

/**
 * 악보 이미지를 **파일 배열 순서 그대로** Storage에 올린 뒤, 한 번의 `registerSheet`로 DB에 반영합니다.
 * 중간 실패 시 이미 올라간 객체는 best-effort로 삭제합니다.
 */
export async function uploadSheetFromClient(
  songId: string,
  filesInput: File[] | FileList,
  memo?: string | null,
): Promise<void> {
  const files = Array.from(filesInput).slice(0, MAX_FILES);
  if (files.length === 0) {
    throw new Error("업로드할 이미지 파일을 선택해 주세요.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const batchId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const publicUrls: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = extensionFromFile(file);
      const path = `${user.id}/${songId}/${batchId}/${String(i).padStart(2, "0")}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      uploadedPaths.push(path);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      publicUrls.push(pub.publicUrl);
    }

    const result = await registerSheet({
      songId,
      imageUrls: publicUrls,
      memo: memo && memo.trim().length > 0 ? memo.trim() : undefined,
    });

    if (!result.ok) {
      throw new Error(result.message);
    }
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }
    throw err;
  }
}
