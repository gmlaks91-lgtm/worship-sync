import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function gitFile(rel) {
  return execSync(`git show HEAD:${rel}`, { encoding: "utf8", cwd: root });
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, "utf8");
}

// --- Worship card ---
let worship = gitFile("src/features/dashboard/components/WeeklyChecklistWorshipCard.tsx");
worship = worship.replace(
  "onChange: (patch: Partial<WeeklyChecklistWorshipRecords>) => void;",
  "onImmediateChange: (patch: Partial<WeeklyChecklistWorshipRecords>) => void;",
);
worship = worship.replace(
  /export function WeeklyChecklistWorshipCard\(\{\s*value,\s*disabled,\s*onChange,/,
  "export function WeeklyChecklistWorshipCard({\n  value,\n  disabled,\n  onImmediateChange,",
);
worship = worship.replace(
  /onChange=\{\((\w+)\) => onChange\(\{ \1 \}\)\}/g,
  "onChange={($1) => onImmediateChange({ $1 })}",
);
worship = worship.replace(
  /onChange=\{\((\w+)\) =>\s*onChange\(\{/g,
  "onChange={($1) => onImmediateChange({",
);
worship = worship.replace(
  "onChange={(event) => onChange({ youthEarlyArrival: event.target.checked })}",
  "onChange={(event) => onImmediateChange({ youthEarlyArrival: event.target.checked })}",
);
worship = worship
  .replaceAll("border-neutral-200", "border-gray-100")
  .replaceAll("border-neutral-300", "border-gray-200")
  .replaceAll("bg-neutral-50", "bg-slate-50")
  .replaceAll("text-neutral-900", "text-gray-800")
  .replaceAll("text-neutral-500", "text-gray-500")
  .replaceAll("text-neutral-400", "text-gray-400")
  .replaceAll("text-neutral-600", "text-gray-600")
  .replaceAll("accent-neutral-900", "accent-sky-500")
  .replace(
    'className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"',
    'className={cn(\n        "flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all duration-200",\n        "hover:border-sky-100 hover:bg-sky-50/40",\n        checked && "border-sky-200 bg-sky-50/60",\n      )}',
  );

if (!worship.includes('import { cn }')) {
  worship = worship.replace(
    'import type { WeeklyChecklistWorshipRecords }',
    'import type { WeeklyChecklistWorshipRecords } from "@/features/dashboard/lib/weekly-checklist";\nimport { cn } from "@/lib/utils";\n\n// placeholder',
  );
  worship = worship.replace(
    'import type { WeeklyChecklistWorshipRecords } from "@/features/dashboard/lib/weekly-checklist";\nimport { cn } from "@/lib/utils";\n\n// placeholder from "@/features/dashboard/lib/weekly-checklist";',
    'import type { WeeklyChecklistWorshipRecords } from "@/features/dashboard/lib/weekly-checklist";\nimport { cn } from "@/lib/utils";',
  );
}

worship = worship.replace(
  '<Church className="size-4 text-gray-500"',
  '<Church className="size-4 text-sky-500"',
);
worship = worship.replace(
  'section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-neutral-100/80"',
  'section className="surface-card p-5"',
);
worship = worship.replace(
  '<Clock3 className="size-4 text-gray-500"',
  '<Clock3 className="size-4 text-rose-400"',
);
worship = worship.replace(
  'className="size-4 rounded border-gray-200 accent-sky-500"',
  'className="size-4 rounded border-gray-200 accent-rose-400"',
);
worship = worship.replace(
  '        <motion className="rounded-xl border border-gray-100 bg-slate-50 px-4 py-3">',
  '        <div className="rounded-xl border border-gray-100 bg-slate-50 px-4 py-3 transition-all duration-200 hover:border-sky-100">',
);

write("src/features/dashboard/components/WeeklyChecklistWorshipCard.tsx", worship);

// --- Board ---
let board = gitFile("src/features/dashboard/components/WeeklyChecklistBoard.tsx");

board = board
  .replace('import { useEffect, useMemo, useState, useTransition } from "react";', 'import { useCallback, useEffect, useMemo, useState, useTransition } from "react";')
  .replace('import { Loader2, Save, Send } from "lucide-react";', 'import { Loader2, Send } from "lucide-react";')
  .replace(
    `import {
  submitWeeklyChecklist,
  upsertWeeklyChecklistDraft,
} from "@/features/dashboard/actions/weeklyChecklistActions";`,
    `import { submitWeeklyChecklist } from "@/features/dashboard/actions/weeklyChecklistActions";`,
  )
  .replace(
    'import { WeeklyChecklistWorshipCard } from "@/features/dashboard/components/WeeklyChecklistWorshipCard";',
    `import { WeeklyChecklistAutosaveStatusLabel } from "@/features/dashboard/components/WeeklyChecklistAutosaveStatus";
import { WeeklyChecklistWorshipCard } from "@/features/dashboard/components/WeeklyChecklistWorshipCard";
import { useWeeklyChecklistAutosave } from "@/features/dashboard/hooks/useWeeklyChecklistAutosave";
import type { WeeklyChecklistSaveSnapshot } from "@/features/dashboard/hooks/useWeeklyChecklistAutosave";`,
  );

board = board.replace(
  `type WeeklyChecklistBoardProps = {
  data: WeeklyChecklistBoardData;
};`,
  `type WeeklyChecklistBoardProps = {
  data: WeeklyChecklistBoardData;
  onAutosaveComplete?: () => void;
};`,
);

board = board.replace(
  "export function WeeklyChecklistBoard({ data }: WeeklyChecklistBoardProps) {",
  "export function WeeklyChecklistBoard({ data, onAutosaveComplete }: WeeklyChecklistBoardProps) {",
);

board = board.replace(
  `  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDailyRecords(data.checklist.dailyRecords);
    setWorshipRecords(data.checklist.worshipRecords);
    setDirty(false);
  },`,
  `  useEffect(() => {
    setDailyRecords(data.checklist.dailyRecords);
    setWorshipRecords(data.checklist.worshipRecords);
  },`,
);

const autosaveHook = `
  const { status: autosaveStatus, scheduleDebouncedSave, saveImmediately, flushPending } =
    useWeeklyChecklistAutosave({
      weekStartDate: data.weekStartDate,
      isSubmitted: data.checklist.isSubmitted,
      dailyRecords,
      worshipRecords,
      onSaved: onAutosaveComplete,
    });

  const applyDailyPatch = useCallback(
    (
      index: number,
      patch: Partial<WeeklyChecklistDailyRecord>,
      mode: "debounced" | "immediate",
    ) => {
      setDailyRecords((current) => {
        const nextDaily = current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        );
        const snapshot: WeeklyChecklistSaveSnapshot = {
          dailyRecords: nextDaily,
          worshipRecords,
        };
        if (mode === "immediate") saveImmediately(snapshot);
        else scheduleDebouncedSave(snapshot);
        return nextDaily;
      });
    },
    [saveImmediately, scheduleDebouncedSave, worshipRecords],
  );

  const applyWorshipPatch = useCallback(
    (patch: Partial<WeeklyChecklistWorshipRecords>) => {
      setWorshipRecords((current) => {
        const nextWorship = { ...current, ...patch };
        saveImmediately({ dailyRecords, worshipRecords: nextWorship });
        return nextWorship;
      });
    },
    [dailyRecords, saveImmediately],
  );
`;

board = board.replace(
  "  const isSubmitted = data.checklist.isSubmitted;",
  autosaveHook + "\n  const isSubmitted = data.checklist.isSubmitted;",
);

board = board.replace(
  /  const onSave = \(\) => \{[\s\S]*?  \};\n\n  const onSubmit/,
  "  const onSubmit",
);

board = board.replace(
  `      setDirty(false);
      toastSuccess(
        result.awardedPoints`,
  `      toastSuccess(
        result.awardedPoints`,
);

board = board.replace(
  "  const onSubmit = () => {",
  `  const onSubmit = () => {
    flushPending();`,
);

// Header UI
board = board.replace(
  /              <Button[\s\S]*?임시 저장[\s\S]*?<\/Button>\n/,
  "",
);

board = board.replace(
  `                ) : dirty ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    저장 전 변경사항 있음
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-500">
                    초안 작성 중
                  </Badge>
                )}`,
  `                ) : (
                  <Badge variant="outline" className="border-sky-100 bg-sky-50 text-sky-700">
                    작성 중
                  </Badge>
                )}`,
);

board = board.replace(
  "              </motion>\n            </motion>\n\n            <div className=\"flex flex-col items-stretch gap-2",
  `              </div>
              <WeeklyChecklistAutosaveStatusLabel status={autosaveStatus} className="mt-1" />
            </motion>

            <div className="flex flex-col items-stretch gap-2`,
);

// Fix botched replace - need to find actual structure
console.log("board has autosave import", board.includes("useWeeklyChecklistAutosave"));

board = board
  .replaceAll("border-neutral-200", "border-gray-100")
  .replaceAll("border-neutral-100", "border-gray-100")
  .replaceAll("border-neutral-300", "border-gray-200")
  .replaceAll("bg-neutral-50", "bg-slate-50")
  .replaceAll("bg-neutral-100", "bg-slate-100")
  .replaceAll("bg-neutral-200", "bg-slate-200")
  .replaceAll("text-neutral-900", "text-gray-800")
  .replaceAll("text-neutral-700", "text-gray-700")
  .replaceAll("text-neutral-600", "text-gray-600")
  .replaceAll("text-neutral-500", "text-gray-500")
  .replaceAll("text-neutral-400", "text-gray-400")
  .replaceAll("text-neutral-300", "text-gray-300")
  .replaceAll("shadow-neutral-100/80", "")
  .replace(
    'className="h-10 bg-neutral-900 text-white hover:bg-neutral-800"',
    'className="h-10"',
  )
  .replace(
    'isSubmitted ? "bg-emerald-500" : "bg-neutral-900"',
    'isSubmitted ? "bg-emerald-500" : "bg-sky-500"',
  )
  .replace(
    '<Card className="overflow-hidden rounded-2xl border-gray-100 bg-white shadow-sm ">',
    '<Card className="overflow-hidden">',
  );

// Day / worship card wiring
board = board.replace(
  /onChange=\{\(patch\) => \{[\s\S]*?setDirty\(true\);[\s\S]*?\}\}\n                \/>/,
  `onDebouncedChange={(patch) => applyDailyPatch(index, patch, "debounced")}
                  onImmediateChange={(patch) => applyDailyPatch(index, patch, "immediate")}
                  onDiaryBlur={() => flushPending()}
                />`,
);

board = board.replace(
  /onChange=\{\(patch\) => \{[\s\S]*?setWorshipRecords[\s\S]*?setDirty\(true\);[\s\S]*?\}\}\n          \/>/,
  `onImmediateChange={applyWorshipPatch}
          />`,
);

write("src/features/dashboard/components/WeeklyChecklistBoard.tsx", board);

// Journal feed pastel
let feed = fs.readFileSync(
  path.join(root, "src/features/dashboard/components/WeeklyChecklistJournalFeed.tsx"),
  "utf8",
);
if (!feed.includes("한줄")) {
  feed = gitFile("src/features/dashboard/components/WeeklyChecklistJournalFeed.tsx");
}
feed = feed
  .replaceAll("border-neutral-200", "border-gray-100")
  .replaceAll("border-neutral-100", "border-gray-100")
  .replaceAll("bg-neutral-50", "bg-slate-50")
  .replaceAll("bg-neutral-100", "bg-slate-100")
  .replaceAll("text-neutral-900", "text-gray-800")
  .replaceAll("text-neutral-700", "text-gray-700")
  .replaceAll("text-neutral-600", "text-gray-600")
  .replaceAll("text-neutral-500", "text-gray-500")
  .replaceAll("shadow-neutral-100/80", "")
  .replaceAll("rounded-3xl border border-gray-100 bg-white shadow-sm", "surface-card rounded-3xl")
  .replace(
    'className="border-gray-100 bg-slate-100 text-gray-700"',
    'className="border-sky-100 bg-sky-50 text-sky-700"',
  );
write("src/features/dashboard/components/WeeklyChecklistJournalFeed.tsx", feed);

console.log("done", {
  worshipOk: worship.includes("onImmediateChange"),
  boardOk: board.includes("applyDailyPatch"),
  feedOk: feed.includes("surface-card"),
});
