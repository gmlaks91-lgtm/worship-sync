/** 코드 기호 조합 (루트 + 품질 접미) */
const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const CHORD_ROOTS: readonly string[] = ROOTS;

export const CHORD_QUALITIES: { value: string; label: string }[] = [
  { value: "", label: "Major" },
  { value: "m", label: "minor (m)" },
  { value: "7", label: "7" },
  { value: "maj7", label: "maj7" },
  { value: "m7", label: "m7" },
  { value: "sus4", label: "sus4" },
  { value: "sus2", label: "sus2" },
  { value: "dim", label: "dim" },
  { value: "aug", label: "aug" },
  { value: "add9", label: "add9" },
  { value: "6", label: "6" },
  { value: "9", label: "9" },
];

export function buildChordSymbol(root: string, quality: string): string {
  const r = root.trim();
  const q = quality.trim();
  if (!r) return "";
  return `${r}${q}`;
}
