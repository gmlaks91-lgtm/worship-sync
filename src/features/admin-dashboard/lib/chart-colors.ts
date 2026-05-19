/** Admin 대시보드 차트용 파스텔 팔레트 (원색 사용 금지) */
export const CHART_COLORS = {
  sky: "#38bdf8", // sky-400
  skyLight: "#bae6fd", // sky-200
  rose: "#fb7185", // rose-400
  roseLight: "#fecdd3", // rose-200
  amber: "#fcd34d", // amber-300
  amberLight: "#fef08a", // yellow-200
  violet: "#c4b5fd", // violet-300
  mint: "#99f6e4", // teal-200
  slate: "#cbd5e1", // slate-300
} as const;

export const CHART_PALETTE = [
  CHART_COLORS.sky,
  CHART_COLORS.rose,
  CHART_COLORS.amber,
  CHART_COLORS.violet,
  CHART_COLORS.mint,
  CHART_COLORS.skyLight,
  CHART_COLORS.roseLight,
] as const;

export const CHART_AXIS = {
  tick: "#94a3b8",
  grid: "#e2e8f0",
  label: "#64748b",
} as const;
