"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getTopicsForCategory,
  type BoardTopic,
} from "@/features/board/lib/topics";
import type { PostCategory } from "@/types/database";
import { cn } from "@/lib/utils";

type BoardTopicFilterProps = {
  category: PostCategory;
  activeTopic: BoardTopic | null;
};

export function BoardTopicFilter({ category, activeTopic }: BoardTopicFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const topics = getTopicsForCategory(category);

  if (topics.length === 0) return null;

  const selectTopic = (topic: BoardTopic | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (topic) next.set("topic", topic);
    else next.delete("topic");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="주제 필터">
      <button
        type="button"
        role="tab"
        aria-selected={activeTopic === null}
        onClick={() => selectTopic(null)}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
          activeTopic === null
            ? "border-sky-500 bg-sky-500 text-white"
            : "border-border/70 text-muted-foreground hover:border-sky-300 hover:text-foreground",
        )}
      >
        전체
      </button>
      {topics.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={activeTopic === t.value}
          onClick={() => selectTopic(t.value)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
            activeTopic === t.value
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-border/70 text-muted-foreground hover:border-sky-300 hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
