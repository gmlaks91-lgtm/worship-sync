"use client";

import { useOptionalPoints } from "@/features/points/components/PointsProvider";
import { getCurrentUserPoints } from "@/features/points/actions/getCurrentUserPoints";
import { POINTS_UPDATED_EVENT, type PointsUpdatedDetail } from "@/features/points/lib/points-events";
import { useCallback, useEffect, useState } from "react";

/** 전역 PointsProvider가 없을 때만 로컬 상태로 동작 (폴백) */
export function usePointsBalance(initialPoints: number) {
  const global = useOptionalPoints();
  const [localPoints, setLocalPoints] = useState(initialPoints);

  useEffect(() => {
    if (global) return;
    setLocalPoints(initialPoints);
  }, [global, initialPoints]);

  useEffect(() => {
    if (global) return;

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<PointsUpdatedDetail>).detail;
      if (typeof detail?.points === "number") {
        setLocalPoints(detail.points);
      }
    };
    window.addEventListener(POINTS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(POINTS_UPDATED_EVENT, onUpdated);
  }, [global]);

  const refreshPoints = useCallback(async () => {
    if (global) {
      return global.refreshPoints();
    }
    const res = await getCurrentUserPoints();
    if (res.ok) {
      setLocalPoints(res.points);
      return res.points;
    }
    return null;
  }, [global]);

  if (global) {
    return {
      points: global.points,
      setPoints: global.setPoints,
      refreshPoints: global.refreshPoints,
    };
  }

  return { points: localPoints, setPoints: setLocalPoints, refreshPoints };
}
