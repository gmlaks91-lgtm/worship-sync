"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InteractiveSheetMarker = {
  id: string;
  type: "chord" | "form";
  value: string;
  x: number; // 0..1 relative position
  y: number; // 0..1 relative position
};

type InteractiveSheetMusicEditorProps = {
  imageUrl: string;
  initialMarkers?: InteractiveSheetMarker[];
  initialSequence?: string;
};

type MarkerEditorState = {
  isOpen: boolean;
  left: number;
  top: number;
  mode: "chord" | "form";
  value: string;
  editingId: string | null;
};

const COMMON_CHORDS = ["A", "Am", "Amaj7", "A7", "C", "Cm", "C#m7", "G", "G7", "F", "Dm", "Em"];
const FORM_MARKERS = ["A", "B", "C", "V", "Bridge", "Intro", "Outro"];

export function InteractiveSheetMusicEditor({
  imageUrl,
  initialMarkers = [],
  initialSequence = "",
}: InteractiveSheetMusicEditorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [markers, setMarkers] = useState<InteractiveSheetMarker[]>(initialMarkers);
  const [sequenceText, setSequenceText] = useState(initialSequence);
  const [sequenceEditing, setSequenceEditing] = useState(false);
  const [markerEditor, setMarkerEditor] = useState<MarkerEditorState | null>(null);

  const markerCount = markers.length;
  const markerLabel = useMemo(
    () => (markerEditor?.mode === "form" ? "송폼 마커" : "코드 입력"),
    [markerEditor],
  );

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);

    setMarkerEditor({
      isOpen: true,
      left: x,
      top: y,
      mode: "chord",
      value: "",
      editingId: null,
    });
  };

  const handleMarkerClick = (marker: InteractiveSheetMarker, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMarkerEditor({
      isOpen: true,
      left: marker.x,
      top: marker.y,
      mode: marker.type,
      value: marker.value,
      editingId: marker.id,
    });
  };

  const handleSaveMarker = () => {
    if (!markerEditor) return;
    const payload: InteractiveSheetMarker = {
      id: markerEditor.editingId ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      type: markerEditor.mode,
      value: markerEditor.value.trim() || (markerEditor.mode === "chord" ? "N.C." : "-"),
      x: markerEditor.left,
      y: markerEditor.top,
    };

    setMarkers((current) => {
      if (markerEditor.editingId) {
        return current.map((item) => (item.id === payload.id ? payload : item));
      }
      return [...current, payload];
    });
    setMarkerEditor(null);
  };

  const handleDeleteMarker = () => {
    if (!markerEditor?.editingId) {
      setMarkerEditor(null);
      return;
    }
    setMarkers((current) => current.filter((item) => item.id !== markerEditor.editingId));
    setMarkerEditor(null);
  };

  const handleSequenceClick = () => {
    setSequenceEditing(true);
  };

  const closeMarkerEditor = () => {
    setMarkerEditor(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">인터랙티브 악보 에디터</p>
          <h1 className="text-2xl font-semibold tracking-tight">악보 위에 코드와 송폼 마커를 직접 배치하세요</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            악보 이미지를 클릭하면 해당 위치에 코드 또는 구조 마커를 추가할 수 있습니다. 위/아래 여백을 클릭하면 전체 진행 순서를 입력할 수 있습니다.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">현재 저장 정보</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt>마커 개수</dt>
              <dd>{markerCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>진행 순서</dt>
              <dd className="max-w-[12rem] truncate">{sequenceText || "아직 입력되지 않음"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-muted/10 p-3">
        <div
          className="group mb-3 overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm"
        >
          <button
            type="button"
            onClick={handleSequenceClick}
            className={cn(
              "flex min-h-[3.5rem] w-full items-center justify-center border-b border-border/60 bg-slate-50 text-sm font-medium text-slate-700 transition hover:bg-slate-100",
              sequenceEditing && "bg-slate-100",
            )}
          >
            {sequenceEditing ? "진행 순서를 입력하세요" : sequenceText ? `진행 순서: ${sequenceText}` : "위쪽 여백을 클릭해 진행 순서를 입력하세요"}
          </button>
          <div className="relative min-h-[60vh] w-full bg-black/5">
            <div
              ref={wrapperRef}
              className="relative h-full w-full cursor-crosshair"
              onClick={handleImageClick}
            >
              <img
                src={imageUrl}
                alt="악보 이미지"
                className="pointer-events-none h-full w-full object-contain"
                draggable={false}
              />

              {markers.map((marker) => (
                <button
                  key={marker.id}
                  type="button"
                  className={cn(
                    "absolute z-10 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition",
                    marker.type === "chord"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-emerald-500 bg-emerald-50 text-emerald-700",
                  )}
                  style={{
                    left: `${marker.x * 100}%`,
                    top: `${marker.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={(event) => handleMarkerClick(marker, event)}
                >
                  {marker.value}
                </button>
              ))}

              {markerEditor?.isOpen ? (
                <div
                  className="absolute z-20 max-w-xs rounded-3xl border border-border/80 bg-white p-4 shadow-xl"
                  style={{
                    left: `${markerEditor.left * 100}%`,
                    top: `${markerEditor.top * 100}%`,
                    transform: "translate(-50%, -100%)",
                    minWidth: 240,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {markerLabel}
                    </div>
                    <button
                      type="button"
                      onClick={closeMarkerEditor}
                      className="rounded-full border border-border/80 px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                    >
                      닫기
                    </button>
                  </div>

                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition",
                        markerEditor.mode === "chord"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-white text-slate-700",
                      )}
                      onClick={() => setMarkerEditor((prev) => prev && { ...prev, mode: "chord", value: prev.editingId ? prev.value : "" })}
                    >
                      코드
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition",
                        markerEditor.mode === "form"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-border bg-white text-slate-700",
                      )}
                      onClick={() => setMarkerEditor((prev) => prev && { ...prev, mode: "form", value: prev.editingId ? prev.value : "" })}
                    >
                      송폼
                    </button>
                  </div>

                  <div className="space-y-3">
                    {markerEditor.mode === "chord" ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">코드 입력</label>
                        <input
                          type="text"
                          value={markerEditor.value}
                          onChange={(event) => setMarkerEditor((prev) => prev && { ...prev, value: event.target.value })}
                          placeholder="A, C#m7, G7 등"
                          className="w-full rounded-2xl border border-border/70 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex flex-wrap gap-2">
                          {COMMON_CHORDS.map((code) => (
                            <button
                              key={code}
                              type="button"
                              className="rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] text-slate-700 transition hover:border-primary hover:text-primary"
                              onClick={() => setMarkerEditor((prev) => prev && { ...prev, value: code })}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">송폼 마커</label>
                        <div className="flex flex-wrap gap-2">
                          {FORM_MARKERS.map((section) => (
                            <button
                              key={section}
                              type="button"
                              className="rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
                              onClick={() => setMarkerEditor((prev) => prev && { ...prev, value: section })}
                            >
                              {section}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={handleSaveMarker}>
                        저장
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={handleDeleteMarker}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSequenceClick}
            className={cn(
              "flex min-h-[3.5rem] w-full items-center justify-center border-t border-border/60 bg-slate-50 text-sm font-medium text-slate-700 transition hover:bg-slate-100",
              sequenceEditing && "bg-slate-100",
            )}
          >
            {sequenceEditing ? "아래 여백에서 진행 순서를 입력하세요" : sequenceText ? `진행 순서: ${sequenceText}` : "아래 여백을 클릭해 진행 순서를 입력하세요"}
          </button>
        </div>
      </div>

      {sequenceEditing ? (
        <div className="rounded-3xl border border-border/60 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">곡 진행 순서</p>
              <p className="text-xs text-muted-foreground">예: A-C-B-(8)</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground hover:bg-muted/50"
              onClick={() => setSequenceEditing(false)}
            >
              닫기
            </button>
          </div>
          <textarea
            value={sequenceText}
            onChange={(event) => setSequenceText(event.target.value)}
            className="mt-4 min-h-[6rem] w-full resize-none rounded-3xl border border-border/70 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="A-C-B-(8)"
          />
        </div>
      ) : null}
    </div>
  );
}
