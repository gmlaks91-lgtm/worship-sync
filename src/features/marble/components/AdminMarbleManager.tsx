"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Rocket, UserRound } from "lucide-react";

import {
  applyMarbleScoreDeltas,
  updateMarbleFace,
} from "@/features/marble/actions/adminMarbleActions";
import { parsePendingScoreInput, previewPendingScore } from "@/features/marble/lib/parse-pending-score";
import { AdminMissionSettings } from "@/features/marble/components/AdminMissionSettings";
import {
  MARBLE_POINTS_PER_TILE,
  pendingMoveFromScore,
  positionFromScore,
  tokenColorForIndex,
  type BlueMarbleMissionRow,
  type BlueMarbleRow,
} from "@/features/marble/types";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";

function emptyScoresForTeams(teams: BlueMarbleRow[]) {
  return Object.fromEntries(teams.map((team) => [team.id, ""]));
}

export function AdminMarbleManager({
  teams,
  missions,
}: {
  teams: BlueMarbleRow[];
  missions: BlueMarbleMissionRow[];
}) {
  const router = useRouter();
  const [applying, startApply] = useTransition();
  const [addedScores, setAddedScores] = useState<Record<string, string>>(() => emptyScoresForTeams(teams));

  useEffect(() => {
    setAddedScores(emptyScoresForTeams(teams));
  }, [teams]);

  const onApplyScores = () => {
    if (
      !window.confirm(
        "입력한 점수를 모든 목장에 즉시 반영합니다.\n50점 = 1칸 룰에 따라 말이 자동으로 이동합니다. 진행할까요?",
      )
    ) {
      return;
    }

    const deltas: Array<{ id: string; delta: number }> = [];
    for (const team of teams) {
      const raw = addedScores[team.id] ?? "";
      const parsed = parsePendingScoreInput(raw);
      if (!parsed.ok) {
        toastError(`${team.team_name}: ${parsed.message}`);
        return;
      }
      if (parsed.value !== 0) {
        deltas.push({ id: team.id, delta: parsed.value });
      }
    }

    if (deltas.length === 0) {
      toastError("반영할 점수 변경이 없습니다. 추가 점수를 입력해 주세요.");
      return;
    }

    startApply(async () => {
      const res = await applyMarbleScoreDeltas({ deltas });
      if (!res.ok) return toastError(res.message);
      toastSuccess("주간 결과를 일괄 반영했습니다. 보드판이 움직입니다!");
      setAddedScores(emptyScoresForTeams(teams));
      router.refresh();
    });
  };

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
        목장 데이터가 없습니다. 마이그레이션의 초기 데이터(Seed)가 적용되었는지 확인해 주세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">주간 결과 일괄 반영</p>
            <p className="mt-0.5 text-xs text-slate-500">
              목장 {teams.length}개 · {MARBLE_POINTS_PER_TILE}점 = 1칸 자동 이동 · 빈칸은 0점
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={applying}
            className="h-12 shrink-0 bg-sky-600 px-6 text-base font-bold hover:bg-sky-700"
            onClick={onApplyScores}
          >
            {applying ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-5 w-5" />
            )}
            🚀 주간 결과 일괄 반영하기
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team, index) => (
            <MarbleTeamCard
              key={team.id}
              team={team}
              colorIndex={index}
              addedScore={addedScores[team.id] ?? ""}
              onAddedScoreChange={(value) =>
                setAddedScores((current) => ({ ...current, [team.id]: value }))
              }
            />
          ))}
        </div>
      </div>

      <AdminMissionSettings missions={missions} />
    </div>
  );
}

function MarbleTeamCard({
  team,
  colorIndex,
  addedScore,
  onAddedScoreChange,
}: {
  team: BlueMarbleRow;
  colorIndex: number;
  addedScore: string;
  onAddedScoreChange: (value: string) => void;
}) {
  const [uploading, startUpload] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const tokenColor = tokenColorForIndex(colorIndex);
  const displayImage = previewUrl ?? team.image_url;

  const parsedAdded = previewPendingScore(addedScore);
  const currentPosition = positionFromScore(team.score);
  const previewScore = Math.max(0, team.score + parsedAdded);
  const previewPosition = positionFromScore(previewScore);
  const autoMoveTiles = pendingMoveFromScore(parsedAdded);

  const onUpload = () => {
    if (!pendingFile) {
      toastError("먼저 이미지를 선택해 주세요.");
      return;
    }
    startUpload(async () => {
      const fd = new FormData();
      fd.set("id", team.id);
      fd.set("image", pendingFile);

      const res = await updateMarbleFace(fd);
      if (!res.ok) return toastError(res.message);
      toastSuccess(`${team.team_name} 얼굴 이미지를 업데이트했습니다.`);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white shadow"
          style={{ backgroundColor: tokenColor }}
        >
          {displayImage ? (
            <RemoteImage
              src={displayImage}
              alt={`${team.team_name} 얼굴`}
              fill
              variant="profile"
              className="object-cover"
            />
          ) : (
            <UserRound className="h-6 w-6 text-white/90" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-800">{team.team_name}</p>
          <p className="text-xs text-slate-500">
            현재 <span className="font-semibold text-slate-700">{team.score}점</span> ·{" "}
            <span className="font-semibold text-slate-700">{currentPosition}칸</span>
            <span className="text-slate-400"> (50점당 1칸 자동)</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-600">이번 주 추가 점수</span>
          <Input
            type="text"
            inputMode="numeric"
            value={addedScore}
            onChange={(e) => onAddedScoreChange(e.target.value)}
            placeholder="비워두면 0점"
          />
          <p className="text-[10px] text-slate-400">마이너스(-) 입력으로 점수 차감도 가능합니다.</p>
        </label>

        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          <p>
            예상 추가 이동:{" "}
            <span className="font-bold text-amber-700">
              {autoMoveTiles >= 0 ? "+" : ""}
              {autoMoveTiles}칸
            </span>
            <span className="text-amber-700/70"> ({MARBLE_POINTS_PER_TILE}점 = 1칸)</span>
          </p>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          반영 시 예상:{" "}
          <span className="font-semibold text-sky-600">{previewScore}점</span> ·{" "}
          <span className="font-semibold text-sky-600">{previewPosition}칸</span>
        </p>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            이미지 선택
          </Button>
          <Button type="button" size="sm" onClick={onUpload} disabled={uploading || !pendingFile}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            얼굴 업로드
          </Button>
        </div>
        {pendingFile ? (
          <p className="truncate text-xs text-slate-500">선택됨: {pendingFile.name}</p>
        ) : (
          <p className="text-xs text-slate-400">PNG·JPEG·WEBP·GIF / 최대 5MB</p>
        )}
      </div>
    </article>
  );
}
