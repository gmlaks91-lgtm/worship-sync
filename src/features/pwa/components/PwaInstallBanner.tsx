"use client";

import { useEffect, useState } from "react";
import { Bell, Download, Share2, Smartphone, X } from "lucide-react";

import { usePwaInstall } from "@/features/pwa/hooks/usePwaInstall";
import { persistBannerDismissed, readBannerDismissed } from "@/features/pwa/lib/install-prompt";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PwaInstallBanner() {
  const { platform, canShowInstallUi, canPromptAndroid, promptInstall, promptState } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    if (!canShowInstallUi) return;
    if (readBannerDismissed()) return;
    const timer = window.setTimeout(() => setVisible(true), 800);
    return () => window.clearTimeout(timer);
  }, [canShowInstallUi]);

  const dismiss = () => {
    persistBannerDismissed();
    setVisible(false);
    setIosGuideOpen(false);
  };

  const onInstallClick = async () => {
    if (platform === "ios") {
      setIosGuideOpen(true);
      return;
    }
    if (canPromptAndroid) {
      const outcome = await promptInstall();
      if (outcome === "accepted") dismiss();
    }
  };

  const banner = visible && canShowInstallUi ? (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
      )}
    >
      <div
        className={cn(
          "transform-gpu pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/80 shadow-lg shadow-violet-200/40",
          "bg-gradient-to-br from-sky-50 via-violet-50/95 to-rose-50",
        )}
        role="dialog"
        aria-label="앱 설치 안내"
      >
        <div className="relative p-4 sm:p-5">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-800"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
          <div className="flex gap-3 pr-8">
            <InstallBannerIcon>
              <Smartphone className="size-5 text-violet-600" aria-hidden />
            </InstallBannerIcon>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-snug text-slate-800">
                Worship Sync를 홈 화면에 추가하고
                <br />
                <span className="text-violet-700">실시간 알림</span>을 받으세요!
              </p>
              <p className="text-xs leading-relaxed text-slate-600">
                앱처럼 빠르게 열고, 연습·예배 일정과 악보를 놓치지 마세요.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-violet-600 text-white shadow-sm hover:bg-violet-700"
              onClick={onInstallClick}
              disabled={platform === "android" && (!canPromptAndroid || promptState === "prompting")}
            >
              <Download className="size-4" />
              {platform === "ios" ? "설치 방법 보기" : "홈 화면에 추가"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={dismiss}>
              나중에
            </Button>
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Bell className="size-3.5 text-rose-400" aria-hidden />
              푸시 알림 지원
            </span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {banner}
      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <IosInstallGuide onClose={() => setIosGuideOpen(false)} />
      </Dialog>
    </>
  );
}

function InstallBannerIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
      {children}
    </div>
  );
}

function IosInstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <DialogContent className="max-w-md border-violet-100 bg-gradient-to-b from-sky-50/80 to-white">
      <DialogHeader>
        <DialogTitle>iOS 홈 화면에 추가</DialogTitle>
        <DialogDescription>Safari에서 Worship Sync를 설치하려면 아래 단계를 따라주세요.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 rounded-2xl border border-violet-100/80 bg-white/80 p-4 text-sm">
        <div className="flex items-start gap-3">
          <Share2 className="h-6 w-6 shrink-0 text-violet-600" />
          <div>
            <p className="font-medium text-slate-800">1. Safari 공유 메뉴</p>
            <p className="mt-1 text-muted-foreground">화면 하단의 공유 버튼을 누릅니다.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Download className="h-6 w-6 shrink-0 text-sky-600" />
          <div>
            <p className="font-medium text-slate-800">2. 홈 화면에 추가</p>
            <p className="mt-1 text-muted-foreground">[홈 화면에 추가]를 선택한 뒤 추가를 누릅니다.</p>
          </div>
        </div>
      </div>
      <DialogFooter showCloseButton>
        <Button onClick={onClose}>확인</Button>
      </DialogFooter>
    </DialogContent>
  );
}



