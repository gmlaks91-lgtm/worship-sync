/** 관리자 '이번 주 추가 점수' 입력값을 안전하게 정수로 변환 */
export function parsePendingScoreInput(
  raw: unknown,
): { ok: true; value: number } | { ok: false; message: string } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: 0 };
  }

  const s = String(raw).trim();
  if (s === "" || s === "-" || s === "+" || s === "undefined" || s === "null") {
    return { ok: false, message: "올바른 점수를 입력해 주세요. (예: 50, -10, 100)" };
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "숫자만 입력할 수 있습니다." };
  }

  const value = Math.trunc(n);
  if (value < -1_000_000 || value > 1_000_000) {
    return { ok: false, message: "점수는 -1,000,000 ~ 1,000,000 범위여야 합니다." };
  }

  return { ok: true, value };
}

/** UI 미리보기용 (잘못된 입력 중이면 0으로 처리) */
export function previewPendingScore(raw: string): number {
  const parsed = parsePendingScoreInput(raw);
  return parsed.ok ? parsed.value : 0;
}
