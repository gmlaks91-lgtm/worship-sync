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
  stock: number | null;
};

export type UserInventoryEntry = {
  inventoryId: string;
  shopItemId: string;
  isApplied: boolean;
};

export type MarketplaceListingRow = {
  id: string;
  pricePoints: number;
  createdAt: string;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl: string | null;
  item: ShopItemRow;
};

export type ShopPageData = {
  userId: string | null;
  points: number;
  items: ShopItemRow[];
  ownedItemIds: string[];
  appliedItemIds: string[];
  inventoryEntries: UserInventoryEntry[];
  listedInventoryIds: string[];
  marketplaceListings: MarketplaceListingRow[];
  myActiveListingIds: string[];
  ownedAvatarItems: ShopItemRow[];
  error: string | null;
};

export async function getShopPageData(): Promise<ShopPageData> {
  unstable_noStore();

  const empty: ShopPageData = {
    userId: null,
    points: 0,
    items: [],
    ownedItemIds: [],
    appliedItemIds: [],
    inventoryEntries: [],
    listedInventoryIds: [],
    marketplaceListings: [],
    myActiveListingIds: [],
    ownedAvatarItems: [],
    error: null,
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const [freshPoints, invRes] = await Promise.all([
      getFreshUserPoints(user.id),
      supabase.from("user_inventory").select("id,shop_item_id,is_applied").eq("user_id", user.id),
    ]);

    if (freshPoints.error) throw new Error(freshPoints.error);
    if (invRes.error) throw new Error(invRes.error.message);

    let itemsRes = await supabase
      .from("shop_items")
      .select("id,name,description,category,image_url,effect_value,price_points,is_active,stock")
      .eq("is_active", true)
      .order("price_points");

    if (itemsRes.error && itemsRes.error.message.toLowerCase().includes("stock")) {
      const fallback = await supabase
        .from("shop_items")
        .select("id,name,description,category,image_url,effect_value,price_points,is_active")
        .eq("is_active", true)
        .order("price_points");
      if (fallback.error) throw new Error(fallback.error.message);
      itemsRes = {
        ...fallback,
        data: (fallback.data ?? []).map((row) => ({ ...row, stock: null })),
      };
    } else if (itemsRes.error) {
      throw new Error(itemsRes.error.message);
    }

    let listingsRes: {
      data: Array<{
        id: string;
        price_points: number;
        created_at: string;
        seller_id: string;
        shop_item_id: string;
        inventory_id: string;
        seller: { id: string; username: string; avatar_url: string | null } | null;
      }> | null;
      error: { message: string } | null;
    } = { data: [], error: null };

    const listingsQuery = await supabase
      .from("inventory_marketplace_listings")
      .select(
        "id,price_points,created_at,seller_id,shop_item_id,inventory_id,seller:profiles!seller_id(id,username,avatar_url)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (listingsQuery.error) {
      const msg = listingsQuery.error.message.toLowerCase();
      const migrationMissing =
        msg.includes("inventory_marketplace_listings") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");
      if (!migrationMissing) throw new Error(listingsQuery.error.message);
    } else {
      listingsRes = listingsQuery as typeof listingsRes;
    }

    const items = (itemsRes.data ?? []) as ShopItemRow[];
    const listingItemIds = [
      ...new Set((listingsRes.data ?? []).map((row) => row.shop_item_id as string)),
    ];

    let listingItems: ShopItemRow[] = [];
    if (listingItemIds.length > 0) {
      const listingItemsRes = await supabase
        .from("shop_items")
        .select("id,name,description,category,image_url,effect_value,price_points,is_active,stock")
        .in("id", listingItemIds);
      if (listingItemsRes.error) throw new Error(listingItemsRes.error.message);
      listingItems = (listingItemsRes.data ?? []) as ShopItemRow[];
    }

    const itemsById = new Map<string, ShopItemRow>();
    for (const item of [...items, ...listingItems]) {
      itemsById.set(item.id, item);
    }

    const inventoryEntries: UserInventoryEntry[] = (invRes.data ?? []).map((row) => ({
      inventoryId: row.id,
      shopItemId: row.shop_item_id,
      isApplied: row.is_applied,
    }));

    const owned = inventoryEntries.map((entry) => entry.shopItemId);
    const applied = inventoryEntries.filter((entry) => entry.isApplied).map((entry) => entry.shopItemId);

    const missingOwnedIds = owned.filter((id) => !itemsById.has(id));
    if (missingOwnedIds.length > 0) {
      const ownedItemsRes = await supabase
        .from("shop_items")
        .select("id,name,description,category,image_url,effect_value,price_points,is_active,stock")
        .in("id", missingOwnedIds);
      if (ownedItemsRes.error) throw new Error(ownedItemsRes.error.message);
      for (const item of (ownedItemsRes.data ?? []) as ShopItemRow[]) {
        itemsById.set(item.id, item);
      }
    }

    const ownedAvatarItems = inventoryEntries
      .map((entry) => itemsById.get(entry.shopItemId))
      .filter((item): item is ShopItemRow => Boolean(item && item.category === "avatar"));
    const listedInventoryIds = (listingsRes.data ?? []).map((row) => row.inventory_id as string);
    const myActiveListingIds = (listingsRes.data ?? [])
      .filter((row) => row.seller_id === user.id)
      .map((row) => row.id as string);

    const marketplaceListings: MarketplaceListingRow[] = (listingsRes.data ?? [])
      .map((row) => {
        const item = itemsById.get(row.shop_item_id as string);
        if (!item) return null;
        const seller = row.seller as { id: string; username: string; avatar_url: string | null } | null;
        return {
          id: row.id as string,
          pricePoints: row.price_points as number,
          createdAt: row.created_at as string,
          sellerId: row.seller_id as string,
          sellerName: seller?.username ?? "팀원",
          sellerAvatarUrl: seller?.avatar_url ?? null,
          item,
        };
      })
      .filter((row): row is MarketplaceListingRow => row !== null);

    return {
      userId: user.id,
      points: freshPoints.points,
      items,
      ownedItemIds: owned,
      appliedItemIds: applied,
      inventoryEntries,
      listedInventoryIds,
      marketplaceListings,
      myActiveListingIds,
      ownedAvatarItems,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return { ...empty, error: message };
  }
}
