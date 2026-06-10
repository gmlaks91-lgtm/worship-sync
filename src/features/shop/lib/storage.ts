import "server-only";

import { createClient } from "@/utils/supabase/server";

export const SHOP_IMAGES_BUCKET = "shop_images";

export async function uploadShopImage(file: File): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `shop/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(SHOP_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type || "image/webp",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(SHOP_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
