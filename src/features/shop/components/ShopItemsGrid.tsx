"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Coins, ShoppingBag, Sparkles } from "lucide-react";

import { usePoints } from "@/features/points/components/PointsProvider";
import { notifyPointsUpdated } from "@/features/points/lib/points-events";
import { applyShopItem, purchaseShopItem } from "@/features/shop/actions/shopActions";
import type { ShopItemRow } from "@/features/shop/queries/getShopPageData";
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

export function ShopItemsGrid({
  items,
  ownedItemIds,
  appliedItemIds,
}: {
  items: ShopItemRow[];
  ownedItemIds: string[];
  appliedItemIds: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"shop" | "inventory">("shop");
  const { points: pointState, setPoints: setPointState } = usePoints();
  const [ownedState, setOwnedState] = useState(() => new Set(ownedItemIds));
  const [appliedState, setAppliedState] = useState(() => new Set(appliedItemIds));

  const inventoryItems = useMemo(() => items.filter((item) => ownedState.has(item.id)), [items, ownedState]);

  const itemCard = (item: ShopItemRow) => {
    const owned = ownedState.has(item.id);
    const applied = appliedState.has(item.id);
    const canBuy = pointState >= item.price_points;

    return (
      <article
        key={item.id}
        className="overflow-hidden rounded-[1.25rem] border border-slate-100/90 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-100/80 bg-slate-50/50">
          <RemoteImage src={item.image_url} alt={item.name} fill variant="card" className="object-cover" />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold tracking-tight text-slate-800">{item.name}</h3>
            <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50/80 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              {CATEGORY_LABEL[item.category]}
            </span>
          </div>
          <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-500">
            {item.description ?? "아이템 설명이 없습니다."}
          </p>
          <p className="text-sm font-semibold text-slate-700">{item.price_points}P</p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            {!owned ? (
              <Button
                type="button"
                className="w-full bg-sky-500 text-white shadow-sm hover:bg-sky-600 disabled:opacity-50"
                disabled={pending || !canBuy}
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
                구매하기
              </Button>
            ) : (
              <Button
                type="button"
                variant={applied ? "secondary" : "outline"}
                className={cn(
                  "w-full",
                  !applied && "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/60",
                )}
                disabled={pending || applied}
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
                {applied ? "장착 중" : "장착하기"}
              </Button>
            )}
            {!canBuy && !owned ? (
              <span className="text-center text-xs text-rose-500/90 sm:text-right">포인트 부족</span>
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
        <p className="text-sm text-slate-500">포인트로 상품을 구매하고 프로필을 꾸며 보세요.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "shop" | "inventory")} className="gap-4">
        <TabsList className="w-full justify-start rounded-2xl border border-slate-100/80 bg-white p-1 shadow-sm">
          <TabsTrigger
            value="shop"
            className="gap-1.5 rounded-xl data-[state=active]:bg-sky-50 data-[state=active]:text-sky-800"
          >
            <ShoppingBag className="size-4" />
            상점
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="gap-1.5 rounded-xl data-[state=active]:bg-sky-50 data-[state=active]:text-sky-800"
          >
            <Box className="size-4" />
            내 보관함
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="mt-0">
          {items.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200/90 bg-white px-6 py-14 text-center shadow-sm">
              <Sparkles className="mx-auto mb-2 size-5 text-sky-400/80" />
              <p className="text-sm text-slate-500">등록된 상품이 없습니다. 관리자 페이지에서 상품을 추가해 주세요.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(itemCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-0">
          {inventoryItems.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200/90 bg-white px-6 py-14 text-center shadow-sm">
              <Sparkles className="mx-auto mb-2 size-5 text-sky-400/80" />
              <p className="text-sm text-slate-500">아직 구매한 아이템이 없습니다. 상점에서 먼저 구매해 주세요.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{inventoryItems.map(itemCard)}</div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
