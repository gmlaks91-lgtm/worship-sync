import type { RuntimeCaching } from "workbox-build";

/** 프리캐시에서 제외할 무거운 정적 확장자 */
/** 폰트는 별도 NetworkFirst 규칙으로 처리 */
export const HEAVY_STATIC_ASSET_PATTERN =
  /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp|mp3|wav|ogg|m4a|aac|mp4|webm|ogv)$/i;

export const PWA_PRECACHE_MAX_BYTES = 2 * 1024 * 1024;

export const PWA_PUBLIC_EXCLUDES = [
  "!noprecache/**/*",
  "!manifest.json",
  "!icons/**",
  "!**/*.png",
  "!**/*.jpg",
  "!**/*.jpeg",
  "!**/*.gif",
  "!**/*.webp",
  "!**/*.svg",
  "!**/*.ico",
  "!**/*.mp3",
  "!**/*.wav",
  "!**/*.ogg",
  "!**/*.m4a",
  "!**/*.mp4",
  "!**/*.webm",
  "!**/*.woff",
  "!**/*.woff2",
  "!**/*.ttf",
  "!**/*.otf",
] as const;

export const PWA_WORKBOX_EXCLUDE: Array<string | RegExp> = [
  /\.map$/,
  /^manifest.*\.js$/,
  HEAVY_STATIC_ASSET_PATTERN,
  /\/_next\/static\/media\//,
  /\/_next\/image/,
];

const month = 30 * 24 * 60 * 60;

/** 이미지·미디어·폰트는 설치 시 프리캐시 대신 런타임 캐시만 사용 */
export const heavyAssetRuntimeCaching: RuntimeCaching[] = [
  {
    urlPattern: HEAVY_STATIC_ASSET_PATTERN,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "heavy-static-assets",
      expiration: {
        maxEntries: 48,
        maxAgeSeconds: month,
      },
    },
  },
  {
    urlPattern: /\.(?:woff2?|ttf|otf|eot)$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "font-assets",
      networkTimeoutSeconds: 3,
      expiration: {
        maxEntries: 12,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:mp3|wav|ogg|m4a|aac)$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "audio-assets",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: month,
      },
    },
  },
  {
    urlPattern: /\.(?:mp4|webm|ogv)$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "video-assets",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 8,
        maxAgeSeconds: month,
      },
    },
  },
  {
    urlPattern: /\/_next\/image\?/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "next-image",
      expiration: {
        maxEntries: 48,
        maxAgeSeconds: month,
      },
    },
  },
  {
    urlPattern: ({ url }) =>
      url.pathname.includes("/storage/v1/object/") &&
      (url.hostname.endsWith(".supabase.co") || url.hostname.includes("supabase")),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "supabase-storage",
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: month,
      },
    },
  },
];
