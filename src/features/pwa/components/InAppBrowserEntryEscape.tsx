"use client";

import { useEffect, useRef } from "react";

import { detectInAppBrowser, openInExternalBrowser } from "@/features/pwa/lib/in-app-browser";

const KAKAO_ENTRY_ESCAPE_KEY = "worship-sync:kakao-entry-escape-attempted";

/**
 * 카카오톡 인앱 브라우저 진입 시 기본 브라우저 탈출을 1회 시도합니다.
 * 커스텀 URL 스킴은 사용자 제스처 없이 차단될 수 있어, 실패 시 배너/버튼 UI로 안내합니다.
 */
export function InAppBrowserEntryEscape() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const ua = navigator.userAgent || "";
    const inApp = detectInAppBrowser(ua);
    if (inApp.id !== "kakao") return;

    try {
      if (sessionStorage.getItem(KAKAO_ENTRY_ESCAPE_KEY) === "1") return;
      sessionStorage.setItem(KAKAO_ENTRY_ESCAPE_KEY, "1");
    } catch {
      /* ignore */
    }

    openInExternalBrowser();
  }, []);

  return null;
}
