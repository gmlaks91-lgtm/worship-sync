import type { ManifestTransform } from "workbox-build";

import { HEAVY_STATIC_ASSET_PATTERN } from "@/features/pwa/lib/pwa-workbox-runtime-caching";

/** 빌드 매니페스트에서 무거운 에셋을 프리캐시 목록에서 제거 */
export const stripHeavyAssetsFromPrecache: ManifestTransform = async (manifestEntries) => {
  const manifest = manifestEntries.filter(({ url }) => !HEAVY_STATIC_ASSET_PATTERN.test(url));
  return { manifest, warnings: [] };
};
