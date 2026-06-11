export function WorldCupHostStrip() {
  return (
    <div className="wc-host-strip" aria-hidden>
      <span className="wc-host-segment wc-host-usa" />
      <span className="wc-host-segment wc-host-mex" />
      <span className="wc-host-segment wc-host-can" />
    </div>
  );
}

/** 월드컵 시즌 장식 — 색·패턴만, 텍스트 없음 */
export function WorldCupBanner() {
  return (
    <div className="worldcup-hero worldcup-hero-compact worldcup-hero-visual-only" aria-hidden>
      <div className="worldcup-hero-glow" />
      <div className="worldcup-hero-pitch-lines" />
    </div>
  );
}
