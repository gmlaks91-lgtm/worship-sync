"use client";

import { usePoints } from "@/features/points/components/PointsProvider";
import { cn } from "@/lib/utils";

type PointsBalanceProps = {
  className?: string;
  valueClassName?: string;
  suffixClassName?: string;
  showSuffix?: boolean;
};

export function PointsBalance({
  className,
  valueClassName,
  suffixClassName,
  showSuffix = true,
}: PointsBalanceProps) {
  const { points } = usePoints();

  return (
    <span className={cn("tabular-nums", className)}>
      <span className={valueClassName}>{points}</span>
      {showSuffix ? <span className={suffixClassName}>P</span> : null}
    </span>
  );
}
