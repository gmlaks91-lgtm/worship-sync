type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  w: number;
  h: number;
  color: string;
  round?: boolean;
};

type FireworkBurst = {
  id: number;
  left: number;
  delay: number;
};

const CONFETTI: ConfettiPiece[] = [
  { id: 0, left: 4, delay: 0, duration: 5.8, drift: 28, w: 7, h: 11, color: "#fbbf24" },
  { id: 1, left: 11, delay: 1.2, duration: 6.4, drift: -22, w: 6, h: 9, color: "#ef4444" },
  { id: 2, left: 18, delay: 0.4, duration: 5.2, drift: 18, w: 5, h: 8, color: "#ffffff" },
  { id: 3, left: 26, delay: 2.1, duration: 7.1, drift: -35, w: 8, h: 6, color: "#22c55e" },
  { id: 4, left: 33, delay: 0.8, duration: 6, drift: 24, w: 6, h: 10, color: "#3b82f6", round: true },
  { id: 5, left: 41, delay: 3.3, duration: 5.5, drift: -16, w: 7, h: 7, color: "#fbbf24", round: true },
  { id: 6, left: 48, delay: 1.6, duration: 6.8, drift: 32, w: 5, h: 12, color: "#f472b6" },
  { id: 7, left: 55, delay: 0.2, duration: 5.9, drift: -28, w: 6, h: 9, color: "#ffffff" },
  { id: 8, left: 62, delay: 2.8, duration: 6.2, drift: 20, w: 8, h: 8, color: "#eab308" },
  { id: 9, left: 69, delay: 1, duration: 7.4, drift: -24, w: 5, h: 10, color: "#22c55e" },
  { id: 10, left: 76, delay: 3.8, duration: 5.6, drift: 26, w: 7, h: 6, color: "#ef4444" },
  { id: 11, left: 83, delay: 0.6, duration: 6.5, drift: -18, w: 6, h: 11, color: "#60a5fa" },
  { id: 12, left: 90, delay: 2.4, duration: 5.3, drift: 30, w: 5, h: 8, color: "#fbbf24" },
  { id: 13, left: 96, delay: 1.4, duration: 6.9, drift: -32, w: 7, h: 9, color: "#ffffff", round: true },
  { id: 14, left: 14, delay: 4.2, duration: 6.1, drift: 22, w: 6, h: 10, color: "#a855f7" },
  { id: 15, left: 37, delay: 4.8, duration: 5.7, drift: -26, w: 8, h: 7, color: "#fbbf24" },
  { id: 16, left: 58, delay: 5.1, duration: 6.6, drift: 34, w: 5, h: 9, color: "#ef4444", round: true },
  { id: 17, left: 79, delay: 4.5, duration: 5.4, drift: -20, w: 7, h: 11, color: "#22c55e" },
];

const FIREWORKS: FireworkBurst[] = [
  { id: 0, left: 12, delay: 0 },
  { id: 1, left: 34, delay: 3.5 },
  { id: 2, left: 58, delay: 7 },
  { id: 3, left: 78, delay: 10.5 },
  { id: 4, left: 92, delay: 14 },
];

const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function WorldCupAtmosphere() {
  return (
    <div className="wc-atmosphere pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="wc-stadium-lights wc-stadium-lights-left" />
      <div className="wc-stadium-lights wc-stadium-lights-right" />

      <div className="wc-confetti-layer">
        {CONFETTI.map((piece) => (
          <span
            key={piece.id}
            className="wc-confetti-piece"
            style={{
              left: `${piece.left}%`,
              width: piece.w,
              height: piece.h,
              backgroundColor: piece.color,
              borderRadius: piece.round ? "50%" : 2,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              ["--wc-drift" as string]: `${piece.drift}px`,
            }}
          />
        ))}

        {FIREWORKS.map((burst) => (
          <div
            key={burst.id}
            className="wc-firework"
            style={{
              left: `${burst.left}%`,
              ["--wc-firework-delay" as string]: `${burst.delay}s`,
            }}
          >
            {SPARK_ANGLES.map((angle) => (
              <span
                key={angle}
                className="wc-firework-spark"
                style={{ ["--wc-spark-angle" as string]: `${angle}deg` }}
              />
            ))}
          </div>
        ))}
      </div>

      <span className="wc-floating-ball wc-floating-ball-1">⚽</span>
      <span className="wc-floating-ball wc-floating-ball-2">⚽</span>
      <span className="wc-floating-ball wc-floating-ball-3">⚽</span>
    </div>
  );
}
