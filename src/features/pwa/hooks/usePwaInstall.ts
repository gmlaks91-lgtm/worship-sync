"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type BeforeInstallPromptEvent,
  isAndroidUserAgent,
  isIosUserAgent,
  isMobileUserAgent,
  isStandaloneDisplayMode,
} from "@/features/pwa/lib/install-prompt";

export type PwaPlatform = "android" | "ios" | "other";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<PwaPlatform>("other");
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [promptState, setPromptState] = useState<"idle" | "prompting" | "accepted" | "dismissed">("idle");

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || "";
    const ios = isIosUserAgent(ua) && !("MSStream" in window);
    setPlatform(ios ? "ios" : isAndroidUserAgent(ua) ? "android" : "other");
    setIsMobile(isMobileUserAgent(ua));
    setIsStandalone(isStandaloneDisplayMode());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setIsStandalone(isStandaloneDisplayMode());

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    media.addEventListener("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      media.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const canShowInstallUi = !isStandalone && isMobile && (platform === "ios" || platform === "android");

  const canPromptAndroid = platform === "android" && deferredPrompt !== null;

  const promptInstall = useCallback(async () => {
    if (platform === "android" && deferredPrompt) {
      setPromptState("prompting");
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setPromptState(choice.outcome === "accepted" ? "accepted" : "dismissed");
      setDeferredPrompt(null);
      return choice.outcome;
    }
    return null;
  }, [deferredPrompt, platform]);

  return {
    platform,
    isStandalone,
    isMobile,
    canShowInstallUi,
    canPromptAndroid,
    promptInstall,
    promptState,
    deferredPrompt,
  };
}
