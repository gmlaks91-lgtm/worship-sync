import type {
  PrepSetlistRow,
  SetlistLineupRow,
  SetlistSongRow,
} from "@/features/setlist/queries/getSetlists";
import type { SheetSummary } from "@/features/sheets/types";

export type SetlistSongWithSheet = SetlistSongRow & { sheet: SheetSummary | null };

export type PrepSetlistWithSheets = Omit<PrepSetlistRow, "songs"> & {
  songs: SetlistSongWithSheet[];
  lineup: SetlistLineupRow[];
};
