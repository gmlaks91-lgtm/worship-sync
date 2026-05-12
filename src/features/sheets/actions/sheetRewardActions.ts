"use server";

import { awardPointsForEvent } from "@/features/points/server/awardPoints";

export async function rewardSheetView() {
  return awardPointsForEvent({
    eventType: "sheet_view",
    points: 10,
  });
}
