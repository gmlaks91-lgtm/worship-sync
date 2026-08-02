import { redirect } from "next/navigation";

import { ShopItemsGrid } from "@/features/shop/components/ShopItemsGrid";
import { getShopPageData } from "@/features/shop/queries/getShopPageData";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/shop");
  }

  const data = await getShopPageData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2 rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-sky-50/60 via-white to-rose-50/40 p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-600/80">Ahava</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">포인트 상점</h1>
        <p className="max-w-prose text-sm leading-relaxed text-slate-600">
          모은 포인트로 아이템을 구매하고, 보관함에서 장착해 프로필을 꾸며 보세요.
        </p>
      </header>

      {data.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {data.error}
        </div>
      ) : null}

      <ShopItemsGrid
        userId={data.userId!}
        items={data.items}
        ownedItemIds={data.ownedItemIds}
        appliedItemIds={data.appliedItemIds}
        inventoryEntries={data.inventoryEntries}
        listedInventoryIds={data.listedInventoryIds}
        marketplaceListings={data.marketplaceListings}
        ownedAvatarItems={data.ownedAvatarItems}
      />
    </div>
  );
}
