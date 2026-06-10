"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { unequipShopCategory } from "@/features/shop/actions/shopActions";
import type { MyProfileRow } from "@/features/profile/queries/getMyProfile";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";

type ProfileEquipControlsProps = {
  profile: Pick<MyProfileRow, "avatar_url" | "active_badge" | "active_border_color">;
};

export function ProfileEquipControls({ profile }: ProfileEquipControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const slots = [
    { category: "avatar" as const, label: "아바타", active: Boolean(profile.avatar_url) },
    { category: "frame" as const, label: "프레임", active: Boolean(profile.active_border_color) },
    { category: "badge" as const, label: "배지", active: Boolean(profile.active_badge) },
  ].filter((slot) => slot.active);

  if (slots.length === 0) return null;

  const onUnequip = (category: "avatar" | "frame" | "badge") => {
    startTransition(async () => {
      const result = await unequipShopCategory({ category });
      if (!result.ok) return toastError(result.message);
      toastSuccess(`${category === "avatar" ? "아바타" : category === "frame" ? "프레임" : "배지"} 장착이 해제되었습니다.`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {slots.map((slot) => (
        <Button
          key={slot.category}
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 h-11 w-full border-amber-200 text-amber-800 hover:bg-amber-50 sm:w-auto"
          disabled={pending}
          onClick={() => onUnequip(slot.category)}
        >
          {slot.label} 장착 해제
        </Button>
      ))}
    </div>
  );
}
