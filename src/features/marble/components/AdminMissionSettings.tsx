"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";

import {
  deleteMarbleMission,
  upsertMarbleMission,
} from "@/features/marble/actions/adminMarbleActions";
import { MARBLE_BOARD_SIZE, type BlueMarbleMissionRow } from "@/features/marble/types";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TILE_OPTIONS = Array.from({ length: MARBLE_BOARD_SIZE }, (_, i) => i);

export function AdminMissionSettings({ missions }: { missions: BlueMarbleMissionRow[] }) {
  const [tileIndex, setTileIndex] = useState("4");
  const [missionText, setMissionText] = useState("");
  const [saving, startSave] = useTransition();
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const onAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    startSave(async () => {
      const fd = new FormData();
      fd.set("tileIndex", tileIndex);
      fd.set("missionText", missionText.trim());

      const res = await upsertMarbleMission(fd);
      if (!res.ok) return toastError(res.message);
      toastSuccess(`${tileIndex}번 칸 미션을 저장했습니다.`);
      setMissionText("");
    });
  };

  const onDelete = (index: number) => {
    if (!window.confirm(`${index}번 칸의 미션(별)을 삭제할까요?`)) return;
    setDeletingIndex(index);
    startSave(async () => {
      const fd = new FormData();
      fd.set("tileIndex", String(index));

      const res = await deleteMarbleMission(fd);
      setDeletingIndex(null);
      if (!res.ok) return toastError(res.message);
      toastSuccess(`${index}번 칸 미션을 삭제했습니다.`);
    });
  };

  const onEditExisting = (mission: BlueMarbleMissionRow) => {
    setTileIndex(String(mission.tile_index));
    setMissionText(mission.mission_text);
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" fill="currentColor" />
        <h2 className="text-base font-semibold text-slate-800">🌟 미션 칸(별) 설정</h2>
      </div>
      <p className="mb-4 text-xs text-slate-600">
        원하는 칸(0~{MARBLE_BOARD_SIZE - 1})에 별 미션을 등록하면 보드판에 황금 별이 표시됩니다.
      </p>

      <form onSubmit={onAddOrUpdate} className="mb-5 space-y-3 rounded-xl border border-amber-100 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">칸 번호</span>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus-visible:border-amber-300 focus-visible:ring-3 focus-visible:ring-amber-100"
              value={tileIndex}
              onChange={(e) => setTileIndex(e.target.value)}
            >
              {TILE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}번 칸
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">미션 내용</span>
            <Input
              value={missionText}
              onChange={(e) => setMissionText(e.target.value)}
              placeholder="예: 다 함께 모여 단체 셀카 찍기!"
              required
            />
          </label>
        </div>
        <Button type="submit" size="sm" disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          미션 추가 / 수정
        </Button>
      </form>

      {missions.length === 0 ? (
        <p className="text-center text-xs text-slate-500">등록된 미션 칸이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {missions.map((mission) => (
            <li
              key={mission.tile_index}
              className="flex items-start gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2.5"
            >
              <span className="mt-0.5 shrink-0 text-sm">⭐</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-800">{mission.tile_index}번 칸</p>
                <p className="text-sm text-slate-700">{mission.mission_text}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEditExisting(mission)}
                  disabled={saving}
                >
                  수정
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(mission.tile_index)}
                  disabled={saving && deletingIndex === mission.tile_index}
                >
                  {saving && deletingIndex === mission.tile_index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
