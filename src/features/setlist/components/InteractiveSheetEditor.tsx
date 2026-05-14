"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInteractiveSheet } from "@/features/setlist/hooks/useInteractiveSheet";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type InteractiveSheetEditorProps = {
  title: string;
  imageUrl: string;
};

const STRUCTURE_MARKERS = ["A", "B", "C", "V", "P"] as const;

export function InteractiveSheetEditor({ title, imageUrl }: InteractiveSheetEditorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const {
    markers,
    popupPosition,
    selectedTab,
    draftValue,
    sequenceTop,
    sequenceBottom,
    isEditing,
    selectedMarkerId,
    handleCanvasClick,
    handleMarkerClick,
    handleSaveMarker,
    handleDeleteMarker,
    closeEditor,
    setSelectedTab,
    setDraftValue,
    setSequenceTop,
    setSequenceBottom,
    addMarkers,
  } = useInteractiveSheet();

  const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url.trim());
  const isValidUrlString = (url: unknown): url is string => typeof url === "string" && url.trim().length > 0;

  const resolveAbsoluteImageUrl = async (rawUrl: string) => {
    const trimmedUrl = rawUrl.trim();
    if (isAbsoluteUrl(trimmedUrl)) {
      return trimmedUrl;
    }

    try {
      const supabase = createClient();
      const safePath = trimmedUrl.replace(/^\/+/, "");
      const { data, error } = await supabase.storage.from("sheets").getPublicUrl(safePath);
      if (error || !data?.publicUrl) {
        return null;
      }
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!isValidUrlString(imageUrl)) {
      toastError("유효한 악보 이미지 주소가 아닙니다.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const absoluteImageUrl = await resolveAbsoluteImageUrl(imageUrl);
      if (!absoluteImageUrl) {
        toastError("유효한 악보 이미지 주소가 아닙니다.");
        return;
      }

      const response = await fetch("/api/analyze-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: absoluteImageUrl }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message ?? "AI 자동 분석에 실패했습니다.");
      }

      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("AI가 유효한 코드 마커를 찾지 못했습니다.");
      }

      const chordMarkers = result
        .map((marker) => {
          if (
            !marker ||
            typeof marker !== "object" ||
            typeof marker.text !== "string" ||
            typeof marker.x !== "number" ||
            typeof marker.y !== "number"
          ) {
            return null;
          }

          return {
            id: crypto.randomUUID(),
            type: "chord" as const,
            value: marker.text.trim(),
            x: Math.min(100, Math.max(0, marker.x)),
            y: Math.min(100, Math.max(0, marker.y)),
          };
        })
        .filter(Boolean);

      if (chordMarkers.length === 0) {
        throw new Error("AI 분석 결과로 유효한 코드 마커가 없습니다.");
      }

      addMarkers(chordMarkers as Array<{
        id: string;
        type: "chord";
        value: string;
        x: number;
        y: number;
      }>);
      toastSuccess("AI 자동 분석이 완료되었습니다.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const markerFormLabel = selectedTab === "chord" ? "코드 입력" : "송폼 선택";

  return (
    <section className="rounded-3xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">인터랙티브 악보 에디터</p>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2Icon className="mr-2 h-3.5 w-3.5 animate-spin" />
                  분석 중...
                </>
              ) : (
                "✨ AI 자동 분석 (무료)"
              )}
            </Button>
            <p className="rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              악보 위를 탭하거나 마커를 클릭해 추가/수정하세요.
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.5rem] border border-border/60 bg-slate-950/5 shadow-sm">
        <div className="absolute inset-x-0 top-0 z-10 border-b border-border/60 bg-background/95 p-3 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">상단 진행 순서</p>
              <p className="text-[11px] text-muted-foreground">Top</p>
            </div>
            <Input
              value={sequenceTop}
              onChange={(event) => setSequenceTop(event.target.value)}
              placeholder="A - C - B - V"
              className="w-full"
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/60 bg-background/95 p-3 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">하단 진행 순서</p>
              <p className="text-[11px] text-muted-foreground">Bottom</p>
            </div>
            <Input
              value={sequenceBottom}
              onChange={(event) => setSequenceBottom(event.target.value)}
              placeholder="A - C - B - V"
              className="w-full"
            />
          </div>
        </div>

        <div className="relative h-[28rem] min-h-[28rem]">
          <img
            src={imageUrl}
            alt={`${title} 악보 이미지`}
            className="h-full w-full object-contain"
            draggable={false}
          />

          <button
            type="button"
            className="absolute inset-0 cursor-crosshair bg-transparent"
            onClick={(event) => {
              const target = event.currentTarget.parentElement;
              if (!target) return;
              const rect = target.getBoundingClientRect();
              const x = Math.min(98, Math.max(2, ((event.clientX - rect.left) / rect.width) * 100));
              const y = Math.min(98, Math.max(2, ((event.clientY - rect.top) / rect.height) * 100));
              handleCanvasClick(x, y);
            }}
            aria-label="악보 위에 마커 추가"
          />

          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleMarkerClick(marker);
              }}
              className={cn(
                "absolute z-20 inline-flex items-center gap-1 rounded-full border border-border/70 bg-amber-500/95 px-2 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-black/10 transition hover:scale-105",
              )}
              style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -110%)" }}
            >
              {marker.type === "chord" ? "🎵" : "⚑"}
              <span>{marker.value}</span>
            </button>
          ))}

          {isEditing && popupPosition ? (
            <div
              className="absolute z-30 min-w-[18rem] max-w-xs rounded-3xl border border-border/80 bg-popover p-4 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.8)]"
              style={{ left: `${popupPosition.x}%`, top: `${popupPosition.y}%`, transform: "translate(-50%, -115%)" }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{markerFormLabel}</p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={closeEditor}
                >
                  닫기
                </button>
              </div>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="mb-3 bg-muted/10 p-1">
                  <TabsTrigger value="chord">코드</TabsTrigger>
                  <TabsTrigger value="structure">송폼</TabsTrigger>
                </TabsList>
                <TabsContent value="chord">
                  <div className="space-y-2">
                    <Input
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      placeholder="F#m, Bm7 등"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="structure">
                  <div className="grid grid-cols-5 gap-2">
                    {STRUCTURE_MARKERS.map((structure) => (
                      <Button
                        key={structure}
                        type="button"
                        variant={draftValue === structure ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedTab("structure");
                          setDraftValue(structure);
                        }}
                      >
                        {structure}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button type="button" onClick={handleSaveMarker} className="flex-1">
                  저장
                </Button>
                {selectedTab && draftValue.length > 0 ? (
                  <Button type="button" variant="outline" onClick={closeEditor}>
                    취소
                  </Button>
                ) : null}
                {selectedMarkerId ? (
                  <Button type="button" variant="destructive" onClick={handleDeleteMarker}>
                    삭제
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
