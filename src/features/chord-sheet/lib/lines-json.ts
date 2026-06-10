/** DB chord_sheet_blocks.lines_json 및 arrangement JSON 과 동일한 형태 */

export type ChordSlot = { at: number; symbol: string };

export type ChordLineRow = { text: string; chords: ChordSlot[] };

export type LinesJson = {
  version: 1;
  lines: ChordLineRow[];
};

export type ArrangementEntry = { block_id: string };

export function emptyLinesJson(): LinesJson {
  return { version: 1, lines: [{ text: "", chords: [] }] };
}

export function normalizeLinesJson(raw: unknown): LinesJson {
  if (!raw || typeof raw !== "object") return emptyLinesJson();
  const o = raw as { version?: number; lines?: unknown };
  if (!Array.isArray(o.lines) || o.lines.length === 0) {
    return emptyLinesJson();
  }
  const lines: ChordLineRow[] = o.lines.map((row) => {
    if (!row || typeof row !== "object") return { text: "", chords: [] };
    const r = row as { text?: unknown; chords?: unknown };
    const text = typeof r.text === "string" ? r.text : "";
    const chordsRaw = Array.isArray(r.chords) ? r.chords : [];
    const chords: ChordSlot[] = chordsRaw
      .map((c) => {
        if (!c || typeof c !== "object") return null;
        const x = c as { at?: unknown; symbol?: unknown };
        const at = typeof x.at === "number" && Number.isFinite(x.at) ? Math.max(0, Math.floor(x.at)) : 0;
        const symbol = typeof x.symbol === "string" ? x.symbol : "";
        if (!symbol.trim()) return null;
        return { at, symbol: symbol.trim() };
      })
      .filter((c): c is ChordSlot => c != null);
    return { text, chords };
  });
  return { version: 1, lines };
}

export function parseArrangement(raw: unknown): ArrangementEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ArrangementEntry[] = [];
  for (const el of raw) {
    if (!el || typeof el !== "object") continue;
    const id = (el as { block_id?: unknown }).block_id;
    if (typeof id === "string" && id.length > 0) {
      out.push({ block_id: id });
    }
  }
  return out;
}

export function sortChordsInLine(line: ChordLineRow): ChordLineRow {
  return {
    ...line,
    chords: [...line.chords].sort((a, b) => a.at - b.at),
  };
}

export function updateLineText(lines: LinesJson, lineIndex: number, text: string): LinesJson {
  const next = { ...lines, lines: [...lines.lines] };
  const row = next.lines[lineIndex];
  if (!row) return lines;
  next.lines[lineIndex] = { ...row, text };
  return next;
}

export function upsertChordAt(lines: LinesJson, lineIndex: number, at: number, symbol: string): LinesJson {
  const next = { ...lines, lines: [...lines.lines] };
  const row = next.lines[lineIndex];
  if (!row) return lines;
  const clampedAt = Math.max(0, Math.min(Math.floor(at), row.text.length));
  const sym = symbol.trim();
  if (!sym) return next;
  const others = row.chords.filter((c) => c.at !== clampedAt);
  const chords = sortChordsInLine({ ...row, chords: [...others, { at: clampedAt, symbol: sym }] }).chords;
  next.lines[lineIndex] = { ...row, chords };
  return next;
}

export function removeChordAt(lines: LinesJson, lineIndex: number, at: number): LinesJson {
  const next = { ...lines, lines: [...lines.lines] };
  const row = next.lines[lineIndex];
  if (!row) return lines;
  next.lines[lineIndex] = {
    ...row,
    chords: row.chords.filter((c) => c.at !== at),
  };
  return next;
}

export function addEmptyLine(lines: LinesJson): LinesJson {
  return { ...lines, lines: [...lines.lines, { text: "", chords: [] }] };
}

export function removeLine(lines: LinesJson, lineIndex: number): LinesJson {
  if (lines.lines.length <= 1) return lines;
  return { ...lines, lines: lines.lines.filter((_, i) => i !== lineIndex) };
}
