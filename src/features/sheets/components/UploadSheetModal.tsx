"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

import { uploadSheetFromClient } from "@/features/sheets/lib/client-upload-sheet";
import { toastError, toastPromise } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMPTY_SONGS: Array<{ id: string; title: string }> = [];

export type UploadSheetModalProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      mode: "song";
      songId: string;
      songTitle: string;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      mode: "library";
      songs: Array<{ id: string; title: string }>;
    };

export function UploadSheetModal(props: UploadSheetModalProps) {
  const router = useRouter();
  const { open, onOpenChange, mode } = props;

  const [selectedSongId, setSelectedSongId] = useState("");
  const [songQuery, setSongQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  const songId = mode === "song" ? props.songId : selectedSongId;
  const songTitle =
    mode === "song"
      ? props.songTitle
      : props.songs.find((s) => s.id === selectedSongId)?.title ?? "";

  const librarySongList = mode === "library" ? props.songs : EMPTY_SONGS;
  const filteredSongs = useMemo(() => {
    const q = songQuery.trim().toLowerCase();
    if (!q) return librarySongList;
    return librarySongList.filter((s) => s.title.toLowerCase().includes(q));
  }, [librarySongList, songQuery]);

  const reset = useCallback(() => {
    setSelectedSongId("");
    setSongQuery("");
    setFiles([]);
    setMemo("");
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setFiles(accepted);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: 20,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    disabled: busy,
  });

  const fileLabel = useMemo(() => {
    if (files.length === 0) return "이미지 파일을 선택하세요";
    if (files.length === 1) return files[0].name;
    return `${files[0].name} 외 ${files.length - 1}장`;
  }, [files]);

  const onSubmit = async () => {
    if (!songId) {
      toastError("곡을 먼저 선택해 주세요.");
      return;
    }
    if (files.length === 0) {
      toastError("업로드할 이미지 파일을 선택해 주세요.");
      return;
    }

    setBusy(true);
    try {
      await toastPromise(
        uploadSheetFromClient(songId, files, memo),
        "악보를 업로드하는 중이에요…",
      ).unwrap();

      reset();
      onOpenChange(false);
      router.refresh();
    } catch {
      /* toastPromise가 처리 */
    } finally {
      setBusy(false);
    }
  };

  const canPickSong = mode === "library" && props.songs.length > 0;
  const noSongsInDb = mode === "library" && props.songs.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base">
              {mode === "library" ? "악보 추가" : "악보 등록"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {mode === "song" ? (
                <>
                  <span className="font-medium text-foreground">{props.songTitle}</span> 곡에 여러 장의
                  악보 이미지를 연결합니다.
                </>
              ) : (
                <>등록된 곡을 고른 뒤, 여러 장의 이미지 파일을 올려 주세요.</>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex max-h-[min(85vh,640px)] flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5">
          {mode === "library" ? (
            <FieldSet className="gap-2">
              <FieldLabel className="text-xs font-medium text-foreground">곡 선택</FieldLabel>
              {noSongsInDb ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                  아직 등록된 곡이 없습니다. 홈에서 콘티를 추가해 곡을 만든 뒤 다시 시도해 주세요.
                </p>
              ) : (
                <>
                  <Input
                    value={songQuery}
                    onChange={(e) => setSongQuery(e.target.value)}
                    disabled={busy}
                    placeholder="곡 이름 검색…"
                    className="h-9 text-sm"
                    aria-label="곡 검색"
                  />
                  <div
                    className="max-h-36 overflow-y-auto rounded-lg border border-border/60 bg-muted/10 p-2"
                    role="listbox"
                    aria-label="곡 목록"
                  >
                    {filteredSongs.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                        검색 결과가 없습니다.
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {filteredSongs.map((s) => {
                          const active = selectedSongId === s.id;
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setSelectedSongId(s.id)}
                                className={cn(
                                  "flex w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted/80",
                                )}
                              >
                                <span className="line-clamp-2 font-medium">{s.title}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {selectedSongId ? (
                    <p className="text-[11px] text-muted-foreground">
                      선택: <span className="font-medium text-foreground">{songTitle}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">목록에서 곡을 한 번 눌러 선택하세요.</p>
                  )}
                </>
              )}
            </FieldSet>
          ) : null}

          <FieldSet className="gap-3">
            <Field className="gap-2">
              <FieldLabel>파일</FieldLabel>
              <div
                {...getRootProps()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-5 py-10 text-center transition-[background,border-color]",
                  isDragActive && "border-primary/50 bg-primary/5",
                  busy && "pointer-events-none opacity-60",
                )}
              >
                <input {...getInputProps()} />
                <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  {isDragActive ? "여기에 놓으세요" : "드래그 앤 드롭 또는 클릭"}
                </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF · 최대 20장</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openFilePicker}
                  disabled={busy}
                >
                  파일 선택
                </Button>
                <span className="truncate text-xs text-muted-foreground">{fileLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">또는</span>
                <Input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={busy}
                  className="h-8 flex-1 text-xs file:mr-2 file:text-xs"
                  onChange={(e) => {
                    const next = Array.from(e.target.files ?? []);
                    if (next.length > 0) setFiles(next);
                  }}
                />
              </div>
            </Field>

            <Field className="gap-2">
              <FieldLabel htmlFor="sheet-memo">메모 (선택)</FieldLabel>
              <textarea
                id="sheet-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={busy}
                placeholder="예: 인트로 2마디 반복, 브릿지 템포 주의"
                className={cn(
                  "min-h-[88px] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <FieldDescription>뷰어 상단에 작게 표시됩니다.</FieldDescription>
            </Field>
          </FieldSet>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              onClick={onSubmit}
              disabled={
                busy ||
                files.length === 0 ||
                !songId ||
                (mode === "library" && !canPickSong)
              }
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  업로드 중…
                </>
              ) : (
                "업로드 및 저장"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UploadSheetTriggerButton({
  songId,
  songTitle,
  className,
}: {
  songId: string;
  songTitle: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={className}
        onClick={() => {
          setDialogKey((k) => k + 1);
          setOpen(true);
        }}
      >
        악보 등록
      </Button>
      <UploadSheetModal
        key={dialogKey}
        open={open}
        onOpenChange={setOpen}
        mode="song"
        songId={songId}
        songTitle={songTitle}
      />
    </>
  );
}
