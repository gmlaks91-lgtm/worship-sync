import "server-only";

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

const DUMMY_SHOP_ITEMS: ShopItemRow[] = [
  {
    id: "11111111-1111-1111-1111-111111111001",
    name: "다윗의 기타",
    description: "찬양 시작 전에 마음을 가다듬게 해 주는 따뜻한 프로필 아바타",
    category: "avatar",
    image_url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
    effect_value: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
    price_points: 180,
    is_active: true,
  },
  {
    id: "11111111-1111-1111-1111-111111111002",
    name: "에스더의 왕관",
    description: "리더십이 필요한 날, 담대함을 상징하는 골드 프레임",
    category: "frame",
    image_url: "https://images.unsplash.com/photo-1601390395693-364c2b93c8ec?auto=format&fit=crop&w=1200&q=80",
    effect_value: "#d4a017",
    price_points: 220,
    is_active: true,
  },
  {
    id: "11111111-1111-1111-1111-111111111003",
    name: "가시면류관 테두리",
    description: "겸손과 헌신을 기억하게 하는 은은한 브론즈 프레임",
    category: "frame",
    image_url: "https://images.unsplash.com/photo-1457694587812-e8bf29a43845?auto=format&fit=crop&w=1200&q=80",
    effect_value: "#8b5a2b",
    price_points: 170,
    is_active: true,
  },
  {
    id: "11111111-1111-1111-1111-111111111004",
    name: "찬양의 불꽃 배지",
    description: "예배 전 열정을 살려 주는 반짝이는 팀 배지",
    category: "badge",
    image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
    effect_value: "🔥",
    price_points: 140,
    is_active: true,
  },
  {
    id: "11111111-1111-1111-1111-111111111005",
    name: "시편 묵상 배지",
    description: "조용한 연습 시간에 어울리는 차분한 블루 포인트",
    category: "badge",
    image_url: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
    effect_value: "📜",
    price_points: 110,
    is_active: true,
  },
];

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
        items: DUMMY_SHOP_ITEMS,
        ownedItemIds: [],
        appliedItemIds: [],
        error: null,
      };
    }

    const [profileRes, itemsRes, invRes] = await Promise.all([
      supabase.from("profiles").select("points").eq("id", user.id).maybeSingle(),
      supabase
        .from("shop_items")
        .select("id,name,description,category,image_url,effect_value,price_points,is_active")
        .eq("is_active", true)
        .order("price_points"),
      supabase.from("user_inventory").select("shop_item_id,is_applied").eq("user_id", user.id),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (itemsRes.error) throw new Error(itemsRes.error.message);
    if (invRes.error) throw new Error(invRes.error.message);

    const owned = (invRes.data ?? []).map((i) => i.shop_item_id);
    const applied = (invRes.data ?? []).filter((i) => i.is_applied).map((i) => i.shop_item_id);

    return {
      userId: user.id,
      points: profileRes.data?.points ?? 0,
      items: ((itemsRes.data ?? []) as ShopItemRow[]).length > 0 ? ((itemsRes.data ?? []) as ShopItemRow[]) : DUMMY_SHOP_ITEMS,
      ownedItemIds: owned,
      appliedItemIds: applied,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return {
      userId: null,
      points: 0,
      items: DUMMY_SHOP_ITEMS,
      ownedItemIds: [],
      appliedItemIds: [],
      error: message,
    };
  }
}
