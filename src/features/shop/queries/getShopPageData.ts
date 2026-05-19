import "server-only";

import { unstable_noStore } from "next/cache";

import { getFreshUserPoints } from "@/features/points/queries/getFreshUserPoints";
import type { ShopItemType } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type ShopItemRow = {
  id: string;
  name: string;
  description: string | null;
  category: ShopItemType;
  image_url: string;
  effect_value: string;
  price_points: number;
  is_active: boolean;
};

export type ShopPageData = {
  userId: string | null;
  points: number;
  items: ShopItemRow[];
  ownedItemIds: string[];
  appliedItemIds: string[];
  error: string | null;
};

export async function getShopPageData(): Promise<ShopPageData> {
  unstable_noStore();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        userId: null,
        points: 0,
        items: [],
        ownedItemIds: [],
        appliedItemIds: [],
        error: null,
      };
    }

    const [freshPoints, itemsRes, invRes] = await Promise.all([
      getFreshUserPoints(user.id),
      supabase
        .from("shop_items")
        .select("id,name,description,category,image_url,effect_value,price_points,is_active")
        .eq("is_active", true)
        .order("price_points"),
      supabase.from("user_inventory").select("shop_item_id,is_applied").eq("user_id", user.id),
    ]);

    if (freshPoints.error) throw new Error(freshPoints.error);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    if (invRes.error) throw new Error(invRes.error.message);

    const owned = (invRes.data ?? []).map((i) => i.shop_item_id);
    const applied = (invRes.data ?? []).filter((i) => i.is_applied).map((i) => i.shop_item_id);

    return {
      userId: user.id,
      points: freshPoints.points,
      items: (itemsRes.data ?? []) as ShopItemRow[],
      ownedItemIds: owned,
      appliedItemIds: applied,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return {
      userId: null,
      points: 0,
      items: [],
      ownedItemIds: [],
      appliedItemIds: [],
      error: message,
    };
  }
}
