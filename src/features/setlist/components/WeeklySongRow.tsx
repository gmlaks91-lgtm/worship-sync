"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, FileMusic, Loader2, Play, Trash2 } from "lucide-react";

import type { SetlistSongWithSheet } from "@/features/setlist/types";
import { useSetlistStore } from "@/features/setlist/store/useSetlistStore";
import { getYoutubeThumbnailUrl, getYoutubeVideoId } from "@/features/setlist/utils/youtube";
import {
  movePrepSetlistSong,
  removeTrackFromPrepSetlist,
  updateSongInPrepSetlist,
} from "@/features/setlist/actions/weeklySetlistActions";
import { uploadSheetFromClient } from "@/features/sheets/lib/upload-sheet-images-stable";
import { SheetViewerDialog } from "@/features/sheets/components/SheetViewerDialog";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WeeklySongRowProps = {
  setlistId: string;
  song: SetlistSongWithSheet;
  index: number;
  total: number;
  canManage: boolean;
};

export function WeeklySongRow({ setlistId, song, index, total, canManage }: WeeklySongRowProps) {
  const router = useRouter();
  const playSong = useSetlistStore((s) => s.playSong);
  const currentId = useSetlistStore((s) => s.current?.songId);
  const [pending, start] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [title, setTitle] = useState(song.title);
  const [youtubeUrl, setYoutubeUrl] = useState(song.youtube_url ?? "");

  const videoId = getYoutubeVideoId(song.youtube_url);
  const thumb = videoId ? getYoutubeThumbnailUrl(videoId) : null;
  const isPlaying = currentId === song.id;
  const sheet = song.sheet;

  const saveMeta = () => {
    start(async () => {
      const res = await updateSongInPrepSetlist({
        setlistId,
        songId: song.id,
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
      });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess("곡 정보를 저장했습니다.");
      router.refresh();
    });
  };

  const onRemove = () => {
    if (!confirm("이 송리스트에서 곡을 제거할까요? (곡 자체는 삭제되지 않습니다.)")) return;
    start(async () => {
      const res = await removeTrackFromPrepSetlist({ setlistId, songId: song.id });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess("곡을 제거했습니다.");
      router.refresh();
    });
  };

  const onMove = (direction: "up" | "down") => {
    start(async () => {
      const res = await movePrepSetlistSong({ setlistId, songId: song.id, direction });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      router.refresh();
    });
  };

  const onUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setUploadBusy(true);
    try {
      await uploadSheetFromClient(song.id, list, null);
      toastSuccess(`악보 ${list.length}장을 등록했습니다.`);
      e.target.value = "";
      setUploadOpen(false);
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <li
      className={`rounded-2xl border border-neutral-200 bg-white px-4 py-4 sm:px-5 sm:py-5 ${
        isPlaying ? "ring-2 ring-neutral-900/10" : ""
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-neutral-100 lg:h-[88px] lg:w-[140px] lg:aspect-auto">
          {thumb ? (
            <Image src={thumb} alt="" fill className="object-cover" sizes="140px" />
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-neutral-400 lg:min-h-0">
              미리보기 없음
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-100 px-2 text-xs font-semibold text-neutral-600">
              {index + 1}
            </span>
            {canManage ? (
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 border-neutral-200 bg-white text-neutral-900"
                  placeholder="곡 제목"
                />
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="h-10 border-neutral-200 bg-white text-neutral-900"
                  placeholder="YouTube URL"
                />
              </div>
            ) : (
              <div>
                <p className="text-base font-semibold text-neutral-900">{song.title}</p>
                <p className="truncate text-xs text-neutral-500">{song.youtube_url ?? ""}</p>
              </div>
            )}
          </div>

          {sheet?.image_urls?.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sheet.image_urls.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                >
                  <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">등록된 악보 이미지가 없습니다.</p>
          )}

          {sheet ? (
            <SheetViewerDialog
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              songId={song.id}
              songTitle={song.title}
              fileUrls={sheet.image_urls}
              memo={sheet.memo}
            />
          ) : null}

          {uploadOpen ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
              <p className="mb-2 text-xs font-medium text-neutral-600">악보 이미지 (여러 장 선택 가능 · 순서대로 저장)</p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  disabled={uploadBusy}
                  className="max-w-xs border-neutral-200 bg-white text-sm file:mr-2"
                  onChange={onUploadFiles}
                />
                {uploadBusy ? (
                  <span className="inline-flex items-center gap-2 text-xs text-neutral-500">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    업로드 중…
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:w-48 lg:flex-col">
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-neutral-900 text-white hover:bg-neutral-800 lg:flex-none"
            disabled={!getYoutubeVideoId(youtubeUrl || song.youtube_url)}
            onClick={() =>
              playSong({
                songId: song.id,
                title: title.trim() || song.title,
                youtubeUrl: youtubeUrl.trim() || song.youtube_url || "",
              })
            }
          >
            <Play className="mr-1.5 size-4" aria-hidden />
            재생
          </Button>
          {sheet ? (
            <Button type="button" variant="outline" size="sm" className="flex-1 border-neutral-200 lg:flex-none" onClick={() => setSheetOpen(true)}>
              <FileMusic className="mr-1.5 size-4" aria-hidden />
              악보
            </Button>
          ) : null}
          {canManage ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-neutral-200 lg:flex-none"
                onClick={() => setUploadOpen((v) => !v)}
              >
                {uploadOpen ? "업로드 닫기" : "악보 올리기"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={saveMeta}>
                저장
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-neutral-200 px-2"
                  disabled={pending || index === 0}
                  onClick={() => onMove("up")}
                  aria-label="위로"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-neutral-200 px-2"
                  disabled={pending || index >= total - 1}
                  onClick={() => onMove("down")}
                  aria-label="아래로"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50 lg:w-full"
                disabled={pending}
                onClick={onRemove}
              >
                <Trash2 className="mr-1.5 size-4" aria-hidden />
                제거
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
