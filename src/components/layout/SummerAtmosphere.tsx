type Sparkle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
  color: string;
};

const SPARKLES: Sparkle[] = [
  { id: 0, left: 6, delay: 0, duration: 7.2, drift: 22, size: 5, color: "#ffffff" },
  { id: 1, left: 14, delay: 1.1, duration: 8, drift: -18, size: 4, color: "#fef3c7" },
  { id: 2, left: 22, delay: 0.5, duration: 6.5, drift: 16, size: 6, color: "#e0f2fe" },
  { id: 3, left: 31, delay: 2.4, duration: 7.8, drift: -28, size: 4, color: "#ffffff" },
  { id: 4, left: 42, delay: 0.9, duration: 6.9, drift: 20, size: 5, color: "#fde68a" },
  { id: 5, left: 53, delay: 3.1, duration: 8.4, drift: -14, size: 4, color: "#ffffff" },
  { id: 6, left: 64, delay: 1.6, duration: 7, drift: 26, size: 6, color: "#bae6fd" },
  { id: 7, left: 73, delay: 0.3, duration: 6.6, drift: -22, size: 5, color: "#fef9c3" },
  { id: 8, left: 82, delay: 2.8, duration: 7.5, drift: 18, size: 4, color: "#ffffff" },
  { id: 9, left: 91, delay: 1.9, duration: 8.1, drift: -24, size: 5, color: "#e0f2fe" },
  { id: 10, left: 18, delay: 4.2, duration: 7.1, drift: 12, size: 4, color: "#fde68a" },
  { id: 11, left: 48, delay: 4.8, duration: 6.8, drift: -16, size: 6, color: "#ffffff" },
];

/** 여름 시즌 배경 장식 — 햇살·거품·모래 반짝임 (모바일은 CSS로 정지/숨김) */
export function SummerAtmosphere() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden md:fixed"
      aria-hidden
    >
      <div className="summer-sun summer-sun-main" />

      <div className="summer-sparkle-layer hidden md:block">
        {SPARKLES.map((piece) => (
          <span
            key={piece.id}
            className="summer-sparkle"
            style={{
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              ["--summer-drift" as string]: `${piece.drift}px`,
            }}
          />
        ))}
      </div>

      <span className="summer-float summer-float-1 hidden md:inline">🌊</span>
      <span className="summer-float summer-float-2 hidden md:inline">🐚</span>
      <span className="summer-float summer-float-3 hidden md:inline">☀️</span>
    </div>
  );
}
