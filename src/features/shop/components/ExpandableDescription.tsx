"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type ExpandableDescriptionProps = {
  text: string;
  className?: string;
  collapsedClassName?: string;
  lines?: 2 | 3;
};

export function ExpandableDescription({
  text,
  className,
  collapsedClassName,
  lines = 2,
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const clampClass = lines === 3 ? "line-clamp-3" : "line-clamp-2";
  const needsToggle = text.length > 48;

  return (
    <div className={cn("space-y-1.5", className)}>
      <p
        id={contentId}
        className={cn(
          "break-words text-sm leading-relaxed text-slate-500",
          !expanded && needsToggle && clampClass,
          !expanded && collapsedClassName,
        )}
      >
        {text}
      </p>
      {needsToggle ? (
        <button
          type="button"
          className="min-h-9 rounded-lg px-2 py-2 text-xs font-medium text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline active:bg-sky-50/60"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "접기" : "더보기"}
        </button>
      ) : null}
    </div>
  );
}
