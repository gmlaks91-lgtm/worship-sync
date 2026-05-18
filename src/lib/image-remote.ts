/** Next.js Image optimizer(remotePatterns)로 처리 가능한 호스트인지 판별 */
export function isNextImageOptimizable(src: string): boolean {
  try {
    const { hostname } = new URL(src);
    if (hostname === "img.youtube.com" || hostname === "i.ytimg.com") {
      return true;
    }
    if (hostname.endsWith(".supabase.co")) {
      return true;
    }
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (raw) {
      const expected = new URL(raw).hostname;
      if (hostname === expected) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
