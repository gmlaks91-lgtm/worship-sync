"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Save, UserRound } from "lucide-react";

import { updateMarbleFace, updateMarbleTeam } from "@/features/marble/actions/adminMarbleActions";
import { MARBLE_BOARD_SIZE, tokenColorForIndex, type BlueMarbleRow } from "@/features/marble/types";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RemoteImage } from "@/components/ui/remote-image";

export function AdminMarbleManager({ teams }: { teams: BlueMarbleRow[] }) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
        목장 데이터가 없습니다. 마이그레이션의 초기 데이터(Seed)가 적용되었는지 확인해 주세요.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teams.map((team, index) => (
        <MarbleTeamCard key={team.id} team={team} colorIndex={index} />
      ))}
    </div>
  );
}

function MarbleTeamCard({ team, colorIndex }: { team: BlueMarbleRow; colorIndex: number }) {
  const [score, setScore] = useState(String(team.score));
  const [position, setPosition] = useState(String(team.position));
  const [savingScore, startScoreSave] = useTransition();
  const [uploading, startUpload] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // DB 값이 외부에서(다른 저장/재검증) 갱신되면 입력값도 동기화
  useEffect(() => {
    setScore(String(team.score));
    setPosition(String(team.position));
  }, [team.score, team.position]);

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

  const onSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    startScoreSave(async () => {
      const fd = new FormData();
      fd.set("id", team.id);
      fd.set("score", score.trim());
      fd.set("position", position.trim());

      const res = await updateMarbleTeam(fd);
      if (!res.ok) return toastError(res.message);
      toastSuccess(`${team.team_name} 점수/위치를 저장했습니다.`);
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
          <p className="text-xs text-slate-400">현재 {team.score}점 · {team.position}칸</p>
        </div>
      </div>

      <form onSubmit={onSaveScore} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">점수</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              위치 (0~{MARBLE_BOARD_SIZE - 1}칸)
            </span>
            <Input
              type="number"
              min={0}
              max={MARBLE_BOARD_SIZE - 1}
              inputMode="numeric"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </label>
        </div>
        <Button type="submit" size="sm" disabled={savingScore} className="w-full">
          {savingScore ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          점수·위치 저장
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
