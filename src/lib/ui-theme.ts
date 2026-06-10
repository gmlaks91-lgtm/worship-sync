/** 파스텔 모던 UI — 전역 클래스 토큰 (Tailwind) */
export const ui = {
  /** 카드 컨테이너 — globals .surface-card 와 동일 */
  surfaceCard: "surface-card",
  surfaceCardHover: "surface-card-hover",
  pageEyebrow: "page-eyebrow",
  pageTitle: "page-title",
  pageDescription: "page-description",
  /** 주요 CTA — 스카이 블루 */
  btnPrimary:
    "bg-sky-500 text-white shadow-sm hover:bg-sky-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
  btnAccent:
    "bg-rose-400 text-white shadow-sm hover:bg-rose-500 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
  iconSky: "text-sky-500",
  iconCoral: "text-rose-400",
  textBody: "text-slate-800",
  textMuted: "text-slate-500",
  textSubtle: "text-slate-400",
} as const;
