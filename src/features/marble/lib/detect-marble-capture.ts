import { positionFromScore, type BlueMarbleRow } from "@/features/marble/types";

export type MarbleCaptureEvent = {
  capturerId: string;
  capturedId: string;
  tileIndex: number;
  message: string;
};

function teamPosition(team: BlueMarbleRow): number {
  return positionFromScore(team.score);
}

/**
 * 이전 스냅샷 대비 실제로 이동한 팀이, 이동 전부터 그 칸에 있던 다른 팀 위에
 * 도착했으면 말 잡기(capture)로 판정한다.
 */
export function detectMarbleCaptures(
  previous: BlueMarbleRow[],
  current: BlueMarbleRow[],
): MarbleCaptureEvent[] {
  const prevById = new Map(previous.map((t) => [t.id, t]));
  const events: MarbleCaptureEvent[] = [];
  const seen = new Set<string>();

  for (const mover of current) {
    const prevMover = prevById.get(mover.id);
    if (!prevMover) continue;

    const from = teamPosition(prevMover);
    const to = teamPosition(mover);
    if (from === to) continue;

    for (const other of previous) {
      if (other.id === mover.id) continue;
      if (teamPosition(other) !== to) continue;

      const key = [mover.id, other.id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      const isComeback = prevMover.score < other.score;
      events.push({
        capturerId: mover.id,
        capturedId: other.id,
        tileIndex: to,
        message: isComeback ? "🚀 역전!" : "💥 잡았다!",
      });
    }
  }

  return events;
}
