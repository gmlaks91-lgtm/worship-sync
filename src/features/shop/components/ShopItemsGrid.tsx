"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, ShoppingBag, Sparkles } from "lucide-react";

import { applyShopItem, purchaseShopItem } from "@/features/shop/actions/shopActions";
import type { ShopItemRow } from "@/features/shop/queries/getShopPageData";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  points,
}: {
  items: ShopItemRow[];
  ownedItemIds: string[];
  appliedItemIds: string[];
  points: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"shop" | "inventory">("shop");
  const [pointState, setPointState] = useState(points);
  const [ownedState, setOwnedState] = useState(() => new Set(ownedItemIds));
  const [appliedState, setAppliedState] = useState(() => new Set(appliedItemIds));

  const inventoryItems = useMemo(() => items.filter((item) => ownedState.has(item.id)), [items, ownedState]);

  const itemCard = (item: ShopItemRow) => {
    const owned = ownedState.has(item.id);
    const applied = appliedState.has(item.id);
    const canBuy = pointState >= item.price_points;

    return (
      <Card key={item.id} className="overflow-hidden border-border/70 bg-card">
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/60 bg-muted/20">
          <RemoteImage
            src={item.image_url}
            alt={item.name}
            fill
            variant="card"
            className="object-cover"
          />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base tracking-tight">{item.name}</CardTitle>
            <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              {CATEGORY_LABEL[item.category]}
            </span>
          </div>
          <CardDescription className="leading-relaxed">{item.description ?? "아이템 설명이 없습니다."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-foreground">{item.price_points}P</p>
          <div className="flex items-center gap-2">
            {!owned ? (
              <Button
                type="button"
                disabled={pending || !canBuy}
                onClick={() =>
                  startTransition(async () => {
                    const res = await purchaseShopItem({ itemId: item.id });
                    if (!res.ok) return toastError(res.message);
                    setOwnedState((prev) => new Set(prev).add(item.id));
                    setPointState((prev) => Math.max(prev - item.price_points, 0));
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
            {!canBuy && !owned ? <span className="text-xs text-muted-foreground">포인트 부족</span> : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">보유 포인트</span> · {pointState}P
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "shop" | "inventory")} className="gap-4">
        <TabsList className="w-full justify-start bg-muted/60 p-1">
          <TabsTrigger value="shop" className="gap-1.5">
            <ShoppingBag className="size-4" />
            상점
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5">
            <Box className="size-4" />
            내 보관함
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="mt-0">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
              <Sparkles className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">등록된 상품이 없습니다. 관리자 페이지에서 상품을 추가해 주세요.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(itemCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="mt-0">
          {inventoryItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
              <Sparkles className="mx-auto mb-2 size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">아직 구매한 아이템이 없습니다. 상점에서 먼저 구매해 주세요.</p>
            </div>
          ) : (
            <div className={cn("grid gap-5 sm:grid-cols-2 xl:grid-cols-3")}>{inventoryItems.map(itemCard)}</div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
