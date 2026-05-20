export type InAppBrowserId =
  | "kakao"
  | "instagram"
  | "naver"
  | "facebook"
  | "line"
  | "twitter"
  | "tiktok"
  | "daum"
  | "generic";

export type InAppBrowserInfo = {
  isInApp: boolean;
  id: InAppBrowserId | null;
  displayName: string;
};

const IN_APP_UA_RULES: ReadonlyArray<{ id: InAppBrowserId; displayName: string; pattern: RegExp }> = [
  { id: "kakao", displayName: "카카오톡", pattern: /KAKAOTALK/i },
  { id: "instagram", displayName: "인스타그램", pattern: /Instagram/i },
  { id: "naver", displayName: "네이버", pattern: /NAVER|NaverApp|NAVER\(inapp\)/i },
  { id: "facebook", displayName: "페이스북", pattern: /FBAN|FBAV|FB_IAB|MetaIAB/i },
  { id: "line", displayName: "라인", pattern: /\bLine\//i },
  { id: "twitter", displayName: "X(트위터)", pattern: /Twitter/i },
  { id: "tiktok", displayName: "틱톡", pattern: /musical_ly|BytedanceWebview|TikTok/i },
  { id: "daum", displayName: "다음", pattern: /DaumApps/i },
];

/** Android WebView 등 일반 인앱 브라우저 (위 앱에 해당하지 않을 때) */
const GENERIC_IN_APP_PATTERN = /\bwv\)|; wv\b|WebView/i;

export function detectInAppBrowser(userAgent: string): InAppBrowserInfo {
  const ua = userAgent.trim();
  if (!ua) {
    return { isInApp: false, id: null, displayName: "" };
  }

  for (const rule of IN_APP_UA_RULES) {
    if (rule.pattern.test(ua)) {
      return { isInApp: true, id: rule.id, displayName: rule.displayName };
    }
  }

  if (GENERIC_IN_APP_PATTERN.test(ua)) {
    return { isInApp: true, id: "generic", displayName: "앱 내 브라우저" };
  }

  return { isInApp: false, id: null, displayName: "" };
}

export function getDefaultBrowserName(platform: "android" | "ios" | "other") {
  if (platform === "ios") return "Safari";
  if (platform === "android") return "Chrome";
  return "기본 브라우저";
}

export function buildKakaoTalkExternalUrl(targetUrl: string) {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
}

export function openInExternalBrowser(targetUrl?: string) {
  if (typeof window === "undefined") return false;

  const url = targetUrl ?? window.location.href;
  const { id } = detectInAppBrowser(navigator.userAgent || "");

  if (id === "kakao") {
    window.location.href = buildKakaoTalkExternalUrl(url);
    return true;
  }

  if (/android/i.test(navigator.userAgent)) {
    try {
      const withoutProtocol = url.replace(/^https?:\/\//, "");
      window.location.href = `intent://${withoutProtocol}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`;
      return true;
    } catch {
      /* fall through */
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return true;

  window.location.assign(url);
  return true;
}
