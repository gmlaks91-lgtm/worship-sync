"use client";

import { useTransition } from "react";
import { BellRing, Sparkles } from "lucide-react";

import {
  dismissPushPrompt,
  isPushSupported,
  subscribeToPushNotifications,
} from "@/features/push/lib/client-push";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PushNotificationPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vapidPublicKey: string;
};

export function PushNotificationPrompt({
  open,
  onOpenChange,
  vapidPublicKey,
}: PushNotificationPromptProps) {
  const [pending, start] = useTransition();

  const handleAllow = () => {
    start(async () => {
      try {
        await subscribeToPushNotifications(vapidPublicKey);
        toastSuccess("알림을 켰어요. 공지가 오면 바로 알려드릴게요.");
        onOpenChange(false);
      } catch (e) {
        toastError(e instanceof Error ? e.message : "알림 설정에 실패했습니다.");
      }
    });
  };

  const handleLater = () => {
    dismissPushPrompt();
    onOpenChange(false);
  };

  if (!isPushSupported()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-md"
      >
        <PastelPromptCard>
          <DialogHeader className="items-center space-y-3 text-center">
            <div className="relative">
              <span
                className="absolute -inset-3 rounded-full bg-sky-200/50 blur-xl"
                aria-hidden
              />
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-md shadow-sky-200/80">
                <BellRing className="h-7 w-7" />
              </div>
            </div>
            <DialogTitle className="text-lg font-semibold text-slate-800">
              공지 알림을 받아볼까요?
            </DialogTitle>
            <DialogDescription className="max-w-xs text-sm leading-relaxed text-slate-600">
              청년부 공지가 올라오면 휴대폰·브라우저로 바로 알려드려요. 언제든 설정에서 끌 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-2 space-y-2 text-left text-sm text-slate-600">
            <li className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>중요한 공지를 놓치지 않아요</span>
            </li>
            <li className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>PWA로 설치한 앱에서도 동일하게 받아요</span>
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={handleAllow} disabled={pending}>
              {pending ? "설정 중…" : "알림 받기"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white/80 bg-white/60"
              onClick={handleLater}
              disabled={pending}
            >
              나중에
            </Button>
          </div>
        </PastelPromptCard>
      </DialogContent>
    </Dialog>
  );
}

function PastelPromptCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-sky-50 via-white to-rose-50 p-6 shadow-[0_20px_50px_-12px_rgba(56,189,248,0.25)]">
      <span
        className="pointer-events-none absolute right-6 top-5 h-16 w-16 rounded-full bg-sky-200/40 blur-2xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-8 left-5 h-12 w-12 rounded-full bg-rose-200/35 blur-2xl"
        aria-hidden
      />
      {children}
    </div>
  );
}
