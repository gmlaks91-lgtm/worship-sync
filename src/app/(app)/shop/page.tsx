import { ShopItemsGrid } from "@/features/shop/components/ShopItemsGrid";
import { getShopPageData } from "@/features/shop/queries/getShopPageData";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const data = await getShopPageData();

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ahaba</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">포인트 상점</h1>
        <p className="text-sm text-muted-foreground">보유 포인트: {data.points}P</p>
      </header>

      {data.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {data.error}
        </div>
      ) : null}

      {!data.userId ? (
        <div className="rounded-lg border border-border/60 bg-muted/25 px-6 py-10 text-center text-sm text-muted-foreground">
          로그인 후 이용할 수 있습니다.
        </div>
      ) : (
        <ShopItemsGrid
          items={data.items}
          ownedItemIds={data.ownedItemIds}
          appliedItemIds={data.appliedItemIds}
          points={data.points}
        />
      )}
    </div>
  );
}
