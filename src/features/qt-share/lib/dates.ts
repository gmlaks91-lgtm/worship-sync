/** ISO 시각 → KST 기준 YYYY-MM-DD */
export function toKstYmdFromIso(iso: string) {
  const date = new Date(iso);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getKstTodayYmd(now = new Date()) {
  return toKstYmdFromIso(now.toISOString());
}
