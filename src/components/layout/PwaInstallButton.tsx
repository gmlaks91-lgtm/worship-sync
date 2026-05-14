"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const isIosUserAgent = (userAgent: string) => /iphone|ipad|ipod/i.test(userAgent);
const isAndroidUserAgent = (userAgent: string) => /android/i.test(userAgent);

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosDialog, setShowIosDialog] = useState(false);
  const [promptState, setPromptState] = useState<"idle" | "prompting" | "accepted" | "dismissed">("idle");

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || "";
    const isIos = isIosUserAgent(ua) && !("MSStream" in window);
    setPlatform(isIos ? "ios" : isAndroidUserAgent(ua) ? "android" : "other");

    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true,
    );

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault?.();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
  }, []);

  const isInstallable =
    !isStandalone &&
    (platform === "ios" || (platform === "android" && deferredPrompt !== null));
  if (!isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    if (platform === "android" && deferredPrompt) {
      setPromptState("prompting");
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setPromptState(choice.outcome === "accepted" ? "accepted" : "dismissed");
      setDeferredPrompt(null);
      return;
    }

    if (platform === "ios") {
      setShowIosDialog(true);
    }
  };

  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstallClick}
      disabled={platform === "android" && promptState === "prompting"}
    >
      <Smartphone className="mr-2 h-4 w-4" />
      앱 설치하기
    </Button>
  );

  if (platform === "ios") {
    return (
      <Dialog open={showIosDialog} onOpenChange={setShowIosDialog}>
        <DialogTrigger asChild>{button}</DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>iOS 홈 화면에 추가</DialogTitle>
            <DialogDescription>
              Safari에서 Worship Sync를 설치하려면 아래 단계를 따라주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 rounded-3xl border border-border/70 bg-background p-4 text-sm text-foreground">
            <div className="flex items-start gap-3">
              <Share2 className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="font-medium">1. Safari 메뉴 열기</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  화면 하단의 공유 버튼(⍐)을 누릅니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Download className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="font-medium">2. 홈 화면에 추가</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  메뉴에서 [홈 화면에 추가]를 선택합니다.
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-100 p-3 text-sm text-slate-700">
              설치 후 Worship Sync를 단독 앱처럼 사용할 수 있습니다.
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={() => setShowIosDialog(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return button;
}
