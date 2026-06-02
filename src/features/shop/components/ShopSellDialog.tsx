"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Tag } from "lucide-react";

import {
  cancelMarketplaceListing,
  createMarketplaceListing,
} from "@/features/shop/actions/marketplaceActions";
import type { ShopItemRow, UserInventoryEntry } from "@/features/shop/queries/getShopPageData";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";

type ShopSellDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarItems: ShopItemRow[];
  inventoryEntries: UserInventoryEntry[];
  listedInventoryIds: string[];
  onListed: () => void;
};

export function ShopSellDialog({
  open,
  onOpenChange,
  avatarItems,
  inventoryEntries,
  listedInventoryIds,
  onListed,
}: ShopSellDialogProps) {
  const [pending, startTransition] = useTransition();
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [pricePoints, setPricePoints] = useState("100");

  const sellableEntries = useMemo(() => {
    const listedSet = new Set(listedInventoryIds);
    const avatarIds = new Set(avatarItems.map((item) => item.id));
    return inventoryEntries.filter(
      (entry) => avatarIds.has(entry.shopItemId) && !listedSet.has(entry.inventoryId),
    );
  }, [avatarItems, inventoryEntries, listedInventoryIds]);

  const selectedItem = useMemo(() => {
    const entry = sellableEntries.find((each) => each.inventoryId === selectedInventoryId);
    if (!entry) return null;
    return avatarItems.find((item) => item.id === entry.shopItemId) ?? null;
  }, [avatarItems, sellableEntries, selectedInventoryId]);

  const onSubmit = () => {
    if (!selectedInventoryId) return toastError("판매할 아바타를 선택해 주세요.");
    const price = Number(pricePoints);
    if (!Number.isFinite(price) || price <= 0) return toastError("판매 가격은 1P 이상이어야 합니다.");

    startTransition(async () => {
      const result = await createMarketplaceListing({
        inventoryId: selectedInventoryId,
        pricePoints: price,
      });
      if (!result.ok) return toastError(result.message);
      toastSuccess(result.message);
      setSelectedInventoryId("");
      setPricePoints("100");
      onOpenChange(false);
      onListed();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>아바타 판매 등록</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            보유한 CCM 앨범 아바타를 중고 장터에 등록합니다. 등록 시 장착 중인 아바타는 자동으로
            해제됩니다.
          </DialogDescription>
        </DialogHeader>

        {sellableEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            판매 가능한 아바타가 없습니다. 이미 장터에 등록했거나 아바타를 보유하지 않았을 수
            있습니다.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">판매할 아바타</p>
              <div className="grid max-h-52 gap-2 overflow-y-auto pr-1">
                {sellableEntries.map((entry) => {
                  const item = avatarItems.find((each) => each.id === entry.shopItemId);
                  if (!item) return null;
                  const selected = selectedInventoryId === entry.inventoryId;
                  return (
                    <button
                      key={entry.inventoryId}
                      type="button"
                      disabled={pending}
                      onClick={() => setSelectedInventoryId(entry.inventoryId)}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        selected
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-100 bg-white hover:border-sky-100",
                      )}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <RemoteImage src={item.image_url} alt={item.name} fill variant="thumb" className="object-cover" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{item.name}</span>
                        {entry.isApplied ? (
                          <span className="text-xs text-amber-600">장착 중 → 등록 시 해제</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">판매 가격 (포인트)</span>
              <Input
                type="number"
                min={1}
                value={pricePoints}
                disabled={pending}
                className="h-11"
                onChange={(event) => setPricePoints(event.target.value)}
              />
            </label>

            {selectedItem ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-xs text-sky-800">
                <Tag className="mr-1 inline size-3.5" aria-hidden />
                {selectedItem.name} · {pricePoints || 0}P에 등록됩니다.
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="border-t-0 bg-transparent p-0 sm:flex-col">
          <Button
            type="button"
            className="min-h-11 h-11 w-full"
            disabled={pending || sellableEntries.length === 0}
            onClick={onSubmit}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            장터에 등록
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 h-11 w-full"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
