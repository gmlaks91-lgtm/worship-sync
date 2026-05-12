import { redirect } from "next/navigation";

import { AdminShopManager } from "@/features/shop/components/AdminShopManager";
import type { ShopItemRow } from "@/features/shop/queries/getShopPageData";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/shop");
  }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const canManage = me?.role === "leader" || me?.role === "admin";
  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        접근 권한이 없습니다. 리더/관리자만 접근할 수 있습니다.
      </div>
    );
  }

  const { data: items, error } = await supabase
    .from("shop_items")
    .select("id,name,description,category,image_url,effect_value,price_points,is_active")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">상점 상품 관리</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          상품 이미지 업로드, 가격 설정, 카테고리 분류를 이 페이지에서 관리합니다.
        </p>
      </header>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          상품 목록을 불러오지 못했습니다: {error.message}
        </div>
      ) : (
        <AdminShopManager items={(items ?? []) as ShopItemRow[]} />
      )}
    </div>
  );
}
