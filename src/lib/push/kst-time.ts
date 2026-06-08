/** KST(Asia/Seoul) 기준 현재 시각의 HH:mm */
export function getKstHourMinute(now = new Date()): { hour: number; minute: number; hhmm: string } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return {
    hour,
    minute,
    hhmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

/** DB time 컬럼("09:30:00" 등) → HH:mm */
export function normalizeReminderTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = /^(\d{2}:\d{2})/.exec(raw.trim());
  return match?.[1] ?? null;
}

/** HH:mm → Postgres time 리터럴용 HH:mm:00 */
export function toDbReminderTime(hhmm: string): string {
  return `${hhmm}:00`;
}
