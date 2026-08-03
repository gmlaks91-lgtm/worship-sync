"use client";

import { useEffect, useState } from "react";
import { Bell, Download, ExternalLink, Share2, Smartphone, X } from "lucide-react";

import { InAppBrowserEscapeActions } from "@/features/pwa/components/InAppBrowserEscapeActions";
import { usePwaInstall } from "@/features/pwa/hooks/usePwaInstall";
import { getDefaultBrowserName } from "@/features/pwa/lib/in-app-browser";
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
  const {
    platform,
    canShowInstallUi,
    canPromptAndroid,
    isInAppBrowser,
    inAppBrowser,
    promptInstall,
    openInExternalBrowser,
    promptState,
  } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    if (!canShowInstallUi) return;
    if (readBannerDismissed()) return;
    const delay = isInAppBrowser ? 0 : 800;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [canShowInstallUi, isInAppBrowser]);

  const dismiss = () => {
    persistBannerDismissed();
    setVisible(false);
    setIosGuideOpen(false);
  };

  const onInstallClick = async () => {
    if (isInAppBrowser) {
      openInExternalBrowser();
      return;
    }
    if (platform === "ios") {
      setIosGuideOpen(true);
      return;
    }
    if (canPromptAndroid) {
      const outcome = await promptInstall();
      if (outcome === "accepted") dismiss();
    }
  };

  const browserName = getDefaultBrowserName(platform);

  const banner = visible && canShowInstallUi ? (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
      )}
    >
      <div
        className={cn(
          "transform-gpu pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-sky-200/70 shadow-lg shadow-sky-200/30",
          "bg-gradient-to-br from-sky-50 via-cyan-50/90 to-amber-50/70",
        )}
        role="dialog"
        aria-label={isInAppBrowser ? "기본 브라우저 설치 안내" : "앱 설치 안내"}
      >
        <div className="relative p-4 sm:p-5">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
          <div className="flex gap-3 pr-8">
            <InstallBannerIcon>
              {isInAppBrowser ? (
                <ExternalLink className="size-5 text-sky-600" aria-hidden />
              ) : (
                <Smartphone className="size-5 text-sky-600" aria-hidden />
              )}
            </InstallBannerIcon>
            <div className="min-w-0 space-y-1">
              {isInAppBrowser ? (
                <>
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    기본 브라우저로 열어서
                    <br />
                    <span className="text-sky-700">Ahava</span>를 설치해 주세요
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {inAppBrowser.displayName} 앱 안에서는 PWA 설치가 되지 않아요. {browserName}에서
                    다시 열면 홈 화면에 추가할 수 있어요.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    Ahava를 홈 화면에 추가하고
                    <br />
                    <span className="text-sky-700">실시간 알림</span>을 받으세요!
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    앱처럼 빠르게 열고, 연습·예배 일정과 악보를 놓치지 마세요.
                  </p>
                </>
              )}
            </div>
          </div>
          {isInAppBrowser ? (
            <InAppBrowserEscapeActions
              className="mt-4"
              platform={platform}
              inAppDisplayName={inAppBrowser.displayName}
              onOpenExternal={openInExternalBrowser}
              onDismiss={dismiss}
              actionsOnly
            />
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-sky-600 text-white shadow-sm hover:bg-sky-700 disabled:opacity-70"
                onClick={onInstallClick}
                disabled={platform === "android" && (!canPromptAndroid || promptState === "prompting")}
              >
                <Download className="size-4" />
                {platform === "ios"
                  ? "설치 방법 보기"
                  : promptState === "prompting"
                    ? "설치 중…"
                    : "홈 화면에 추가"}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={dismiss}>
                나중에
              </Button>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Bell className="size-3.5 text-sky-500" aria-hidden />
                푸시 알림 지원
              </span>
            </div>
          )}
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
    <DialogContent className="max-w-md border-sky-100 bg-gradient-to-b from-sky-50/80 to-white">
      <DialogHeader>
        <DialogTitle>iOS 홈 화면에 추가</DialogTitle>
        <DialogDescription>Safari에서 Ahava를 설치하려면 아래 단계를 따라주세요.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 rounded-2xl border border-sky-100/80 bg-white/80 p-4 text-sm">
        <div className="flex items-start gap-3">
          <Share2 className="h-6 w-6 shrink-0 text-sky-600" />
          <div>
            <p className="font-medium text-foreground">1. Safari 공유 메뉴</p>
            <p className="mt-1 text-muted-foreground">화면 하단의 공유 버튼을 누릅니다.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Download className="h-6 w-6 shrink-0 text-sky-600" />
          <div>
            <p className="font-medium text-foreground">2. 홈 화면에 추가</p>
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

