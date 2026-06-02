"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";

import { createQtShare } from "@/features/qt-share/actions/qtShareActions";
import type { QtShareRow } from "@/features/qt-share/queries/getQtShares";
import { LayeredProfileAvatar } from "@/components/profile/layered-profile-avatar";
import { RemoteImage } from "@/components/ui/remote-image";
import { toastError } from "@/lib/app-toast";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type QtShareRoomProps = {
  initialShares: QtShareRow[];
  currentUserId: string;
  loadError: string | null;
};

function formatChatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function mapDbRow(row: Record<string, unknown>): QtShareRow {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    authorName: String(row.author_name ?? "팀원"),
    authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : null,
    message: String(row.message ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : null,
    createdAt: String(row.created_at),
  };
}

export function QtShareRoom({ initialShares, currentUserId, loadError }: QtShareRoomProps) {
  const [shares, setShares] = useState(initialShares);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("qt_shares_room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qt_shares" },
        (payload) => {
          const row = mapDbRow(payload.new as Record<string, unknown>);
          setShares((current) => {
            if (current.some((item) => item.id === row.id)) return current;
            return [...current, row];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [shares.length, scrollToBottom]);

  const sortedShares = useMemo(
    () => [...shares].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [shares],
  );

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("이미지 파일만 첨부할 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastError("이미지는 10MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed && !imageFile) {
      toastError("나눔 글이나 QT 이미지를 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("message", trimmed);
      if (imageFile) fd.set("image", imageFile);

      const result = await createQtShare(fd);
      if (!result.ok) {
        toastError(result.message);
        return;
      }

      setShares((current) => {
        if (current.some((item) => item.id === result.share.id)) return current;
        return [...current, result.share];
      });
      setMessage("");
      clearImage();
      scrollToBottom();
    });
  };

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col bg-[#abc1d1]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#abc1d1]/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-center text-base font-semibold text-slate-800">QT 나눔방</h1>
        <p className="mt-0.5 text-center text-xs text-slate-600">오늘의 QT를 사진과 함께 나눠 보세요</p>
      </header>

      {loadError ? (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          일부 메시지를 불러오지 못했습니다: {loadError}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-4 pb-2"
        aria-label="QT 나눔 메시지"
      >
        {sortedShares.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-600">
            아직 나눔이 없습니다.
            <br />
            첫 QT를 올려 보세요!
          </p>
        ) : (
          sortedShares.map((share) => {
            const isMine = share.userId === currentUserId;
            return (
              <div
                key={share.id}
                className={cn("flex w-full", isMine ? "justify-end" : "justify-start gap-2")}
              >
                {!isMine ? (
                  <div className="mt-1 shrink-0">
                    <LayeredProfileAvatar
                      size="sm"
                      avatarUrl={share.authorAvatarUrl}
                      fallbackLabel={share.authorName}
                    />
                  </div>
                ) : null}

                <div className={cn("flex max-w-[min(85%,20rem)] flex-col", isMine ? "items-end" : "items-start")}>
                  {!isMine ? (
                    <span className="mb-1 px-1 text-xs font-medium text-slate-700">{share.authorName}</span>
                  ) : null}

                  <div
                    className={cn(
                      "overflow-hidden rounded-2xl shadow-sm",
                      isMine
                        ? "rounded-tr-md bg-[#fee500] text-slate-900"
                        : "rounded-tl-md border border-white/60 bg-white text-slate-800",
                    )}
                  >
                    {share.imageUrl ? (
                      <div className="relative aspect-[4/3] w-full min-w-[12rem] max-w-full bg-slate-100">
                        <RemoteImage
                          src={share.imageUrl}
                          alt="QT 이미지"
                          fill
                          variant="card"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    {share.message ? (
                      <p className="whitespace-pre-wrap break-words px-3 py-2.5 text-[15px] leading-relaxed">
                        {share.message}
                      </p>
                    ) : null}
                  </div>

                  <span className="mt-1 px-1 text-[11px] text-slate-500">{formatChatTime(share.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-1 shrink-0" aria-hidden />
      </div>

      <div className="sticky bottom-0 z-30 border-t border-black/5 bg-[#f0f0f0] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {imagePreview ? (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-white p-2 shadow-sm">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="첨부 미리보기" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              className="ml-auto flex min-h-9 min-w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600"
              onClick={clearImage}
              aria-label="첨부 이미지 제거"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => onPickImage(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm active:bg-slate-100"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            aria-label="이미지 첨부"
          >
            <ImagePlus className="size-5" />
          </button>

          <label className="sr-only" htmlFor="qt-message-input">
            QT 나눔 입력
          </label>
          <textarea
            id="qt-message-input"
            rows={1}
            value={message}
            disabled={pending}
            placeholder="나눔 글을 입력하세요"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[15px] leading-snug outline-none focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-100"
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
          />

          <button
            type="button"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-[#fee500] text-slate-900 shadow-sm active:brightness-95 disabled:opacity-50"
            disabled={pending}
            onClick={onSubmit}
            aria-label="전송"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
