export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export const PWA_BANNER_DISMISS_KEY = "worship-sync:pwa-install-banner-dismissed";

export function isIosUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function isAndroidUserAgent(userAgent: string) {
  return /android/i.test(userAgent);
}

export function isMobileUserAgent(userAgent: string) {
  return isIosUserAgent(userAgent) || isAndroidUserAgent(userAgent) || /mobile/i.test(userAgent);
}

export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function readBannerDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(PWA_BANNER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistBannerDismissed() {
  try {
    localStorage.setItem(PWA_BANNER_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}
