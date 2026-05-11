"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ShopItemType } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; message: string };

const purchaseSchema = z.object({ itemId: z.string().uuid() });
const applySchema = z.object({ itemId: z.string().uuid() });

function profileFieldForItemType(type: ShopItemType) {
  if (type === "badge") return "active_badge";
  if (type === "border") return "active_border_color";
  return "active_background_color";
}

export async function purchaseShopItem(raw: z.infer<typeof purchaseSchema>): Promise<ActionResult> {
  const parsed = purchaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값이 올바르지 않습니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const [{ data: profile, error: pErr }, { data: item, error: iErr }, { data: owned, error: oErr }] =
      await Promise.all([
        supabase.from("profiles").select("points").eq("id", user.id).maybeSingle(),
        supabase.from("shop_items").select("id,price_points,is_active").eq("id", parsed.data.itemId).maybeSingle(),
        supabase.from("user_inventory").select("id").eq("user_id", user.id).eq("shop_item_id", parsed.data.itemId).maybeSingle(),
      ]);

    if (pErr || !profile) return { ok: false, message: pErr?.message ?? "프로필을 찾을 수 없습니다." };
    if (iErr || !item || !item.is_active) return { ok: false, message: iErr?.message ?? "상품을 찾을 수 없습니다." };
    if (oErr) return { ok: false, message: oErr.message };
    if (owned) return { ok: false, message: "이미 구매한 상품입니다." };
    if (profile.points < item.price_points) return { ok: false, message: "포인트가 부족합니다." };

    const { error: invErr } = await supabase.from("user_inventory").insert({
      user_id: user.id,
      shop_item_id: item.id,
    });
    if (invErr) return { ok: false, message: invErr.message };

    const { error: pointErr } = await supabase.rpc("decrement_profile_points", {
      p_user_id: user.id,
      p_points: item.price_points,
    });
    if (pointErr) return { ok: false, message: pointErr.message };

    revalidatePath("/shop");
    revalidatePath("/more");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function applyShopItem(raw: z.infer<typeof applySchema>): Promise<ActionResult> {
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값이 올바르지 않습니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const [{ data: item, error: iErr }, { data: owned, error: oErr }] = await Promise.all([
      supabase.from("shop_items").select("id,item_type,value").eq("id", parsed.data.itemId).maybeSingle(),
      supabase
        .from("user_inventory")
        .select("id")
        .eq("user_id", user.id)
        .eq("shop_item_id", parsed.data.itemId)
        .maybeSingle(),
    ]);
    if (iErr || !item) return { ok: false, message: iErr?.message ?? "상품을 찾을 수 없습니다." };
    if (oErr || !owned) return { ok: false, message: oErr?.message ?? "보유하지 않은 상품입니다." };

    const { data: sameTypeItems, error: typeErr } = await supabase
      .from("shop_items")
      .select("id")
      .eq("item_type", item.item_type);
    if (typeErr) return { ok: false, message: typeErr.message };

    const ids = (sameTypeItems ?? []).map((row) => row.id);
    if (ids.length > 0) {
      const { error: resetErr } = await supabase
        .from("user_inventory")
        .update({ is_applied: false })
        .eq("user_id", user.id)
        .in("shop_item_id", ids);
      if (resetErr) return { ok: false, message: resetErr.message };
    }

    const { error: applyErr } = await supabase
      .from("user_inventory")
      .update({ is_applied: true })
      .eq("user_id", user.id)
      .eq("shop_item_id", item.id);
    if (applyErr) return { ok: false, message: applyErr.message };

    const field = profileFieldForItemType(item.item_type as ShopItemType);
    const { error: profileErr } = await supabase.from("profiles").update({ [field]: item.value }).eq("id", user.id);
    if (profileErr) return { ok: false, message: profileErr.message };

    revalidatePath("/shop");
    revalidatePath("/more");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
