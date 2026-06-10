import type { ChordSheetBlockRow } from "@/features/chord-sheet/domain";
import { emptyLinesJson, normalizeLinesJson, type ChordLineRow, type LinesJson } from "@/features/chord-sheet/lib/lines-json";
import type { ChordSheetArrangementPosition, ChordSheetSectionTag } from "@/types/database";

export type StructureBlockInput = {
  section_tag: ChordSheetSectionTag;
  custom_label: string | null;
  transpose_semitones: number;
  lines_json: LinesJson;
};

export type FlattenedBlockLine = {
  globalIndex: number;
  sourceBlockId: string;
  sourceBlockIndex: number;
  sourceLineIndex: number;
  section_tag: ChordSheetSectionTag;
  custom_label: string | null;
  transpose_semitones: number;
  line: ChordLineRow;
};

export type LineSelectionRange = {
  start: number;
  end: number;
};

export const ARRANGEMENT_POSITION_OPTIONS: Array<{
  value: ChordSheetArrangementPosition;
  label: string;
  helper: string;
}> = [
  { value: "below_title", label: "제목 아래", helper: "곡 제목 바로 아래에 진행 순서를 표시" },
  { value: "top_right", label: "우측 상단", helper: "제목 영역 우측 상단에 compact 뱃지로 표시" },
  { value: "after_lyrics", label: "가사 맨 끝", helper: "본문 마지막 아래에 진행 순서를 표시" },
];

function splitTextToLines(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n");
  return parts.length > 0 ? parts : [""];
}

function clampLineChords(line: ChordLineRow, nextText: string): ChordLineRow {
  const max = nextText.length;
  return {
    text: nextText,
    chords: line.chords
      .map((chord) => ({
        ...chord,
        at: Math.max(0, Math.min(chord.at, max)),
      }))
      .filter((chord) => chord.symbol.trim().length > 0),
  };
}

export function flattenBlocksToEditableText(blocks: ChordSheetBlockRow[]) {
  const rows = blocks.flatMap((block) => normalizeLinesJson(block.lines_json).lines);
  if (rows.length === 0) return "";
  return rows.map((row) => row.text).join("\n");
}

export function applyPlainTextToBlocks(blocks: ChordSheetBlockRow[], text: string): StructureBlockInput[] {
  const nextLines = splitTextToLines(text);

  if (blocks.length === 0) {
    return [
      {
        section_tag: "A",
        custom_label: null,
        transpose_semitones: 0,
        lines_json: {
          version: 1,
          lines: nextLines.map((line) => ({ text: line, chords: [] })),
        },
      },
    ];
  }

  let cursor = 0;
  return blocks.map((block, index) => {
    const normalized = normalizeLinesJson(block.lines_json);
    const existingCount = Math.max(1, normalized.lines.length);
    const remaining = nextLines.length - cursor;
    const takeCount = index === blocks.length - 1 ? Math.max(1, remaining) : existingCount;

    const lines = Array.from({ length: takeCount }, (_, localIndex) => {
      const nextText = nextLines[cursor + localIndex] ?? "";
      const originalLine = normalized.lines[localIndex] ?? { text: "", chords: [] };
      return clampLineChords(originalLine, nextText);
    });

    cursor += takeCount;

    return {
      section_tag: block.section_tag,
      custom_label: block.custom_label,
      transpose_semitones: block.transpose_semitones,
      lines_json: {
        version: 1,
        lines,
      },
    };
  });
}

export function flattenBlocksToSelectableLines(blocks: ChordSheetBlockRow[]): FlattenedBlockLine[] {
  const out: FlattenedBlockLine[] = [];
  blocks.forEach((block, blockIndex) => {
    const normalized = normalizeLinesJson(block.lines_json);
    normalized.lines.forEach((line, sourceLineIndex) => {
      out.push({
        globalIndex: out.length,
        sourceBlockId: block.id,
        sourceBlockIndex: blockIndex,
        sourceLineIndex,
        section_tag: block.section_tag,
        custom_label: block.custom_label,
        transpose_semitones: block.transpose_semitones,
        line,
      });
    });
  });
  return out;
}

export function normalizeSelectionRange(selection: LineSelectionRange | null): LineSelectionRange | null {
  if (!selection) return null;
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);
  return { start, end };
}

function isSelected(index: number, selection: LineSelectionRange | null) {
  if (!selection) return false;
  return index >= selection.start && index <= selection.end;
}

export function buildStructureBlocksFromSelection(
  lines: FlattenedBlockLine[],
  selection: LineSelectionRange | null,
  sectionTag: ChordSheetSectionTag,
): StructureBlockInput[] {
  if (lines.length === 0) {
    return [
      {
        section_tag: sectionTag,
        custom_label: null,
        transpose_semitones: 0,
        lines_json: emptyLinesJson(),
      },
    ];
  }

  const normalizedSelection = normalizeSelectionRange(selection);
  if (!normalizedSelection) {
    return groupLinesByCurrentBlocks(lines);
  }

  const out: StructureBlockInput[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const current = lines[cursor]!;
    const currentSelected = isSelected(cursor, normalizedSelection);
    const segment: FlattenedBlockLine[] = [current];
    cursor += 1;

    while (cursor < lines.length) {
      const candidate = lines[cursor]!;
      const candidateSelected = isSelected(cursor, normalizedSelection);

      if (currentSelected !== candidateSelected) break;
      if (!currentSelected && candidate.sourceBlockId !== current.sourceBlockId) break;

      segment.push(candidate);
      cursor += 1;
    }

    const first = segment[0]!;
    out.push({
      section_tag: currentSelected ? sectionTag : first.section_tag,
      custom_label: currentSelected ? null : first.custom_label,
      transpose_semitones: first.transpose_semitones,
      lines_json: {
        version: 1,
        lines: segment.map((item) => item.line),
      },
    });
  }

  return out;
}

export function groupLinesByCurrentBlocks(lines: FlattenedBlockLine[]): StructureBlockInput[] {
  if (lines.length === 0) {
    return [
      {
        section_tag: "A",
        custom_label: null,
        transpose_semitones: 0,
        lines_json: emptyLinesJson(),
      },
    ];
  }

  const out: StructureBlockInput[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const first = lines[cursor]!;
    const segment: FlattenedBlockLine[] = [first];
    cursor += 1;

    while (cursor < lines.length && lines[cursor]!.sourceBlockId === first.sourceBlockId) {
      segment.push(lines[cursor]!);
      cursor += 1;
    }

    out.push({
      section_tag: first.section_tag,
      custom_label: first.custom_label,
      transpose_semitones: first.transpose_semitones,
      lines_json: {
        version: 1,
        lines: segment.map((item) => item.line),
      },
    });
  }

  return out;
}
