"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Rocket, Save, UserRound } from "lucide-react";

import {
  applyAllPendingMoves,
  updateMarbleFace,
  updateMarblePending,
} from "@/features/marble/actions/adminMarbleActions";
import {
  normalizePosition,
  tokenColorForIndex,
  type BlueMarbleRow,
} from "@/features/marble/types";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";

export function AdminMarbleManager({ teams }: { teams: BlueMarbleRow[] }) {
  const router = useRouter();
  const [applying, startApply] = useTransition();

  const pendingCount = useMemo(
    () => teams.filter((t) => t.pending_score !== 0 || t.pending_move !== 0).length,
    [teams],
  );

  const onApplyAll = () => {
    if (pendingCount === 0) {
      toastError("반영할 대기 항목이 없습니다. 먼저 목장별 대기 점수/칸 수를 입력해 주세요.");
      return;
    }
    if (
      !window.confirm(
        `대기 중인 ${pendingCount}개 목장의 결과를 한 번에 반영합니다.\n반영 후 대기 값은 0으로 초기화되며, 화면의 말들이 즉시 이동합니다. 진행할까요?`,
      )
    ) {
      return;
    }
    startApply(async () => {
      const res = await applyAllPendingMoves();
      if (!res.ok) return toastError(res.message);
      toastSuccess("주간 결과를 일괄 반영했습니다. 보드판이 움직입니다!");
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
      {/* 일괄 반영 히어로 버튼 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">주간 결과 일괄 반영</p>
          <p className="mt-0.5 text-xs text-slate-500">
            현재 대기 중인 목장:{" "}
            <span className="font-semibold text-sky-600">{pendingCount}개</span>
            {" "}· 버튼을 누르면 모든 말이 동시에 이동합니다.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={onApplyAll}
          disabled={applying}
          className="h-12 shrink-0 bg-sky-600 px-6 text-base font-bold hover:bg-sky-700"
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
          <MarbleTeamCard key={team.id} team={team} colorIndex={index} />
        ))}
      </div>
    </div>
  );
}

function MarbleTeamCard({ team, colorIndex }: { team: BlueMarbleRow; colorIndex: number }) {
  const [pendingScore, setPendingScore] = useState(String(team.pending_score));
  const [pendingMove, setPendingMove] = useState(String(team.pending_move));
  const [savingPending, startPendingSave] = useTransition();
  const [uploading, startUpload] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 일괄 반영/외부 갱신으로 DB 값이 바뀌면 입력값 동기화
  useEffect(() => {
    setPendingScore(String(team.pending_score));
    setPendingMove(String(team.pending_move));
  }, [team.pending_score, team.pending_move]);

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

  // 반영 시 예상 결과 미리보기
  const previewScore = Math.max(0, team.score + (Number(pendingScore) || 0));
  const previewPosition = normalizePosition(team.position + (Number(pendingMove) || 0));

  const onSavePending = (e: React.FormEvent) => {
    e.preventDefault();
    startPendingSave(async () => {
      const fd = new FormData();
      fd.set("id", team.id);
      fd.set("pendingScore", pendingScore.trim() || "0");
      fd.set("pendingMove", pendingMove.trim() || "0");

      const res = await updateMarblePending(fd);
      if (!res.ok) return toastError(res.message);
      toastSuccess(`${team.team_name} 대기 값을 저장했습니다.`);
    });
  };

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
          {/* 현재 값은 읽기 전용(참고용) */}
          <p className="text-xs text-slate-500">
            현재 <span className="font-semibold text-slate-700">{team.score}점</span> ·{" "}
            <span className="font-semibold text-slate-700">{team.position}칸</span>
          </p>
        </div>
      </div>

      <form onSubmit={onSavePending} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">이번 주 추가 점수</span>
            <Input
              type="number"
              inputMode="numeric"
              value={pendingScore}
              onChange={(e) => setPendingScore(e.target.value)}
              placeholder="예: 50 / -10"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">이번 주 이동 칸 수</span>
            <Input
              type="number"
              inputMode="numeric"
              value={pendingMove}
              onChange={(e) => setPendingMove(e.target.value)}
              placeholder="예: 3 / -1"
            />
          </label>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          반영 시 예상:{" "}
          <span className="font-semibold text-sky-600">{previewScore}점</span> ·{" "}
          <span className="font-semibold text-sky-600">{previewPosition}칸</span>
        </p>

        <Button type="submit" size="sm" disabled={savingPending} className="w-full">
          {savingPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          대기 값 저장
        </Button>
      </form>

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
