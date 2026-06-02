"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Coins, ShoppingBag, Sparkles, Store, Tag } from "lucide-react";

import { usePoints } from "@/features/points/components/PointsProvider";
import { notifyPointsUpdated } from "@/features/points/lib/points-events";
import { applyShopItem, purchaseShopItem } from "@/features/shop/actions/shopActions";
import { ExpandableDescription } from "@/features/shop/components/ExpandableDescription";
import { ShopMarketplacePanel } from "@/features/shop/components/ShopMarketplacePanel";
import { ShopSellDialog } from "@/features/shop/components/ShopSellDialog";
import type {
  MarketplaceListingRow,
  ShopItemRow,
  UserInventoryEntry,
} from "@/features/shop/queries/getShopPageData";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<ShopItemRow["category"], string> = {
  avatar: "아바타",
  frame: "프레임",
  badge: "배지",
};

type ShopTab = "shop" | "inventory" | "marketplace";

type ShopItemsGridProps = {
  userId: string;
  items: ShopItemRow[];
  ownedItemIds: string[];
  appliedItemIds: string[];
  inventoryEntries: UserInventoryEntry[];
  listedInventoryIds: string[];
  marketplaceListings: MarketplaceListingRow[];
  ownedAvatarItems: ShopItemRow[];
};

function isSoldOut(item: ShopItemRow) {
  return item.stock !== null && item.stock <= 0;
}

export function ShopItemsGrid({
  userId,
  items,
  ownedItemIds,
  appliedItemIds,
  inventoryEntries,
  listedInventoryIds,
  marketplaceListings,
  ownedAvatarItems,
}: ShopItemsGridProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ShopTab>("shop");
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const { points: pointState, setPoints: setPointState } = usePoints();
  const [ownedState, setOwnedState] = useState(() => new Set(ownedItemIds));
  const [appliedState, setAppliedState] = useState(() => new Set(appliedItemIds));
  const [listedState, setListedState] = useState(() => new Set(listedInventoryIds));

  useEffect(() => {
    setListedState(new Set(listedInventoryIds));
  }, [listedInventoryIds]);

  const avatarItems = useMemo(() => ownedAvatarItems, [ownedAvatarItems]);
  const inventoryItems = useMemo(() => items.filter((item) => ownedState.has(item.id)), [items, ownedState]);

  const itemCard = (item: ShopItemRow, mode: "shop" | "inventory") => {
    const owned = ownedState.has(item.id);
    const applied = appliedState.has(item.id);
    const soldOut = isSoldOut(item);
    const listed = inventoryEntries.some(
      (entry) => entry.shopItemId === item.id && listedState.has(entry.inventoryId),
    );
    const canBuy = !soldOut && pointState >= item.price_points;

    return (
      <article
        key={`${mode}-${item.id}`}
        className="overflow-hidden rounded-[1.25rem] border border-slate-100/90 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-100/80 bg-slate-50/50">
          <RemoteImage src={item.image_url} alt={item.name} fill variant="card" className="object-cover" />
          {soldOut && mode === "shop" ? (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
              <span className="rounded-full border border-white/30 bg-slate-900/80 px-4 py-2 text-sm font-semibold tracking-wide text-white">
                Sold Out
              </span>
            </span>
          ) : null}
          {soldOut && mode === "shop" ? (
            <span className="absolute left-3 top-3 rounded-full border border-rose-200 bg-rose-50/95 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
              품절
            </span>
          ) : null}
          {item.stock !== null && item.stock > 0 && mode === "shop" ? (
            <span className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              재고 {item.stock}
            </span>
          ) : null}
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-slate-800">{item.name}</h3>
            <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50/80 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              {CATEGORY_LABEL[item.category]}
            </span>
          </div>

          <ExpandableDescription
            text={item.description ?? "아이템 설명이 없습니다."}
            collapsedClassName="min-h-[2.5rem]"
          />

          <p className="text-sm font-semibold text-slate-700">{item.price_points}P</p>

          <div className="flex flex-col gap-2 pt-1">
            {mode === "shop" && !owned ? (
              <>
                <Button
                  type="button"
                  className="min-h-11 h-11 w-full bg-sky-500 text-white shadow-sm hover:bg-sky-600 disabled:opacity-50"
                  disabled={pending || soldOut || !canBuy}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await purchaseShopItem({ itemId: item.id });
                      if (!res.ok) return toastError(res.message);
                      setOwnedState((prev) => new Set(prev).add(item.id));
                      setPointState(res.points);
                      notifyPointsUpdated(res.points);
                      setActiveTab("inventory");
                      toastSuccess("구매 완료! 보관함에서 바로 장착해 보세요.");
                      router.refresh();
                    })
                  }
                >
                  {soldOut ? "품절" : "구매하기"}
                </Button>
                {soldOut ? (
                  <span className="text-center text-xs text-rose-500/90 sm:text-left">재고가 소진되었습니다.</span>
                ) : !canBuy ? (
                  <span className="text-center text-xs text-rose-500/90 sm:text-left">포인트 부족</span>
                ) : null}
              </>
            ) : owned ? (
              <>
                {listed ? (
                  <span className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-center text-xs font-medium text-violet-700">
                    중고 장터 등록 중
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant={applied ? "secondary" : "outline"}
                  className={cn(
                    "min-h-11 h-11 w-full",
                    !applied && "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/60",
                  )}
                  disabled={pending || applied || listed}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await applyShopItem({ itemId: item.id });
                      if (!res.ok) return toastError(res.message);
                      setAppliedState((prev) => {
                        const next = new Set(prev);
                        for (const each of items) {
                          if (each.category === item.category) next.delete(each.id);
                        }
                        next.add(item.id);
                        return next;
                      });
                      toastSuccess("장착 완료! 프로필에 즉시 반영됩니다.");
                      router.refresh();
                    })
                  }
                >
                  {applied ? "장착 중" : listed ? "장터 등록 중" : "장착하기"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/90 bg-gradient-to-br from-sky-50 via-white to-rose-50/70 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Coins className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-sky-600/90">내 포인트</p>
            <p className="text-2xl font-bold tabular-nums text-slate-800">
              {pointState}
              <span className="ml-1 text-base font-semibold text-sky-600">P</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500">포인트로 상품을 구매하고, 팀원과 아바타를 거래해 보세요.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ShopTab)} className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-slate-100/80 bg-white p-1 shadow-sm">
          <TabsTrigger
            value="shop"
            className="min-h-11 gap-1.5 rounded-xl px-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-sky-50 data-[state=active]:text-sky-800"
          >
            <ShoppingBag className="size-4 shrink-0" />
            상점
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="min-h-11 gap-1.5 rounded-xl px-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-sky-50 data-[state=active]:text-sky-800"
          >
            <Box className="size-4 shrink-0" />
            보관함
          </TabsTrigger>
          <TabsTrigger
            value="marketplace"
            className="min-h-11 gap-1.5 rounded-xl px-2 py-2.5 text-xs sm:text-sm data-[state=active]:bg-violet-50 data-[state=active]:text-violet-800"
          >
            <Store className="size-4 shrink-0" />
            중고 장터
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="mt-0">
          {items.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200/90 bg-white px-6 py-14 text-center shadow-sm">
              <Sparkles className="mx-auto mb-2 size-5 text-sky-400/80" />
              <p className="text-sm text-slate-500">등록된 상품이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => itemCard(item, "shop"))}</div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-0 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">보유 아바타는 중고 장터에 등록해 팀원에게 판매할 수 있습니다.</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 h-11 w-full gap-1.5 sm:w-auto"
              onClick={() => setSellDialogOpen(true)}
            >
              <Tag className="size-4" aria-hidden />
              아바타 판매 등록
            </Button>
          </div>

          {inventoryItems.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200/90 bg-white px-6 py-14 text-center shadow-sm">
              <Sparkles className="mx-auto mb-2 size-5 text-sky-400/80" />
              <p className="text-sm text-slate-500">아직 구매한 아이템이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {inventoryItems.map((item) => itemCard(item, "inventory"))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="mt-0">
          <ShopMarketplacePanel listings={marketplaceListings} currentUserId={userId} />
        </TabsContent>
      </Tabs>

      <ShopSellDialog
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        avatarItems={avatarItems}
        inventoryEntries={inventoryEntries}
        listedInventoryIds={[...listedState]}
        onListed={() => {
          router.refresh();
          setActiveTab("marketplace");
        }}
      />
    </section>
  );
}
