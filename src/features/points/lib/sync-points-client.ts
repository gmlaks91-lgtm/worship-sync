import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { getCurrentUserPoints } from "@/features/points/actions/getCurrentUserPoints";
import { notifyPointsUpdated } from "@/features/points/lib/points-events";

/** 포인트 변동 직후 클라이언트 UI·서버 컴포넌트 동기화 */
export async function syncPointsAfterMutation(
  router: AppRouterInstance,
  totalPoints?: number | null,
) {
  if (typeof totalPoints === "number" && Number.isFinite(totalPoints)) {
    notifyPointsUpdated(totalPoints);
  } else {
    const res = await getCurrentUserPoints();
    if (res.ok) {
      notifyPointsUpdated(res.points);
    }
  }
  router.refresh();
}
