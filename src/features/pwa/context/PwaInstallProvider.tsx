"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  type BeforeInstallPromptEvent,
  isAndroidUserAgent,
  isIosUserAgent,
  isMobileUserAgent,
  isStandaloneDisplayMode,
} from "@/features/pwa/lib/install-prompt";
import {
  detectInAppBrowser,
  openInExternalBrowser as openInExternalBrowserUtil,
  type InAppBrowserInfo,
} from "@/features/pwa/lib/in-app-browser";

export type PwaPlatform = "android" | "ios" | "other";
export type PwaPromptState = "idle" | "prompting" | "accepted" | "dismissed";

type PwaInstallContextValue = {
  platform: PwaPlatform;
  isStandalone: boolean;
  isMobile: boolean;
  inAppBrowser: InAppBrowserInfo;
  isInAppBrowser: boolean;
  canShowInstallUi: boolean;
  canPromptAndroid: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
  openInExternalBrowser: () => void;
  promptState: PwaPromptState;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>("other");
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState<InAppBrowserInfo>({
    isInApp: false,
    id: null,
    displayName: "",
  });
  const [promptState, setPromptState] = useState<PwaPromptState>("idle");

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || "";
    const ios = isIosUserAgent(ua) && !("MSStream" in window);
    setPlatform(ios ? "ios" : isAndroidUserAgent(ua) ? "android" : "other");
    setIsMobile(isMobileUserAgent(ua));
    setIsStandalone(isStandaloneDisplayMode());
    setInAppBrowser(detectInAppBrowser(ua));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setHasDeferredPrompt(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setHasDeferredPrompt(false);
      setPromptState("accepted");
    };

    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setIsStandalone(isStandaloneDisplayMode());

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    media.addEventListener("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      media.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | null> => {
    const deferredPrompt = deferredPromptRef.current;
    if (!deferredPrompt) {
      return null;
    }

    setPromptState("prompting");

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      deferredPromptRef.current = null;
      setHasDeferredPrompt(false);
      setPromptState(choice.outcome === "accepted" ? "accepted" : "idle");

      return choice.outcome;
    } catch {
      setPromptState("idle");
      return null;
    }
  }, []);

  const isInAppBrowser = inAppBrowser.isInApp;
  const canShowInstallUi = !isStandalone && isMobile && (platform === "ios" || platform === "android");
  const canPromptAndroid = platform === "android" && hasDeferredPrompt && !isInAppBrowser;

  const openInExternalBrowser = useCallback(() => {
    openInExternalBrowserUtil();
  }, []);

  return (
    <PwaInstallContext.Provider
      value={{
        platform,
        isStandalone,
        isMobile,
        inAppBrowser,
        isInAppBrowser,
        canShowInstallUi,
        canPromptAndroid,
        promptInstall,
        openInExternalBrowser,
        promptState,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstallContext() {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return context;
}
