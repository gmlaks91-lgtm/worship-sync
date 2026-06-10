import "server-only";

import { createClient } from "@/utils/supabase/server";

export const QT_IMAGES_BUCKET = "qt_images";

export async function uploadQtImage(file: File): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(QT_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(QT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
