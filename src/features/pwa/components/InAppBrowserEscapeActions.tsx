"use client";

import { ExternalLink } from "lucide-react";

import type { PwaPlatform } from "@/features/pwa/context/PwaInstallProvider";
import { getDefaultBrowserName } from "@/features/pwa/lib/in-app-browser";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InAppBrowserEscapeActionsProps = {
  platform: PwaPlatform;
  inAppDisplayName: string;
  onOpenExternal: () => void;
  onDismiss?: () => void;
  size?: "sm" | "default";
  className?: string;
  /** 배너 등에서 안내 문구를 이미 보여줄 때 버튼만 렌더 */
  actionsOnly?: boolean;
};

export function InAppBrowserEscapeActions({
  platform,
  inAppDisplayName,
  onOpenExternal,
  onDismiss,
  size = "sm",
  className,
  actionsOnly = false,
}: InAppBrowserEscapeActionsProps) {
  const browserName = getDefaultBrowserName(platform);

  return (
    <div className={cn(className)}>
      {!actionsOnly ? (
        <p className="text-xs leading-relaxed text-slate-600">
          <span className="font-medium text-slate-800">{inAppDisplayName}</span>에서는 앱 설치가 지원되지
          않아요.{" "}
          <span className="font-medium text-violet-800">
            기본 브라우저({browserName})로 열어서
          </span>{" "}
          앱을 설치해 주세요.
        </p>
      ) : null}
      <div className={cn("flex flex-wrap items-center gap-2", !actionsOnly && "mt-3")}>
        <Button
          type="button"
          size={size}
          className="gap-1.5 bg-violet-600 text-white shadow-sm hover:bg-violet-700"
          onClick={onOpenExternal}
        >
          <ExternalLink className="size-4" />
          {browserName}에서 열기
        </Button>
        {onDismiss ? (
          <Button type="button" variant="ghost" size={size} className="text-slate-600" onClick={onDismiss}>
            나중에
          </Button>
        ) : null}
      </div>
    </div>
  );
}
