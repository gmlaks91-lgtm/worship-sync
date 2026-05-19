"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getCurrentUserPoints } from "@/features/points/actions/getCurrentUserPoints";
import { POINTS_UPDATED_EVENT, type PointsUpdatedDetail } from "@/features/points/lib/points-events";

type PointsContextValue = {
  points: number;
  isLoggedIn: boolean;
  setPoints: (points: number) => void;
  refreshPoints: () => Promise<number | null>;
};

const PointsContext = createContext<PointsContextValue | null>(null);

type PointsProviderProps = {
  children: ReactNode;
  initialPoints: number;
  isLoggedIn: boolean;
};

export function PointsProvider({ children, initialPoints, isLoggedIn }: PointsProviderProps) {
  const pathname = usePathname();
  const [points, setPoints] = useState(initialPoints);

  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  const refreshPoints = useCallback(async () => {
    if (!isLoggedIn) return null;
    const res = await getCurrentUserPoints();
    if (res.ok) {
      setPoints(res.points);
      return res.points;
    }
    return null;
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void refreshPoints();
  }, [isLoggedIn, refreshPoints]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshPoints();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isLoggedIn, refreshPoints]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void refreshPoints();
  }, [pathname, isLoggedIn, refreshPoints]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<PointsUpdatedDetail>).detail;
      if (typeof detail?.points === "number") {
        setPoints(detail.points);
      }
    };
    window.addEventListener(POINTS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(POINTS_UPDATED_EVENT, onUpdated);
  }, []);

  const value = useMemo(
    () => ({ points, isLoggedIn, setPoints, refreshPoints }),
    [points, isLoggedIn, refreshPoints],
  );

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) {
    throw new Error("usePoints는 PointsProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}

export function useOptionalPoints() {
  return useContext(PointsContext);
}
