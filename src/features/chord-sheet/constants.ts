import type { ChordSheetSectionTag } from "@/types/database";

export const CHORD_SECTION_TAGS: { value: ChordSheetSectionTag; label: string }[] = [
  { value: "V", label: "Verse (V)" },
  { value: "C", label: "Chorus (C)" },
  { value: "T", label: "Tag (T)" },
  { value: "Intro", label: "Intro" },
  { value: "Bridge", label: "Bridge" },
  { value: "PreChorus", label: "Pre-Chorus" },
  { value: "Outro", label: "Outro" },
  { value: "Instrumental", label: "간주" },
  { value: "Custom", label: "기타" },
];
