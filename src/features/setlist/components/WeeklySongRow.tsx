"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Play, Trash2 } from "lucide-react";

import type { SetlistSongRow } from "@/features/setlist/queries/getSetlists";
import { useSetlistStore } from "@/features/setlist/store/useSetlistStore";
import { getYoutubeThumbnailUrl, getYoutubeVideoId } from "@/features/setlist/utils/youtube";
import { SheetMusicViewButton } from "@/features/songs/components/SheetMusicViewButton";
import {
  movePrepSetlistSong,
  removeTrackFromPrepSetlist,
  updateSongInPrepSetlist,
} from "@/features/setlist/actions/weeklySetlistActions";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WeeklySongRowProps = {
  setlistId: string;
  song: SetlistSongRow;
  index: number;
  total: number;
  canManage: boolean;
};

export function WeeklySongRow({ setlistId, song, index, total, canManage }: WeeklySongRowProps) {
  const router = useRouter();
  const playSong = useSetlistStore((s) => s.playSong);
  const currentId = useSetlistStore((s) => s.current?.songId);
  const [pending, start] = useTransition();

  const [title, setTitle] = useState(song.title);
  const [youtubeUrl, setYoutubeUrl] = useState(song.youtube_url ?? "");
  const [sheetMusicUrl, setSheetMusicUrl] = useState(song.sheet_music_url ?? "");

  const videoId = getYoutubeVideoId(song.youtube_url);
  const thumb = videoId ? getYoutubeThumbnailUrl(videoId) : null;
  const isPlaying = currentId === song.id;

  const saveMeta = () => {
    start(async () => {
      const res = await updateSongInPrepSetlist({
        setlistId,
        songId: song.id,
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        sheetMusicUrl: sheetMusicUrl.trim() || null,
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

  return (
    <li
      className={`rounded-2xl border border-gray-100 bg-white px-4 py-4 sm:px-5 sm:py-5 ${
        isPlaying ? "ring-2 ring-neutral-900/10" : ""
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:h-[88px] lg:w-[140px] lg:aspect-auto">
          {thumb ? (
            <Image src={thumb} alt="" fill className="object-cover" sizes="140px" />
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-gray-400 lg:min-h-0">
              미리보기 없음
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-gray-600">
              {index + 1}
            </span>
            {canManage ? (
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 border-gray-100 bg-white text-gray-800"
                  placeholder="곡 제목"
                />
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="h-10 border-gray-100 bg-white text-gray-800"
                  placeholder="YouTube URL"
                />
                <Input
                  value={sheetMusicUrl}
                  onChange={(e) => setSheetMusicUrl(e.target.value)}
                  className="h-10 border-gray-100 bg-white text-gray-800 sm:col-span-2"
                  placeholder="악보 URL (PNG, JPG, PDF)"
                />
              </div>
            ) : (
              <div>
                <p className="text-base font-semibold text-gray-800">{song.title}</p>
                <p className="truncate text-xs text-gray-500">{song.youtube_url ?? ""}</p>
              </div>
            )}
          </div>

          {!canManage ? (
            <SheetMusicViewButton
              title={song.title}
              sheetMusicUrl={song.sheet_music_url}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:w-48 lg:flex-col">
          <SheetMusicViewButton
            title={title.trim() || song.title}
            sheetMusicUrl={sheetMusicUrl.trim() || song.sheet_music_url}
          />
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-sky-500 text-white hover:bg-sky-600 lg:flex-none"
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
          {canManage ? (
            <>
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={saveMeta}>
                저장
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-100 px-2"
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
                  className="flex-1 border-gray-100 px-2"
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
