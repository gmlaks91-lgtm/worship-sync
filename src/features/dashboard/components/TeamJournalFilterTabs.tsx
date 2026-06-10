"use client";

import type { JournalTeamFilter, UserTeam } from "@/features/teams/types";
import { cn } from "@/lib/utils";

const TAB_PALETTES = [
  { active: "bg-sky-100 text-sky-800 ring-sky-200/80", idle: "bg-sky-50/90 text-sky-700 hover:bg-sky-100" },
  { active: "bg-rose-100 text-rose-800 ring-rose-200/80", idle: "bg-rose-50/90 text-rose-700 hover:bg-rose-100" },
  { active: "bg-amber-100 text-amber-900 ring-amber-200/80", idle: "bg-amber-50/90 text-amber-800 hover:bg-amber-100" },
  { active: "bg-violet-100 text-violet-800 ring-violet-200/80", idle: "bg-violet-50/90 text-violet-700 hover:bg-violet-100" },
  { active: "bg-emerald-100 text-emerald-800 ring-emerald-200/80", idle: "bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100" },
] as const;

const ALL_TAB = {
  active: "bg-slate-200/90 text-slate-800 ring-slate-300/80",
  idle: "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80",
} as const;

type TeamJournalFilterTabsProps = {
  teams: UserTeam[];
  value: JournalTeamFilter;
  onChange: (value: JournalTeamFilter) => void;
  disabled?: boolean;
};

export function TeamJournalFilterTabs({
  teams,
  value,
  onChange,
  disabled = false,
}: TeamJournalFilterTabsProps) {
  if (teams.length === 0) {
    return null;
  }

  return (
    <div
      className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="팀별 일지 필터"
    >
      <div className="flex min-w-min gap-2 px-1">
        <FilterTabButton
          label="전체"
          isActive={value === "all"}
          palette={ALL_TAB}
          disabled={disabled}
          onClick={() => onChange("all")}
        />
        {teams.map((team, index) => {
          const palette = TAB_PALETTES[index % TAB_PALETTES.length];
          return (
            <FilterTabButton
              key={team.id}
              label={team.name}
              isActive={value === team.id}
              palette={palette}
              disabled={disabled}
              onClick={() => onChange(team.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

type FilterTabButtonProps = {
  label: string;
  isActive: boolean;
  palette: { active: string; idle: string };
  disabled: boolean;
  onClick: () => void;
};

function FilterTabButton({ label, isActive, palette, disabled, onClick }: FilterTabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive ? palette.active : palette.idle,
      )}
    >
      {label}
    </button>
  );
}
