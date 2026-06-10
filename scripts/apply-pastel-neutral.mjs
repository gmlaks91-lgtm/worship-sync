import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  "src/features/setlist/components/WeeklySetlistHero.tsx",
  "src/features/dashboard/components/WeeklyChecklistTeamOverview.tsx",
  "src/features/setlist/components/WeeklySongRow.tsx",
  "src/features/setlist/components/SetlistSongsSection.tsx",
  "src/features/setlist/components/SetlistLineupEditor.tsx",
  "src/app/(app)/playlist/page.tsx",
];

function pastelize(content) {
  return content
    .replaceAll("border-neutral-200", "border-gray-100")
    .replaceAll("border-neutral-100", "border-gray-100")
    .replaceAll("border-neutral-300", "border-gray-200")
    .replaceAll("bg-neutral-50", "bg-slate-50")
    .replaceAll("bg-neutral-100", "bg-slate-100")
    .replaceAll("bg-neutral-200", "bg-slate-200")
    .replaceAll("bg-neutral-900", "bg-sky-500")
    .replaceAll("hover:bg-neutral-800", "hover:bg-sky-600")
    .replaceAll("text-neutral-900", "text-gray-800")
    .replaceAll("text-neutral-800", "text-gray-800")
    .replaceAll("text-neutral-700", "text-gray-700")
    .replaceAll("text-neutral-600", "text-gray-600")
    .replaceAll("text-neutral-500", "text-gray-500")
    .replaceAll("text-neutral-400", "text-gray-400")
    .replaceAll("text-neutral-300", "text-gray-300")
    .replaceAll("shadow-neutral-100/80", "")
    .replaceAll("shadow-neutral-100/60", "")
    .replaceAll("accent-neutral-900", "accent-sky-500");
}

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  const after = pastelize(before);
  if (before !== after) {
    fs.writeFileSync(file, after, "utf8");
    console.log("updated", rel);
  }
}
