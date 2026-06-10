import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const boardPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src/features/dashboard/components/WeeklyChecklistBoard.tsx",
);

let board = fs.readFileSync(boardPath, "utf8");

const needle = "</CardDescription>";
const insert =
  '\n                <WeeklyChecklistAutosaveStatusLabel status={autosaveStatus} className="mt-2" />';

if (!board.includes("WeeklyChecklistAutosaveStatusLabel status")) {
  const idx = board.indexOf(needle);
  if (idx === -1) throw new Error("CardDescription close not found");
  board =
    board.slice(0, idx + needle.length) + insert + board.slice(idx + needle.length);
  fs.writeFileSync(boardPath, board, "utf8");
}

console.log("ok", board.includes("WeeklyChecklistAutosaveStatusLabel status"));
