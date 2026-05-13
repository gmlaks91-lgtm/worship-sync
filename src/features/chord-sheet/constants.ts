import type { ChordSheetSectionTag } from "@/types/database";

export const CHORD_SECTION_TAGS: { value: ChordSheetSectionTag; label: string }[] = [
  { value: "I", label: "Intro (I)" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "간주", label: "간주" },
  { value: "O", label: "Outro (O)" },
];

export function formatSectionBadge(tag: ChordSheetSectionTag, customLabel: string | null): string {
  if (tag === "간주" && customLabel?.trim()) {
    return `간주(${customLabel.trim()})`;
  }
  return tag;
}
