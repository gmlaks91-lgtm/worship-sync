"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Store } from "lucide-react";

import { usePoints } from "@/features/points/components/PointsProvider";
import { notifyPointsUpdated } from "@/features/points/lib/points-events";
import {
  cancelMarketplaceListing,
  purchaseMarketplaceListing,
} from "@/features/shop/actions/marketplaceActions";
import { ExpandableDescription } from "@/features/shop/components/ExpandableDescription";
import type { MarketplaceListingRow } from "@/features/shop/queries/getShopPageData";
import { LayeredProfileAvatar } from "@/components/profile/layered-profile-avatar";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type ShopMarketplacePanelProps = {
  listings: MarketplaceListingRow[];
  currentUserId: string;
};

export function ShopMarketplacePanel({
  listings,
  currentUserId,
}: ShopMarketplacePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { points: pointState, setPoints: setPointState } = usePoints();
  const [listingsState, setListingsState] = useState(listings);

  useEffect(() => {
    setListingsState(listings);
  }, [listings]);

  const onPurchase = (listingId: string) => {
    startTransition(async () => {
      const result = await purchaseMarketplaceListing({ listingId });
      if (!result.ok) return toastError(result.message);
      if (typeof result.points === "number") {
        setPointState(result.points);
        notifyPointsUpdated(result.points);
      }
      setListingsState((current) => current.filter((row) => row.id !== listingId));
      toastSuccess(result.message);
      router.refresh();
    });
  };

  const onCancel = (listingId: string) => {
    if (!window.confirm("장터 등록을 취소할까요?")) return;
    startTransition(async () => {
      const result = await cancelMarketplaceListing({ listingId });
      if (!result.ok) return toastError(result.message);
      setListingsState((current) => current.filter((row) => row.id !== listingId));
      toastSuccess(result.message);
      router.refresh();
    });
  };

  if (listingsState.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-slate-200/90 bg-white px-6 py-14 text-center shadow-sm">
        <Store className="mx-auto mb-2 size-5 text-sky-400/80" aria-hidden />
        <p className="text-sm text-slate-500">등록된 중고 아바타가 없습니다.</p>
        <p className="mt-1 text-xs text-slate-400">보관함에서 아바타를 장터에 등록해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {listingsState.map((listing) => {
        const isMine = listing.sellerId === currentUserId;
        const canBuy = !isMine && pointState >= listing.pricePoints;

        return (
          <article
            key={listing.id}
            className="overflow-hidden rounded-[1.25rem] border border-slate-100/90 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-100/80 bg-slate-50/50">
              <RemoteImage
                src={listing.item.image_url}
                alt={listing.item.name}
                fill
                variant="card"
                className="object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full border border-violet-200 bg-violet-50/95 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                중고
              </span>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-slate-800">
                  {listing.item.name}
                </h3>
                <span className="shrink-0 text-sm font-semibold text-violet-700">{listing.pricePoints}P</span>
              </div>

              <ExpandableDescription
                text={listing.item.description ?? "설명 없음"}
                collapsedClassName="min-h-[2.5rem]"
              />

              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <LayeredProfileAvatar
                  size="sm"
                  avatarUrl={listing.sellerAvatarUrl}
                  fallbackLabel={listing.sellerName}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{listing.sellerName}</p>
                  <p className="text-xs text-slate-500">판매자</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {isMine ? (
                  <>
                    <span className="text-center text-xs font-medium text-sky-600 sm:text-left">
                      내가 등록한 상품
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 h-11 w-full"
                      disabled={pending}
                      onClick={() => onCancel(listing.id)}
                    >
                      등록 취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      className={cn(
                        "min-h-11 h-11 w-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50",
                      )}
                      disabled={pending || !canBuy}
                      onClick={() => onPurchase(listing.id)}
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      구매하기
                    </Button>
                    {!canBuy ? (
                      <span className="text-center text-xs text-rose-500/90 sm:text-left">
                        포인트 부족
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
