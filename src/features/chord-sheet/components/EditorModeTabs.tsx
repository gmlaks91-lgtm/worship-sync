"use client";

import { BookText, Grip } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ChordEditorMode = "lyrics" | "parts";

const MODE_ITEMS: Array<{
  value: ChordEditorMode;
  label: string;
  description: string;
  icon: typeof BookText;
}> = [
  { value: "lyrics", label: "가사 텍스트", description: "메모장처럼 가사만 집중", icon: BookText },
  { value: "parts", label: "파트 지정", description: "파트 구조와 진행 순서 설정", icon: Grip },
];

type EditorModeTabsProps = {
  value: ChordEditorMode;
  onValueChange: (value: ChordEditorMode) => void;
  canEditParts?: boolean;
};

export function EditorModeTabs({ value, onValueChange, canEditParts = true }: EditorModeTabsProps) {
  const items = MODE_ITEMS.map((item) =>
    item.value === "parts" && !canEditParts
      ? { ...item, label: "진행 순서", description: "저장된 순서를 읽기 전용으로 확인" }
      : item,
  );

  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as ChordEditorMode)}>
      <TabsList variant="default" className="grid w-full grid-cols-3 rounded-2xl bg-neutral-100 p-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="h-auto min-h-14 rounded-xl border-transparent px-3 py-3 data-active:border-neutral-200 data-active:bg-white data-active:shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden />
                <span className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold text-neutral-900">{item.label}</span>
                  <span className="text-[11px] text-neutral-500">{item.description}</span>
                </span>
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
