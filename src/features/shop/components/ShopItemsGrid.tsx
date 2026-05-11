"use client";

import { useTransition } from "react";

import { applyShopItem, purchaseShopItem } from "@/features/shop/actions/shopActions";
import type { ShopItemRow } from "@/features/shop/queries/getShopPageData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";

export function ShopItemsGrid({
  items,
  ownedItemIds,
  appliedItemIds,
  points,
}: {
  items: ShopItemRow[];
  ownedItemIds: Set<string>;
  appliedItemIds: Set<string>;
  points: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const owned = ownedItemIds.has(item.id);
        const applied = appliedItemIds.has(item.id);
        const canBuy = points >= item.price_points;
        return (
          <Card key={item.id} className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{item.name}</CardTitle>
              <CardDescription>{item.description ?? "아이템 설명이 없습니다."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.item_type} · {item.price_points}P</p>
              <div className="flex gap-2">
                {!owned ? (
                  <Button
                    type="button"
                    disabled={pending || !canBuy}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await purchaseShopItem({ itemId: item.id });
                        if (!res.ok) return toastError(res.message);
                        toastSuccess("구매 완료");
                      })
                    }
                  >
                    구매
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
                        toastSuccess("적용 완료");
                      })
                    }
                  >
                    {applied ? "적용중" : "적용"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
