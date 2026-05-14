export function normalizeSupabaseUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return rawUrl;
  }
}
