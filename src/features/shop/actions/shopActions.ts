"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { revalidatePointsRoutes } from "@/features/points/lib/revalidate-points";
import type { ShopItemType } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

type PurchaseResult = { ok: true; points: number } | { ok: false; message: string };
type ActionResult = { ok: true } | { ok: false; message: string };

const purchaseSchema = z.object({ itemId: z.string().uuid() });
const applySchema = z.object({ itemId: z.string().uuid() });
const categorySchema = z.enum(["avatar", "frame", "badge"]);

function profileFieldForItemType(
  type: ShopItemType,
): "active_badge" | "active_border_color" | "avatar_url" {
  if (type === "badge") return "active_badge";
  if (type === "frame") return "active_border_color";
  return "avatar_url";
}

function profileClearUpdate(field: "active_badge" | "active_border_color" | "avatar_url") {
  if (field === "active_badge") return { active_badge: null as string | null };
  if (field === "active_border_color") return { active_border_color: null as string | null };
  return { avatar_url: null as string | null };
}

function profileEquipUpdate(
  field: "active_badge" | "active_border_color" | "avatar_url",
  value: string,
) {
  if (field === "active_badge") return { active_badge: value };
  if (field === "active_border_color") return { active_border_color: value };
  return { avatar_url: value };
}

export async function purchaseShopItem(raw: z.infer<typeof purchaseSchema>): Promise<PurchaseResult> {
  const parsed = purchaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값이 올바르지 않습니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: purchaseResult, error: purchaseErr } = await supabase.rpc("purchase_shop_item", {
      p_item_id: parsed.data.itemId,
    });
    if (purchaseErr) return { ok: false, message: purchaseErr.message };

    const result = purchaseResult as { ok?: boolean; message?: string } | null;
    if (!result?.ok) {
      return { ok: false, message: result?.message ?? "구매에 실패했습니다." };
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return { ok: false, message: profileErr.message };
    }

    revalidatePointsRoutes();
    revalidatePath("/shop");

    return { ok: true, points: profile?.points ?? 0 };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

const unequipCategorySchema = z.object({ category: categorySchema });

export async function unequipShopCategory(raw: z.infer<typeof unequipCategorySchema>): Promise<ActionResult> {
  const parsed = unequipCategorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값이 올바르지 않습니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: categoryItems, error: catErr } = await supabase
      .from("shop_items")
      .select("id")
      .eq("category", parsed.data.category);
    if (catErr) return { ok: false, message: catErr.message };

    const ids = (categoryItems ?? []).map((row) => row.id);
    if (ids.length === 0) return { ok: false, message: "해당 카테고리 상품이 없습니다." };

    const { data: appliedRows, error: appliedErr } = await supabase
      .from("user_inventory")
      .select("shop_item_id")
      .eq("user_id", user.id)
      .eq("is_applied", true)
      .in("shop_item_id", ids);
    if (appliedErr) return { ok: false, message: appliedErr.message };
    if (!appliedRows?.length) return { ok: false, message: "장착 중인 아이템이 없습니다." };

    const { error: invErr } = await supabase
      .from("user_inventory")
      .update({ is_applied: false })
      .eq("user_id", user.id)
      .in("shop_item_id", ids);
    if (invErr) return { ok: false, message: invErr.message };

    const field = profileFieldForItemType(parsed.data.category);
    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profileClearUpdate(field))
      .eq("id", user.id);
    if (profileErr) return { ok: false, message: profileErr.message };

    revalidatePath("/shop");
    revalidatePath("/more");
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}

export async function unequipShopItem(raw: z.infer<typeof applySchema>): Promise<ActionResult> {
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "입력값이 올바르지 않습니다." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "로그인이 필요합니다." };

    const { data: item, error: iErr } = await supabase
      .from("shop_items")
      .select("id,category")
      .eq("id", parsed.data.itemId)
      .maybeSingle();
    if (iErr || !item) return { ok: false, message: iErr?.message ?? "상품을 찾을 수 없습니다." };

    const { data: owned, error: oErr } = await supabase
      .from("user_inventory")
      .select("id,is_applied")
      .eq("user_id", user.id)
      .eq("shop_item_id", item.id)
      .maybeSingle();
    if (oErr || !owned) return { ok: false, message: oErr?.message ?? "보유하지 않은 상품입니다." };
    if (!owned.is_applied) return { ok: false, message: "장착 중인 아이템이 아닙니다." };

    const { error: invErr } = await supabase
      .from("user_inventory")
      .update({ is_applied: false })
      .eq("user_id", user.id)
      .eq("shop_item_id", item.id);
    if (invErr) return { ok: false, message: invErr.message };

    const field = profileFieldForItemType(item.category as ShopItemType);
    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profileClearUpdate(field))
      .eq("id", user.id);
    if (profileErr) return { ok: false, message: profileErr.message };

    revalidatePath("/shop");
    revalidatePath("/more");
    revalidatePath("/profile");
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
      supabase.from("shop_items").select("id,category,effect_value").eq("id", parsed.data.itemId).maybeSingle(),
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
      .eq("category", item.category);
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

    const field = profileFieldForItemType(item.category as ShopItemType);
    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profileEquipUpdate(field, item.effect_value ?? ""))
      .eq("id", user.id);
    if (profileErr) return { ok: false, message: profileErr.message };

    revalidatePath("/shop");
    revalidatePath("/more");
    revalidatePath("/profile");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message };
  }
}
