"use client";

import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

type LyricsTextModePanelProps = {
  value: string;
  disabled?: boolean;
  pending?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function LyricsTextModePanel({
  value,
  disabled,
  pending,
  onChange,
  onSave,
}: LyricsTextModePanelProps) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-100/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-neutral-900">가사 텍스트 모드</p>
          <p className="mt-1 text-sm text-neutral-500">
            전체 가사를 메모장처럼 이어서 수정합니다. 파트 경계 조정은 다음 단계인 파트 지정 모드에서 진행하세요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 border-neutral-300 text-neutral-800"
          disabled={disabled || pending}
          onClick={onSave}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          가사 저장
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3">
        <textarea
          value={value}
          disabled={disabled || pending}
          onChange={(event) => onChange(event.target.value)}
          rows={20}
          className="min-h-[26rem] w-full resize-y rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm leading-7 text-neutral-900 outline-none transition focus-visible:border-neutral-400"
          placeholder="가사를 줄 단위로 입력하세요."
        />
      </div>
    </section>
  );
}
