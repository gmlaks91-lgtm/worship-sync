import type { WeeklyChecklistAutosaveStatus } from "@/features/dashboard/hooks/useWeeklyChecklistAutosave";
import { cn } from "@/lib/utils";

type WeeklyChecklistAutosaveStatusProps = {
  status: WeeklyChecklistAutosaveStatus;
  className?: string;
};

export function WeeklyChecklistAutosaveStatusLabel({
  status,
  className,
}: WeeklyChecklistAutosaveStatusProps) {
  if (status === "idle") return null;

  const label =
    status === "saved"
      ? "저장됨"
      : status === "error"
        ? "저장에 실패했습니다"
        : "저장 중…";

  return (
    <p
      className={cn(
        "text-xs text-gray-400 transition-opacity duration-200",
        status === "saved" && "text-gray-500",
        status === "error" && "text-destructive/80",
        className,
      )}
      aria-live="polite"
    >
      {label}
    </p>
  );
}
