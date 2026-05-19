import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import { stripHeavyAssetsFromPrecache } from "./src/features/pwa/lib/pwa-precache-manifest-transform";
import {
  heavyAssetRuntimeCaching,
  PWA_PRECACHE_MAX_BYTES,
  PWA_PUBLIC_EXCLUDES,
  PWA_WORKBOX_EXCLUDE,
} from "./src/features/pwa/lib/pwa-workbox-runtime-caching";

function supabaseImageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHost();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  // dev는 Turbopack, production build는 package.json에서 --webpack (PWA 플러그인 필요)
  turbopack: {},
};

/** @ducanh2912/next-pwa는 webpack 빌드에서만 service worker를 생성합니다. */
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  /** 설치 시 HTML만 가볍게 — 동적 시작 URL은 NetworkFirst로 처리 */
  cacheStartUrl: false,
  dynamicStartUrl: true,
  extendDefaultRuntimeCaching: true,
  publicExcludes: [...PWA_PUBLIC_EXCLUDES],
  customWorkerSrc: "worker",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    /** 2MB 초과 파일은 프리캐시에서 제외 (안드로이드 설치 병목 완화) */
    maximumFileSizeToCacheInBytes: PWA_PRECACHE_MAX_BYTES,
    exclude: PWA_WORKBOX_EXCLUDE,
    manifestTransforms: [stripHeavyAssetsFromPrecache],
    runtimeCaching: heavyAssetRuntimeCaching,
  },
});

export default withSentryConfig(withPWA(nextConfig), {
  silent: !process.env.CI,
});
