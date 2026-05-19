"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

import { usePoints } from "@/features/points/components/PointsProvider";
import { cn } from "@/lib/utils";

export function HeaderPointsBadge({ className }: { className?: string }) {
  const { points, isLoggedIn } = usePoints();

  if (!isLoggedIn) return null;

  return (
    <Link
      href="/more"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-sky-800 transition-colors hover:border-sky-200 hover:bg-sky-100",
        className,
      )}
      title="마이페이지 · 포인트"
    >
      <Coins className="size-3.5 shrink-0 text-sky-600" aria-hidden />
      {points}P
    </Link>
  );
}
