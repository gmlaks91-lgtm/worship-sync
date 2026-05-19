"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { uploadShopImage } from "@/features/shop/lib/storage";
import { requireLeader } from "@/lib/require-leader";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };

const categorySchema = z.enum(["avatar", "frame", "badge"]);

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  category: categorySchema,
  pricePoints: z.coerce.number().int().min(0).max(100000),
  currentImageUrl: z.string().url().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

function normalizeDescription(value: string | undefined) {
  if (!value) return null;
  const t = value.trim();
  return t.length ? t : null;
}

export async function upsertShopItem(formData: FormData): Promise<ActionResult> {
  const parsed = upsertSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name")?.toString(),
    description: formData.get("description")?.toString(),
    category: formData.get("category")?.toString(),
    pricePoints: formData.get("pricePoints")?.toString(),
    currentImageUrl: formData.get("currentImageUrl")?.toString() || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." };
  }

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const fileRaw = formData.get("image");
    const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;

    let imageUrl = parsed.data.currentImageUrl ?? "";
    if (file) {
      imageUrl = await uploadShopImage(file);
    }

    if (!parsed.data.id && !imageUrl) {
      return { ok: false, message: "상품 이미지를 업로드해 주세요." };
    }

    const payload = {
      name: parsed.data.name,
      description: normalizeDescription(parsed.data.description),
      category: parsed.data.category,
      image_url: imageUrl,
      effect_value: imageUrl,
      price_points: parsed.data.pricePoints,
      is_active: true,
    };

    if (parsed.data.id) {
      const { error } = await supabase.from("shop_items").update(payload).eq("id", parsed.data.id);
      if (error) return { ok: false, message: error.message };
    } else {
      const { error } = await supabase.from("shop_items").insert(payload);
      if (error) return { ok: false, message: error.message };
    }

    revalidatePath("/admin/shop");
    revalidatePath("/shop");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}

export async function deleteShopItem(raw: { id: string }): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "잘못된 요청입니다." };

  try {
    const supabase = await createClient();
    const leader = await requireLeader(supabase);
    if (!leader.ok) return { ok: false, message: leader.message };

    const { error } = await supabase.from("shop_items").delete().eq("id", parsed.data.id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/shop");
    revalidatePath("/shop");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "알 수 없는 오류입니다." };
  }
}
