"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import type { ParsedScheduleResult } from "@/features/schedule/lib/parsed-schedule-schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/app-toast";

type ScheduleAiPastePanelProps = {
  onParsed: (data: ParsedScheduleResult) => void;
  className?: string;
};

export function ScheduleAiPastePanel({ onParsed, className }: ScheduleAiPastePanelProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      toastError("카카오톡 공지 텍스트를 붙여넣어 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        data?: ParsedScheduleResult;
      };

      if (!res.ok || !json.ok || !json.data) {
        toastError(json.message ?? "텍스트 분석에 실패했습니다.");
        return;
      }

      onParsed(json.data);
      toastSuccess("AI가 폼을 채웠습니다. 내용을 확인한 뒤 저장하세요.");
    } catch {
      toastError("네트워크 오류로 분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const parseButton = (
    <Button type="button" size="sm" onClick={handleParse} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          분석 중...
        </>
      ) : (
        "분석하여 채우기"
      )}
    </Button>
  );

  return (
    <section
      className={cn(
        "rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-indigo-50/50 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-indigo-950/20",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <AiPasteHeader open={open} onToggle={() => setOpen((v) => !v)} parseButton={parseButton} />
      </div>
      {open ? (
        <div className="space-y-3 border-t border-violet-200/60 px-4 pb-4 pt-3 dark:border-violet-900/40 sm:px-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="카카오톡에 올린 찬양팀 일정 공지를 그대로 붙여넣으세요..."
            rows={10}
            className={cn(
              "w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed",
              "outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            날짜·곡 제목·유튜브 링크·역할별 이름을 추출합니다. 이름이 팀원 목록과 다르면 수동으로
            선택해 주세요.
          </p>
          <div className="flex justify-end sm:hidden">{parseButton}</div>
        </div>
      ) : null}
    </section>
  );
}

function AiPasteHeader({
  open,
  onToggle,
  parseButton,
}: {
  open: boolean;
  onToggle: () => void;
  parseButton: React.ReactNode;
}) {
  return (
    <>
      <div className="space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-violet-950 dark:text-violet-100">
          <Sparkles className="size-4 text-violet-600" aria-hidden />
          AI 텍스트 붙여넣기
        </p>
        <p className="text-xs text-muted-foreground">
          카카오톡 일정 공지를 붙여넣으면 날짜·곡·라인업이 자동으로 채워집니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onToggle}>
          {open ? "접기" : "AI 텍스트 붙여넣기"}
        </Button>
        {open ? <div className="hidden sm:block">{parseButton}</div> : null}
      </div>
    </>
  );
}
