"use client";

import { useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";

import { usePwaInstall } from "@/features/pwa/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PwaInstallButton() {
  const { platform, canShowInstallUi, canPromptAndroid, promptInstall, promptState } = usePwaInstall();
  const [showIosDialog, setShowIosDialog] = useState(false);

  if (!canShowInstallUi) {
    return null;
  }

  const handleInstallClick = async () => {
    if (platform === "android" && canPromptAndroid) {
      await promptInstall();
      return;
    }
    if (platform === "ios") {
      setShowIosDialog(true);
    }
  };

  if (platform === "ios") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setShowIosDialog(true)}>
          <Smartphone className="mr-2 h-4 w-4" />
          앱 설치하기
        </Button>
        <Dialog open={showIosDialog} onOpenChange={setShowIosDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>iOS 홈 화면에 추가</DialogTitle>
              <DialogDescription>
                Safari에서 Worship Sync를 설치하려면 아래 단계를 따라주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 rounded-3xl border border-border/70 bg-background p-4 text-sm">
              <div className="flex items-start gap-3">
                <Share2 className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">1. Safari 메뉴 열기</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    화면 하단의 공유 버튼을 누릅니다.
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
            </div>
            <DialogFooter showCloseButton>
              <Button onClick={() => setShowIosDialog(false)}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleInstallClick} disabled={promptState === "prompting"}>
      <Smartphone className="mr-2 h-4 w-4" />
      앱 설치하기
    </Button>
  );
}
