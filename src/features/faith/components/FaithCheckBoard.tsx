"use client";

import { useTransition } from "react";

import { toggleFaithCheck } from "@/features/faith/actions/faithActions";
import type { FaithCheckType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

const CHECK_TYPES: Array<{ key: FaithCheckType; label: string }> = [
  { key: "qt", label: "큐티" },
  { key: "prayer", label: "기도" },
  { key: "bible", label: "말씀읽기" },
];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function last7Days() {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    return d;
  });
}

export function FaithCheckBoard({
  points,
  checksByDate,
}: {
  points: number;
  checksByDate: Record<string, FaithCheckType[]>;
}) {
  const [pending, startTransition] = useTransition();
  const days = last7Days();

  const onToggle = (checkDate: string, checkType: FaithCheckType) => {
    startTransition(async () => {
      const res = await toggleFaithCheck({ checkDate, checkType });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess();
    });
  };

  return (
    <Card className="border-border/70 shadow-sm ring-1 ring-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">신앙 점검표 · 내 포인트 {points}P</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {days.map((date) => {
          const key = formatDate(date);
          const checked = new Set(checksByDate[key] ?? []);
          return (
            <div key={key} className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{key}</p>
              <div className="flex flex-wrap gap-2">
                {CHECK_TYPES.map((item) => {
                  const active = checked.has(item.key);
                  return (
                    <Button
                      key={item.key}
                      type="button"
                      variant="outline"
                      disabled={pending}
                      className={cn(active && "border-indigo-500/50 bg-indigo-500/10")}
                      onClick={() => onToggle(key, item.key)}
                    >
                      {item.label} {active ? "완료" : "+10P"}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
