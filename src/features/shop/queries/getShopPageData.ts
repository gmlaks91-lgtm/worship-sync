import "server-only";

import type { ShopItemType } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type ShopItemRow = {
  id: string;
  name: string;
  description: string | null;
  item_type: ShopItemType;
  value: string;
  price_points: number;
  is_active: boolean;
};

export type ShopPageData = {
  userId: string | null;
  points: number;
  items: ShopItemRow[];
  ownedItemIds: Set<string>;
  appliedItemIds: Set<string>;
  error: string | null;
};

export async function getShopPageData(): Promise<ShopPageData> {
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
        ownedItemIds: new Set(),
        appliedItemIds: new Set(),
        error: null,
      };
    }

    const [profileRes, itemsRes, invRes] = await Promise.all([
      supabase.from("profiles").select("points").eq("id", user.id).maybeSingle(),
      supabase.from("shop_items").select("id,name,description,item_type,value,price_points,is_active").eq("is_active", true).order("price_points"),
      supabase.from("user_inventory").select("shop_item_id,is_applied").eq("user_id", user.id),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    if (invRes.error) throw new Error(invRes.error.message);

    const owned = new Set((invRes.data ?? []).map((i) => i.shop_item_id));
    const applied = new Set((invRes.data ?? []).filter((i) => i.is_applied).map((i) => i.shop_item_id));

    return {
      userId: user.id,
      points: profileRes.data?.points ?? 0,
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
      ownedItemIds: new Set(),
      appliedItemIds: new Set(),
      error: message,
    };
  }
}
