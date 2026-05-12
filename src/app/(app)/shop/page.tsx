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
        <p className="text-sm leading-relaxed text-muted-foreground">
          상점에서 아이템을 구매하고, 내 보관함에서 장착해 프로필 아바타와 프레임, 배지를 꾸며 보세요.
        </p>
      </header>

      {data.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm text-destructive">
          데이터를 불러오지 못했습니다: {data.error}
        </div>
      ) : null}

      {!data.userId ? (
        <div className="rounded-lg border border-border/60 bg-muted/25 px-6 py-4 text-center text-sm text-muted-foreground">
          로그인하면 구매/장착이 활성화됩니다. 지금은 더미 데이터로 화면만 미리 볼 수 있어요.
        </div>
      ) : null}

      <ShopItemsGrid
        items={data.items}
        ownedItemIds={data.ownedItemIds}
        appliedItemIds={data.appliedItemIds}
        points={data.points}
      />
    </div>
  );
}
